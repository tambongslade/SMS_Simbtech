'use client';

// Live CCTV (Super Manager, Manager, Principal, Vice Principal, Dean of Discipline,
// Discipline Coordinator). Works at school and online; see CameraPlayer for how the video
// gets here and lib/cameraSite for names, renaming and pan/tilt.
//
// The grid is a set of slots: pick a layout (1, 4, 9 or 12 per screen), fill it with a
// group from the "Show" menu, or choose any camera for any slot from the menu on its
// name. Each layout remembers its own slots in this browser.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowsPointingOutIcon,
    ArrowLeftIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    ArrowRightIcon,
    CheckIcon,
    PencilSquareIcon,
    SpeakerWaveIcon,
    SpeakerXMarkIcon,
    VideoCameraIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import CameraPlayer from '@/components/cameras/CameraPlayer';
import { Camera, loadCameraSite, moveCamera, renameCameraOnSite } from '@/lib/cameraSite';

// Each low-res camera stream is about 0.5 Mbit/s of the school's upload when watched from
// outside, so the number of tiles on screen is the bandwidth control.
const LAYOUTS = [
    { perPage: 1, cols: 'grid-cols-1', previewCols: 1 },
    { perPage: 4, cols: 'grid-cols-1 sm:grid-cols-2', previewCols: 2 },
    { perPage: 9, cols: 'grid-cols-2 sm:grid-cols-3', previewCols: 3 },
    { perPage: 12, cols: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4', previewCols: 4 },
];

const LAYOUT_KEY = 'ssic.cameras.layout';
const SLOTS_KEY = 'ssic.cameras.slots';
const PTZ_SPEED = 0.6;
const PTZ_REPEAT_MS = 1000; // each move tells the camera to stop by itself after 2 s

type SlotMap = Record<number, number[]>; // layout index -> channel shown in each slot

function readSaved<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
        return fallback;
    }
}

function save(key: string, value: unknown) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

/** Slots for a layout, filled in from `start` and wrapped round the camera list. */
function groupFrom(cameras: Camera[], perPage: number, start: number): number[] {
    if (!cameras.length) return [];
    return Array.from({ length: Math.min(perPage, cameras.length) }, (_, i) => cameras[(start + i) % cameras.length].channel);
}

