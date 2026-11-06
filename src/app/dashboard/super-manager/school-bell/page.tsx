'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
    ArrowPathIcon,
    BellAlertIcon,
    ClockIcon,
    PlusIcon,
    TrashIcon,
    WifiIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import apiService from '@/lib/apiService';

// --- Types (mirror GET /bell) ---
type ModuleState = {
    heureValide: boolean;
    heure: string;
    date: string;
    source: string;
    sonne: boolean;
    libelle: string;
    prochaine: string;
    activees: boolean;
    broche: number;
    actifBas: boolean;
    lcd: string;
    ip: string;
    rssi: number;
};
type Bell = { time: string; days: number[]; seconds: number; label: string };
type BellData = { moduleUrl: string; serverTime: string; state: ModuleState; bells: Bell[] };
type Res<T> = { success: boolean; data: T; error?: string };

const DAYS = [
    { n: 1, short: 'Mon' },
    { n: 2, short: 'Tue' },
    { n: 3, short: 'Wed' },
    { n: 4, short: 'Thu' },
    { n: 5, short: 'Fri' },
    { n: 6, short: 'Sat' },
    { n: 7, short: 'Sun' },
];
const WEEKDAYS = [1, 2, 3, 4, 5];
const MAX_BELLS = 40;
const STATUS_POLL_MS = 3000;
// While the button is held, a heartbeat every second keeps the bell ringing (each one rings 3 s on the module).
const HOLD_HEARTBEAT_MS = 1000;

const source = (s: string) => (s === 'internet' ? 'internet time' : s === 'manuelle' ? 'set by hand' : 'not set');
const signal = (rssi: number) => (rssi >= -60 ? 'good' : rssi >= -75 ? 'fair' : 'weak');
// The backend's own message (e.g. "cannot be reached from this server") when there is one.
const errorText = (e: unknown, fallback: string): string => {
    const err = e as { data?: { error?: string }; message?: string } | null;
    return err?.data?.error || err?.message || fallback;
};
const sameBells = (a: Bell[], b: Bell[]) => JSON.stringify(a) === JSON.stringify(b);