export default function CamerasPage() {
    const [cameras, setCameras] = useState<Camera[]>([]);
    const [canRename, setCanRename] = useState(false);
    const [canMove, setCanMove] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [layoutIndex, setLayoutIndex] = useState(1);
    const [slots, setSlots] = useState<SlotMap>({});
    const [preview, setPreview] = useState<number | null>(null);
    const [focused, setFocused] = useState<number | null>(null);

    useEffect(() => {
        const savedLayout = Number(readSaved(LAYOUT_KEY, 1));
        if (savedLayout >= 0 && savedLayout < LAYOUTS.length) setLayoutIndex(savedLayout);
        setSlots(readSaved<SlotMap>(SLOTS_KEY, {}));

        (async () => {
            try {
                const info = await loadCameraSite();
                setCameras(info.cameras);
                setCanRename(info.canRename);
                setCanMove(info.canMove);
            } catch (e) {
                setError((e as Error).message || 'Could not load the cameras.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const layout = LAYOUTS[layoutIndex];
    const nameOf = useCallback(
        (channel: number) => cameras.find(c => c.channel === channel)?.name ?? `Camera ${channel}`,
        [cameras],
    );

    // The slots of a layout: what was saved (dropping cameras that no longer exist), else the first group.
    const slotsFor = useCallback((index: number): number[] => {
        const per = LAYOUTS[index].perPage;
        const known = new Set(cameras.map(c => c.channel));
        const saved = (slots[index] ?? []).filter(ch => known.has(ch));
        const fill = groupFrom(cameras, per, 0);
        return Array.from({ length: Math.min(per, cameras.length) }, (_, i) => saved[i] ?? fill[i]);
    }, [cameras, slots]);

    const current = useMemo(() => slotsFor(layoutIndex), [slotsFor, layoutIndex]);

    const setCurrent = (next: number[]) => {
        const all = { ...slots, [layoutIndex]: next };
        setSlots(all);
        save(SLOTS_KEY, all);
    };

    const chooseLayout = (i: number) => {
        setLayoutIndex(i);
        save(LAYOUT_KEY, i);
        setPreview(null);
    };

    // "Show" menu: groups of consecutive cameras for this layout (or each camera for 1 per screen).
    const groups = useMemo(() => {
        const per = layout.perPage;
        const out: { start: number; label: string }[] = [];
        for (let start = 0; start < cameras.length; start += per) {
            const chunk = cameras.slice(start, start + per);
            out.push({
                start,
                label: per === 1
                    ? chunk[0].name
                    : `Cameras ${start + 1}–${start + chunk.length}${chunk.length <= 4 ? `: ${chunk.map(c => c.name).join(', ')}` : ''}`,
            });
        }
        return out;
    }, [cameras, layout.perPage]);

    const groupValue = (() => {
        const match = groups.find(g => groupFrom(cameras, layout.perPage, g.start).join() === current.join());
        return match ? String(match.start) : 'custom';
    })();

    const renamed = (list: Camera[]) => setCameras(list);

    return (
        <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <VideoCameraIcon className="h-6 w-6 text-gray-700" />
                    <h1 className="text-xl font-semibold text-gray-900">Cameras</h1>
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-red-600">
                        <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" /> Live
                    </span>
                </div>

                {!focused && cameras.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1 text-sm">
                            <span className="text-gray-500 mr-1">Cameras per screen</span>
                            {LAYOUTS.map((l, i) => (
                                <div key={l.perPage} className="relative"
                                     onMouseEnter={() => setPreview(i)} onMouseLeave={() => setPreview(p => (p === i ? null : p))}>
                                    <button
                                        onClick={() => chooseLayout(i)}
                                        className={`px-2.5 py-1 rounded border text-sm ${i === layoutIndex
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        {l.perPage}
                                    </button>
                                    {preview === i && (
                                        <LayoutPreview
                                            cols={l.previewCols}
                                            names={slotsFor(i).map(nameOf)}
                                            count={l.perPage}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        <label className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500">Show</span>
                            <select
                                value={groupValue}
                                onChange={e => { if (e.target.value !== 'custom') setCurrent(groupFrom(cameras, layout.perPage, Number(e.target.value))); }}
                                className="max-w-[18rem] rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-800"
                            >
                                {groupValue === 'custom' && <option value="custom">My selection</option>}
                                {groups.map(g => <option key={g.start} value={g.start}>{g.label}</option>)}
                            </select>
                        </label>
                    </div>
                )}
            </div>

            {loading && <p className="text-sm text-gray-500">Loading cameras…</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}

            {!loading && !error && focused === null && (
                <div className={`grid gap-2 ${layout.cols}`}>
                    {current.map((channel, slot) => (
                        <div key={`${slot}-${channel}`} className="relative rounded overflow-hidden">
                            <CameraPlayer stream={`cam${channel}`} className="aspect-video" />
                            <button
                                onClick={() => setFocused(channel)}
                                className="absolute inset-0 top-9 cursor-zoom-in"
                                aria-label={`Watch ${nameOf(channel)}`}
                            />
                            <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 px-2 py-1 bg-gradient-to-b from-black/70 to-transparent">
                                <select
                                    value={channel}
                                    onChange={e => {
                                        const next = [...current];
                                        next[slot] = Number(e.target.value);
                                        setCurrent(next);
                                    }}
                                    className="max-w-[75%] truncate rounded bg-black/40 border border-white/20 px-1.5 py-0.5 text-xs font-medium text-white hover:bg-black/60 focus:outline-none"
                                    aria-label="Camera shown in this screen"
                                >
                                    {cameras.map(c => (
                                        <option key={c.channel} value={c.channel} className="text-gray-900">{c.name}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => setFocused(channel)}
                                    className="p-1 rounded text-white/80 hover:text-white hover:bg-white/20"
                                    aria-label={`Open ${nameOf(channel)}`}
                                >
                                    <ArrowsPointingOutIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {focused !== null && (
                <FocusedCamera
                    channel={focused}
                    cameras={cameras}
                    canRename={canRename}
                    canMove={canMove}
                    onSwitch={setFocused}
                    onRenamed={renamed}
                    onClose={() => setFocused(null)}
                />
            )}
        </div>
    );
}

/** Small picture of a layout, shown while hovering its button. */
function LayoutPreview({ cols, names, count }: { cols: number; names: string[]; count: number }) {
    return (
        <div className="absolute right-0 top-full mt-2 z-30 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                {Array.from({ length: count }, (_, i) => (
                    <div key={i} className="flex aspect-video items-center justify-center rounded bg-gray-800 px-0.5">
                        <span className="truncate text-[9px] leading-tight text-gray-200">{names[i] ?? ''}</span>
                    </div>
                ))}
            </div>
            <p className="mt-1.5 text-center text-[11px] text-gray-500">{count} per screen</p>
        </div>
    );
}

interface FocusedProps {
    channel: number;
    cameras: Camera[];
    canRename: boolean;
    canMove: boolean;
    onSwitch: (channel: number) => void;
    onRenamed: (list: Camera[]) => void;
    onClose: () => void;
}

/** One camera, large, inside the page (the sidebar stays visible). */
function FocusedCamera({ channel, cameras, canRename, canMove, onSwitch, onRenamed, onClose }: FocusedProps) {
    const [hd, setHd] = useState(false);
    const [sound, setSound] = useState(false);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState('');
    const name = cameras.find(c => c.channel === channel)?.name ?? `Camera ${channel}`;

    useEffect(() => { setEditing(false); setNote(''); }, [channel]);

    const saveName = async () => {
        setBusy(true);
        setNote('');
        try {
            onRenamed(await renameCameraOnSite(channel, draft));
            setEditing(false);
        } catch (e) {
            setNote((e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="rounded-lg bg-gray-950 flex flex-col h-[calc(100vh-14rem)] min-h-[320px]">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-white">
                <div className="flex items-center gap-2 min-w-0">
                    {editing ? (
                        <form className="flex items-center gap-1" onSubmit={e => { e.preventDefault(); saveName(); }}>
                            <input
                                autoFocus
                                value={draft}
                                maxLength={40}
                                onChange={e => setDraft(e.target.value)}
                                placeholder={`Camera ${channel}`}
                                className="w-56 rounded bg-white/10 border border-white/30 px-2 py-1 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/60"
                            />
                            <button type="submit" disabled={busy} className="p-1 rounded hover:bg-white/20" aria-label="Save name">
                                <CheckIcon className="h-5 w-5" />
                            </button>
                            <button type="button" onClick={() => setEditing(false)} className="p-1 rounded hover:bg-white/20" aria-label="Cancel">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </form>
                    ) : (
                        <>
                            <select
                                value={channel}
                                onChange={e => onSwitch(Number(e.target.value))}
                                className="max-w-[16rem] rounded bg-white/10 border border-white/20 px-2 py-1 text-sm font-medium text-white focus:outline-none"
                                aria-label="Camera"
                            >
                                {cameras.map(c => <option key={c.channel} value={c.channel} className="text-gray-900">{c.name}</option>)}
                            </select>
                            {canRename && (
                                <button
                                    onClick={() => { setDraft(name.startsWith('Camera ') && /^Camera \d+$/.test(name) ? '' : name); setEditing(true); }}
                                    className="p-1 rounded text-white/80 hover:text-white hover:bg-white/20"
                                    aria-label="Rename camera"
                                    title="Rename"
                                >
                                    <PencilSquareIcon className="h-5 w-5" />
                                </button>
                            )}
                        </>
                    )}
                    {note && <span className="text-xs text-red-300">{note}</span>}
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSound(s => !s)}
                        className={`flex items-center gap-1 rounded px-2 py-1 text-sm ${sound ? 'bg-blue-600' : 'hover:bg-white/20'}`}
                        aria-label={sound ? 'Mute' : 'Listen'}
                        title={sound ? 'Mute' : 'Listen to the camera microphone'}
                    >
                        {sound ? <SpeakerWaveIcon className="h-5 w-5" /> : <SpeakerXMarkIcon className="h-5 w-5" />}
                        <span className="hidden sm:inline">{sound ? 'Sound on' : 'Sound off'}</span>
                    </button>
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                        <input type="checkbox" checked={hd} onChange={e => setHd(e.target.checked)} className="rounded" />
                        HD
                    </label>
                    <button onClick={onClose} className="p-1 rounded hover:bg-white/20" aria-label="Back to all cameras" title="Back to all cameras">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
            </div>
            <div className="relative flex-1 min-h-0 px-2 pb-2">
                <CameraPlayer key={`${channel}-${hd}`} stream={`cam${channel}${hd ? '_hd' : ''}`} muted={!sound} className="w-full h-full" />
                {canMove && <PtzPad channel={channel} />}
            </div>
        </div>
    );
}

/** Hold an arrow to turn the camera; release to stop. */
function PtzPad({ channel }: { channel: number }) {
    const timer = useRef<ReturnType<typeof setInterval> | null>(null);
    const moving = useRef(false);
    const [error, setError] = useState('');

    const send = useCallback((x: number, y: number) => {
        moveCamera(channel, x, y).then(() => setError('')).catch(e => setError((e as Error).message));
    }, [channel]);

    const stop = useCallback(() => {
        if (timer.current) { clearInterval(timer.current); timer.current = null; }
        if (moving.current) { moving.current = false; send(0, 0); }
    }, [send]);

    const start = (x: number, y: number) => {
        stop();
        moving.current = true;
        send(x, y);
        timer.current = setInterval(() => send(x, y), PTZ_REPEAT_MS);
    };

    useEffect(() => stop, [stop]);

    const btn = (label: string, x: number, y: number, Icon: typeof ArrowUpIcon, pos: string) => (
        <button
            type="button"
            aria-label={label}
            title={label}
            onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); start(x, y); }}
            onPointerUp={stop}
            onPointerCancel={stop}
            onLostPointerCapture={stop}
            onContextMenu={e => e.preventDefault()}
            className={`absolute ${pos} flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 active:bg-blue-600 touch-none select-none`}
        >
            <Icon className="h-5 w-5" />
        </button>
    );

    return (
        <div className="absolute bottom-5 right-5">
            <div className="relative h-32 w-32">
                {btn('Turn up', 0, PTZ_SPEED, ArrowUpIcon, 'left-11 top-0')}
                {btn('Turn left', -PTZ_SPEED, 0, ArrowLeftIcon, 'left-0 top-11')}
                {btn('Turn right', PTZ_SPEED, 0, ArrowRightIcon, 'right-0 top-11')}
                {btn('Turn down', 0, -PTZ_SPEED, ArrowDownIcon, 'left-11 bottom-0')}
            </div>
            {error && <p className="mt-1 max-w-[12rem] text-right text-[11px] text-red-300">{error}</p>}
        </div>
    );
}