export default function SchoolBellPage() {
    const [data, setData] = useState<BellData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [bells, setBells] = useState<Bell[]>([]);
    const [savedBells, setSavedBells] = useState<Bell[]>([]);
    const [saving, setSaving] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    const [holding, setHolding] = useState(false);
    const [testSeconds, setTestSeconds] = useState(5);
    const heartbeat = useRef<ReturnType<typeof setInterval> | null>(null);
    const dirty = !sameBells(bells, savedBells);
    const dirtyRef = useRef(dirty);
    dirtyRef.current = dirty;

    const load = useCallback(async (silent = false) => {
        try {
            const res = await apiService.get<Res<BellData>>('/bell', { silent: true });
            setData(res.data);
            setError(null);
            // Never overwrite edits that are not saved yet.
            if (!dirtyRef.current) {
                setBells(res.data.bells);
                setSavedBells(res.data.bells);
            }
        } catch (e: unknown) {
            setError(errorText(e, 'The bell module cannot be reached.'));
            if (!silent) setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') load(true);
        }, STATUS_POLL_MS);
        return () => clearInterval(timer);
    }, [load]);

    // ---------- Hold to ring ----------
    const sendHold = useCallback(async () => {
        try {
            const res = await apiService.post<Res<ModuleState>, Record<string, never>>('/bell/hold', {}, { silent: true });
            setData((d) => (d ? { ...d, state: res.data } : d));
        } catch (e: unknown) {
            toast.error(errorText(e, 'The bell module did not answer'), { id: 'bell-hold' });
        }
    }, []);

    const startHold = useCallback(() => {
        if (heartbeat.current) return;
        setHolding(true);
        sendHold();
        heartbeat.current = setInterval(sendHold, HOLD_HEARTBEAT_MS);
    }, [sendHold]);

    const stopHold = useCallback(async () => {
        if (!heartbeat.current) return;
        clearInterval(heartbeat.current);
        heartbeat.current = null;
        setHolding(false);
        try {
            const res = await apiService.post<Res<ModuleState>, Record<string, never>>('/bell/stop', {}, { silent: true });
            setData((d) => (d ? { ...d, state: res.data } : d));
        } catch {
            // The module stops by itself within 3 s of the last heartbeat.
        }
    }, []);

    // Stop if the page is left or hidden while the button is held.
    useEffect(() => {
        const onHide = () => {
            if (document.visibilityState !== 'visible') stopHold();
        };
        document.addEventListener('visibilitychange', onHide);
        window.addEventListener('blur', stopHold);
        return () => {
            document.removeEventListener('visibilitychange', onHide);
            window.removeEventListener('blur', stopHold);
            if (heartbeat.current) {
                clearInterval(heartbeat.current);
                heartbeat.current = null;
                apiService.post('/bell/stop', {}, { silent: true }).catch(() => undefined);
            }
        };
    }, [stopHold]);

    // ---------- Other actions ----------
    const act = async (key: string, run: () => Promise<Res<ModuleState>>, ok: string) => {
        setBusy(key);
        try {
            const res = await run();
            setData((d) => (d ? { ...d, state: res.data } : d));
            toast.success(ok);
        } catch {
            // apiService already showed the error
        } finally {
            setBusy(null);
        }
    };

    const setConfig = (body: { enabled?: boolean; pin?: number; activeLow?: boolean }, ok: string) =>
        act('config', () => apiService.put<Res<ModuleState>>('/bell/config', body), ok);

    const saveSchedule = async () => {
        const problem = bells.findIndex((b) => !/^\d{2}:\d{2}$/.test(b.time) || b.days.length === 0);
        if (problem >= 0) {
            toast.error(`Bell ${problem + 1}: set a time and at least one day`);
            return;
        }
        setSaving(true);
        try {
            await apiService.put<Res<{ saved: number }>>('/bell/schedule', { bells });
            const sorted = [...bells].sort((a, b) => a.time.localeCompare(b.time));
            setBells(sorted);
            setSavedBells(sorted);
            toast.success('Bell times saved on the module');
            load(true);
        } catch {
            // apiService already showed the error
        } finally {
            setSaving(false);
        }
    };

    const update = (i: number, patch: Partial<Bell>) => setBells((list) => list.map((b, j) => (j === i ? { ...b, ...patch } : b)));
    const toggleDay = (i: number, day: number) =>
        setBells((list) =>
            list.map((b, j) =>
                j === i ? { ...b, days: b.days.includes(day) ? b.days.filter((d) => d !== day) : [...b.days, day].sort() } : b,
            ),
        );
    const addBell = () => setBells((list) => [...list, { time: '07:00', days: [...WEEKDAYS], seconds: 5, label: '' }]);
    const removeBell = (i: number) => setBells((list) => list.filter((_, j) => j !== i));

    const s = data?.state;
    const offline = !data && !loading;

    return (
        <div className="max-w-5xl mx-auto space-y-5 p-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">School Bell</h1>
                    <p className="text-sm text-gray-600 mt-0.5">Bell times, settings and a button to ring the bell now.</p>
                </div>
                <button
                    onClick={() => load()}
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    <ArrowPathIcon className="h-4 w-4" /> Refresh
                </button>
            </div>

            {error && (
                <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                    <div>
                        <p className="font-medium">The bell module is not reachable</p>
                        <p className="mt-1">{error}</p>
                    </div>
                </div>
            )}

            {loading && !data && <p className="text-sm text-gray-500">Contacting the bell module…</p>}

            {/* Ring now */}
            <section className="rounded-lg border border-gray-200 bg-white p-5">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-8">
                    <button
                        type="button"
                        disabled={offline}
                        onPointerDown={(e) => {
                            if (e.button !== 0) return;
                            e.currentTarget.setPointerCapture(e.pointerId);
                            startHold();
                        }}
                        onPointerUp={stopHold}
                        onPointerCancel={stopHold}
                        onLostPointerCapture={stopHold}
                        onKeyDown={(e) => {
                            if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
                                e.preventDefault();
                                startHold();
                            }
                        }}
                        onKeyUp={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') stopHold();
                        }}
                        onBlur={stopHold}
                        onContextMenu={(e) => e.preventDefault()}
                        style={{ touchAction: 'none', WebkitTouchCallout: 'none' }}
                        className={`flex h-40 w-40 flex-shrink-0 select-none flex-col items-center justify-center rounded-full text-white shadow-lg transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:bg-gray-300 ${
                            holding ? 'scale-95 bg-red-700' : 'bg-red-600 hover:bg-red-500'
                        }`}
                    >
                        <BellAlertIcon className={`h-12 w-12 ${holding ? 'animate-pulse' : ''}`} />
                        <span className="mt-2 text-base font-semibold">{holding ? 'Ringing…' : 'Hold to ring'}</span>
                    </button>
                    <div className="space-y-2 text-sm text-gray-700">
                        <p>
                            <span className="font-medium">Press and hold</span> the button: the bell rings while you hold it and stops when you let go.
                        </p>
                        <p className="text-gray-500">If the connection drops while you hold it, the bell stops on its own within 3 seconds.</p>
                        {s && (
                            <p className={s.sonne ? 'font-medium text-red-700' : 'text-gray-500'}>
                                {s.sonne ? `The bell is ringing${s.libelle ? ` (${s.libelle})` : ''}` : 'The bell is quiet.'}
                            </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-gray-600">Or ring once for</span>
                            <select
                                value={testSeconds}
                                onChange={(e) => setTestSeconds(Number(e.target.value))}
                                className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                            >
                                {[3, 5, 10, 15, 30].map((n) => (
                                    <option key={n} value={n}>
                                        {n} s
                                    </option>
                                ))}
                            </select>
                            <button
                                disabled={offline || busy !== null}
                                onClick={() => act('ring', () => apiService.post<Res<ModuleState>>('/bell/ring', { seconds: testSeconds }), 'Bell ringing')}
                                className="rounded-md bg-gray-800 px-3 py-1.5 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
                            >
                                Ring
                            </button>
                            <button
                                disabled={offline || busy !== null}
                                onClick={() => act('stop', () => apiService.post<Res<ModuleState>>('/bell/stop', {}), 'Bell stopped')}
                                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Stop
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {s && (
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Status and clock */}
                    <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-5 text-sm">
                        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                            <ClockIcon className="h-5 w-5 text-gray-500" /> Clock and status
                        </h2>
                        {!s.heureValide && (
                            <p className="rounded-md bg-red-50 p-2 text-red-800">
                                The module&apos;s clock is not set, so no scheduled bell will ring. Set it below.
                            </p>
                        )}
                        <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5">
                            <dt className="text-gray-500">Module time</dt>
                            <dd className="font-medium text-gray-900">
                                {s.heure} {s.date && <span className="font-normal text-gray-600">· {s.date}</span>}
                            </dd>
                            <dt className="text-gray-500">Clock source</dt>
                            <dd>{source(s.source)}</dd>
                            <dt className="text-gray-500">Next bell</dt>
                            <dd>{s.activees ? s.prochaine || 'none' : 'scheduled bells are off'}</dd>
                            <dt className="text-gray-500">Network</dt>
                            <dd className="flex items-center gap-1">
                                <WifiIcon className="h-4 w-4 text-gray-400" /> {s.ip} · signal {signal(s.rssi)} ({s.rssi} dBm)
                            </dd>
                        </dl>
                        <button
                            disabled={busy !== null}
                            onClick={() => act('clock', () => apiService.post<Res<ModuleState>>('/bell/clock', {}), 'Module clock set to the server time')}
                            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Set clock from server time
                        </button>
                        <p className="text-xs text-gray-500">
                            The module has no battery clock: after a power cut it takes the time from the internet, or you set it here.
                        </p>
                    </section>

                    {/* Settings */}
                    <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 text-sm">
                        <h2 className="text-base font-semibold text-gray-900">Settings</h2>
                        <label className="flex items-start justify-between gap-4">
                            <span>
                                <span className="block font-medium text-gray-900">Scheduled bells</span>
                                <span className="text-gray-500">Turn off for holidays. Ringing by hand still works.</span>
                            </span>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={s.activees}
                                disabled={busy !== null}
                                onClick={() =>
                                    setConfig({ enabled: !s.activees }, s.activees ? 'Scheduled bells turned off' : 'Scheduled bells turned on')
                                }
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                                    s.activees ? 'bg-green-600' : 'bg-gray-300'
                                }`}
                            >
                                <span
                                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                                        s.activees ? 'translate-x-5' : 'translate-x-0.5'
                                    }`}
                                />
                            </button>
                        </label>
                        <details className="rounded-md border border-gray-200 p-3">
                            <summary className="cursor-pointer font-medium text-gray-700">Wiring (advanced)</summary>
                            <p className="mt-2 text-xs text-amber-800">
                                Only change these if the bell relay was rewired. A wrong value can leave the bell silent or ringing.
                            </p>
                            <div className="mt-3 space-y-3">
                                <label className="flex items-center justify-between gap-4">
                                    <span className="text-gray-700">Output pin</span>
                                    <select
                                        value={s.broche}
                                        disabled={busy !== null}
                                        onChange={(e) => setConfig({ pin: Number(e.target.value) }, `Output set to D${e.target.value}`)}
                                        className="rounded-md border border-gray-300 px-2 py-1"
                                    >
                                        {Array.from({ length: 9 }, (_, i) => (
                                            <option key={i} value={i}>
                                                D{i}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="flex items-center justify-between gap-4">
                                    <span className="text-gray-700">Relay is active low (rings on 0 V)</span>
                                    <input
                                        type="checkbox"
                                        checked={s.actifBas}
                                        disabled={busy !== null}
                                        onChange={(e) => setConfig({ activeLow: e.target.checked }, 'Relay level saved')}
                                        className="h-4 w-4"
                                    />
                                </label>
                                <p className="text-xs text-gray-500">Screen: {s.lcd}</p>
                            </div>
                        </details>
                    </section>
                </div>
            )}

            {/* Schedule */}
            {data && (
                <section className="rounded-lg border border-gray-200 bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">Bell times</h2>
                            <p className="text-sm text-gray-500">
                                {bells.length} of {MAX_BELLS} bells. Saved on the module, so they ring even when the SMS is off.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {dirty && (
                                <button
                                    onClick={() => setBells(savedBells)}
                                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    Undo changes
                                </button>
                            )}
                            <button
                                onClick={saveSchedule}
                                disabled={!dirty || saving}
                                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                            >
                                {saving ? 'Saving…' : 'Save bell times'}
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                                    <th className="py-2 pr-3">Time</th>
                                    <th className="py-2 pr-3">Label</th>
                                    <th className="py-2 pr-3">Days</th>
                                    <th className="py-2 pr-3">Rings for</th>
                                    <th className="py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {bells.map((b, i) => (
                                    <tr key={i} className="border-b last:border-0">
                                        <td className="py-2 pr-3">
                                            <input
                                                type="time"
                                                value={b.time}
                                                onChange={(e) => update(i, { time: e.target.value })}
                                                className="rounded-md border border-gray-300 px-2 py-1"
                                            />
                                        </td>
                                        <td className="py-2 pr-3">
                                            <input
                                                type="text"
                                                value={b.label}
                                                maxLength={39}
                                                placeholder="e.g. Period 1"
                                                onChange={(e) => update(i, { label: e.target.value })}
                                                className="w-44 rounded-md border border-gray-300 px-2 py-1"
                                            />
                                        </td>
                                        <td className="py-2 pr-3">
                                            <div className="flex gap-1">
                                                {DAYS.map((d) => (
                                                    <button
                                                        key={d.n}
                                                        type="button"
                                                        onClick={() => toggleDay(i, d.n)}
                                                        className={`rounded px-1.5 py-0.5 text-xs ${
                                                            b.days.includes(d.n) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                                                        }`}
                                                    >
                                                        {d.short}
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="py-2 pr-3 whitespace-nowrap">
                                            <input
                                                type="number"
                                                min={1}
                                                max={120}
                                                value={b.seconds}
                                                onChange={(e) => update(i, { seconds: Math.max(1, Math.min(120, Number(e.target.value) || 1)) })}
                                                className="w-16 rounded-md border border-gray-300 px-2 py-1"
                                            />{' '}
                                            s
                                        </td>
                                        <td className="py-2 text-right">
                                            <button
                                                onClick={() => removeBell(i)}
                                                title="Remove this bell"
                                                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button
                        onClick={addBell}
                        disabled={bells.length >= MAX_BELLS}
                        className="mt-3 inline-flex items-center gap-1 rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        <PlusIcon className="h-4 w-4" /> Add a bell
                    </button>
                </section>
            )}
        </div>
    );
}
