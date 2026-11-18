'use client';

// Administrators' assiduity / punctuality (Discipline Coordinator).
// Daily register: present / late (with the arrival time) / absent for every administrator.
// Report: the paper "REPORT ON ASSIDUITY / PUNCTUALITY OF ADMINISTRATORS" for a day or a week, printable.
// Personnel list: who is on the list and the post shown for them.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ChevronLeftIcon, ChevronRightIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import {
  type AdminDayRow,
  type AdminReport,
  type AdminStatus,
  type PersonnelRow,
  getAdminDay,
  getAdminPersonnel,
  getAdminReport,
  saveAdminDay,
  searchAdminCandidates,
  setAdminPersonnel,
} from '@/lib/adminDutyApi';

type Tab = 'register' | 'report' | 'personnel';

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (iso: string) => new Date(`${iso}T00:00:00`);
const addDays = (iso: string, n: number) => {
  const d = fromIso(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
};
const mondayOf = (iso: string) => addDays(iso, -((fromIso(iso).getDay() + 6) % 7));
const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const WEEK_WORDS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'];
// 2 -> "02ND", 11 -> "11TH", 23 -> "23RD" (as on the paper report)
const ordinal = (n: number) => {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'TH' : ({ 1: 'ST', 2: 'ND', 3: 'RD' } as Record<number, string>)[n % 10] ?? 'TH';
  return `${pad(n)}${suffix}`;
};
const schoolToday = () => toIso(new Date());
const weekdayOf = (iso: string) => {
  const dow = fromIso(iso).getDay();
  return dow === 0 ? addDays(iso, 1) : dow === 6 ? addDays(iso, 2) : iso;
};

const STATUS_STYLE: Record<AdminStatus, { label: string; on: string; off: string }> = {
  PRESENT: { label: 'Present', on: 'bg-green-500 text-white', off: 'bg-green-50 text-green-700 hover:bg-green-100' },
  LATE: { label: 'Late', on: 'bg-yellow-400 text-yellow-950', off: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
  ABSENT: { label: 'Absent', on: 'bg-red-500 text-white', off: 'bg-red-50 text-red-700 hover:bg-red-100' },
};

// ---------------------------------------------------------------------------
// Daily register
// ---------------------------------------------------------------------------
function Register({ canEdit }: { canEdit: boolean }) {
  const [date, setDate] = useState(() => weekdayOf(schoolToday()));
  const [rows, setRows] = useState<AdminDayRow[]>([]);
  const [draft, setDraft] = useState<Record<number, { status: AdminStatus | null; time: string; note: string }>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [today, setToday] = useState(schoolToday());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getAdminDay(date);
      setRows(d.rows);
      setToday(d.today);
      setDraft(Object.fromEntries(d.rows.map(r => [r.userId, { status: r.status, time: r.arrivalTime ?? '', note: r.note ?? '' }])));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load the register.');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const future = date > today;
  const editable = canEdit && !future;
  const set = (userId: number, patch: Partial<{ status: AdminStatus | null; time: string; note: string }>) =>
    setDraft(prev => ({ ...prev, [userId]: { ...(prev[userId] ?? { status: null, time: '', note: '' }), ...patch } }));

  const dirty = rows.some(r => {
    const d = draft[r.userId];
    return d && (d.status !== r.status || (d.time || null) !== (r.arrivalTime || null) || (d.note || null) !== (r.note || null));
  });
  const counts = useMemo(() => {
    const c = { PRESENT: 0, LATE: 0, ABSENT: 0, none: 0 };
    rows.forEach(r => {
      const s = draft[r.userId]?.status;
      if (s) c[s] += 1;
      else c.none += 1;
    });
    return c;
  }, [rows, draft]);

  const save = async () => {
    const missing = rows.filter(r => draft[r.userId]?.status === 'LATE' && !draft[r.userId]?.time);
    if (missing.length) {
      toast.error(`Enter the arrival time for: ${missing.map(m => m.name).join(', ')}`);
      return;
    }
    setSaving(true);
    try {
      const entries = rows
        .filter(r => {
          const d = draft[r.userId];
          return d && (d.status !== r.status || (d.time || null) !== (r.arrivalTime || null) || (d.note || null) !== (r.note || null));
        })
        .map(r => {
          const d = draft[r.userId];
          return { userId: r.userId, status: d.status, arrivalTime: d.status === 'ABSENT' ? null : d.time || null, note: d.note || null };
        });
      const res = await saveAdminDay(date, entries);
      toast.success(`Saved (${res.saved} recorded${res.cleared ? `, ${res.cleared} cleared` : ''}).`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const dayLabel = `${DAY_NAMES[fromIso(date).getDay()].charAt(0)}${DAY_NAMES[fromIso(date).getDay()].slice(1).toLowerCase()} ${date}`;

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-lg shadow px-3 py-2 flex flex-wrap items-center gap-2 text-sm">
        <button onClick={() => setDate(d => weekdayOf(addDays(d, fromIso(d).getDay() === 1 ? -3 : -1)))} className="p-1.5 rounded bg-gray-100 hover:bg-gray-200" aria-label="Previous day">
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <span className="font-medium min-w-[160px] text-center">{dayLabel}</span>
        <button onClick={() => setDate(d => weekdayOf(addDays(d, 1)))} className="p-1.5 rounded bg-gray-100 hover:bg-gray-200" aria-label="Next day">
          <ChevronRightIcon className="w-4 h-4" />
        </button>
        <input type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)} className="rounded border border-gray-300 px-2 py-1 text-sm" />
        {date !== weekdayOf(today) && (
          <button onClick={() => setDate(weekdayOf(today))} className="px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100">
            Today
          </button>
        )}
        <span className="ml-auto flex flex-wrap gap-1.5 text-xs">
          <span className="rounded-full px-2 py-0.5 bg-green-100 text-green-800">Present {counts.PRESENT}</span>
          <span className="rounded-full px-2 py-0.5 bg-yellow-100 text-yellow-800">Late {counts.LATE}</span>
          <span className="rounded-full px-2 py-0.5 bg-red-100 text-red-800">Absent {counts.ABSENT}</span>
          <span className="rounded-full px-2 py-0.5 bg-gray-100 text-gray-600">Not marked {counts.none}</span>
        </span>
      </div>

      {future && <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded p-3 text-sm">This day has not come yet.</div>}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left w-10">No</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Post</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Arrival time</th>
              <th className="px-3 py-2 text-left">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">Nobody on the list yet. Add people under “Personnel list”.</td></tr>
            ) : (
              rows.map((r, i) => {
                const d = draft[r.userId] ?? { status: null, time: '', note: '' };
                const needsTime = d.status === 'LATE' && !d.time;
                return (
                  <tr key={r.userId} className="hover:bg-gray-50">
                    <td className="px-3 py-1.5 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-1.5 font-medium text-gray-900 whitespace-nowrap">{r.name}</td>
                    <td className="px-3 py-1.5 text-gray-600 whitespace-nowrap">{r.post}</td>
                    <td className="px-3 py-1.5">
                      <div className="inline-flex gap-1">
                        {(['PRESENT', 'LATE', 'ABSENT'] as AdminStatus[]).map(s => (
                          <button
                            key={s}
                            type="button"
                            disabled={!editable}
                            onClick={() => set(r.userId, { status: d.status === s ? null : s })}
                            className={`px-2.5 py-1 rounded text-xs font-semibold disabled:cursor-not-allowed ${d.status === s ? STATUS_STYLE[s].on : STATUS_STYLE[s].off}`}
                          >
                            {STATUS_STYLE[s].label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      {d.status === 'ABSENT' ? (
                        <span className="text-gray-400">/</span>
                      ) : (
                        <input
                          type="time"
                          value={d.time}
                          disabled={!editable || !d.status}
                          onChange={e => set(r.userId, { time: e.target.value })}
                          className={`rounded border px-2 py-0.5 text-sm ${needsTime ? 'border-red-500 bg-red-50' : 'border-gray-300'} disabled:bg-gray-50`}
                          title={d.status === 'LATE' ? 'Required: the time this person arrived' : 'Optional'}
                        />
                      )}
                      {needsTime && <div className="text-[11px] text-red-600">Required when late</div>}
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        value={d.note}
                        disabled={!editable || !d.status}
                        onChange={e => set(r.userId, { note: e.target.value })}
                        placeholder={d.status ? 'Optional' : ''}
                        className="w-full min-w-[120px] rounded border border-gray-300 px-2 py-0.5 text-sm disabled:bg-gray-50"
                      />
                      {r.recordedBy && <div className="text-[10px] text-gray-400">by {r.recordedBy}</div>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {editable && rows.length > 0 && (
        <div className="sticky bottom-0 bg-white/95 backdrop-blur border rounded-lg shadow px-3 py-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => rows.forEach(r => !draft[r.userId]?.status && set(r.userId, { status: 'PRESENT' }))}
            className="px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm"
          >
            Mark everyone not marked as present
          </button>
          <span className="text-xs text-gray-500">Late needs the arrival time. Click a selected status again to clear it.</span>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="ml-auto px-4 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Report (like the paper report), day or week, printable
// ---------------------------------------------------------------------------
function Report() {
  const [span, setSpan] = useState<'day' | 'week'>('week');
  const [anchor, setAnchor] = useState(() => weekdayOf(schoolToday()));
  const [report, setReport] = useState<AdminReport | null>(null);
  const [loading, setLoading] = useState(false);

  const from = span === 'week' ? mondayOf(anchor) : anchor;
  const to = span === 'week' ? addDays(mondayOf(anchor), 4) : anchor;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAdminReport(from, to)
      .then(r => !cancelled && setReport(r))
      .catch(e => toast.error(e instanceof Error ? e.message : 'Failed to load the report.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const monday = fromIso(mondayOf(anchor));
  const monthLabel = `${MONTHS[fromIso(from).getMonth()]} ${fromIso(from).getFullYear()}`;
  const weekLabel = WEEK_WORDS[Math.ceil(monday.getDate() / 7) - 1] ?? String(Math.ceil(monday.getDate() / 7));

  const cell = (c: AdminReport['rows'][number]['days'][string]) => {
    if (!c) return <span className="text-gray-300">—</span>;
    if (c.status === 'ABSENT') return <span className="font-semibold text-red-700">/</span>;
    const t = c.arrivalTime ? c.arrivalTime.replace(/^0/, '') : '✓';
    return <span className={c.status === 'LATE' ? 'font-bold text-red-700' : 'text-gray-900'} title={c.note ?? undefined}>{t}</span>;
  };

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-lg shadow px-3 py-2 flex flex-wrap items-center gap-2 text-sm print:hidden">
        <div className="inline-flex rounded border border-gray-300 overflow-hidden">
          {(['day', 'week'] as const).map(s => (
            <button key={s} onClick={() => setSpan(s)} className={`px-3 py-1 ${span === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {s === 'day' ? 'Daily report' : 'Weekly report'}
            </button>
          ))}
        </div>
        <button onClick={() => setAnchor(a => weekdayOf(addDays(a, span === 'week' ? -7 : fromIso(a).getDay() === 1 ? -3 : -1)))} className="p-1.5 rounded bg-gray-100 hover:bg-gray-200" aria-label="Previous">
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <span className="font-medium text-center min-w-[170px]">{from === to ? from : `${from} → ${to}`}</span>
        <button onClick={() => setAnchor(a => weekdayOf(addDays(a, span === 'week' ? 7 : 1)))} className="p-1.5 rounded bg-gray-100 hover:bg-gray-200" aria-label="Next">
          <ChevronRightIcon className="w-4 h-4" />
        </button>
        <input type="date" value={anchor} onChange={e => e.target.value && setAnchor(weekdayOf(e.target.value))} className="rounded border border-gray-300 px-2 py-1 text-sm" />
        <button onClick={() => window.print()} className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700">
          <PrinterIcon className="w-4 h-4" /> Print
        </button>
      </div>

      <div className="print-area bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="text-center mb-3">
          <h2 className="text-base sm:text-lg font-bold underline">REPORT ON ASSIDUITY / PUNCTUALITY OF ADMINISTRATORS</h2>
          <div className="mt-1 text-sm font-semibold flex justify-center gap-8">
            <span>Month: {monthLabel}</span>
            {span === 'week' ? <span>Week: {weekLabel}</span> : <span>Day: {DAY_NAMES[fromIso(from).getDay()]} {ordinal(fromIso(from).getDate())}</span>}
          </div>
        </div>
        {loading && !report ? (
          <p className="text-center text-gray-400 py-6">Loading…</p>
        ) : !report || report.rows.length === 0 ? (
          <p className="text-center text-gray-400 py-6">Nobody on the list.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-2 py-1 w-10">No</th>
                <th className="border border-gray-400 px-2 py-1 text-left">NAME OF ADMINISTRATORS</th>
                <th className="border border-gray-400 px-2 py-1">POST</th>
                {report.days.map(d => (
                  <th key={d} className="border border-gray-400 px-2 py-1 text-center">
                    <div>{DAY_NAMES[fromIso(d).getDay()]}</div>
                    <div className="font-normal text-xs">{ordinal(fromIso(d).getDate())}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r, i) => (
                <tr key={r.userId}>
                  <td className="border border-gray-400 px-2 py-0.5 text-center">{i + 1}</td>
                  <td className="border border-gray-400 px-2 py-0.5 uppercase whitespace-nowrap">{r.name}</td>
                  <td className="border border-gray-400 px-2 py-0.5 text-center whitespace-nowrap">{r.post}</td>
                  {report.days.map(d => (
                    <td key={d} className="border border-gray-400 px-2 py-0.5 text-center">{cell(r.days[d])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {report && (
          <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-gray-600">
            <span>
              Time = arrival time · <span className="font-bold text-red-700">red</span> = late · / = absent · — = not recorded
            </span>
            <span>
              Present {report.totals.present} · Late {report.totals.late} · Absent {report.totals.absent}
            </span>
          </div>
        )}
        <div className="mt-10 text-right text-sm font-semibold pr-6">The Discipline Coordinator</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Personnel list
// ---------------------------------------------------------------------------
function Personnel({ canEdit }: { canEdit: boolean }) {
  const [list, setList] = useState<{ personnel: PersonnelRow[]; removed: PersonnelRow[] } | null>(null);
  const [posts, setPosts] = useState<Record<number, string>>({});
  const [search, setSearch] = useState('');
  const [found, setFound] = useState<{ id: number; name: string; matricule: string | null; roles: string[] }[]>([]);
  const [newPost, setNewPost] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const l = await getAdminPersonnel();
      setList(l);
      setPosts(Object.fromEntries(l.personnel.map(p => [p.userId, p.post])));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load the list.');
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setFound([]);
      return;
    }
    const t = setTimeout(() => {
      searchAdminCandidates(search.trim()).then(setFound).catch(() => setFound([]));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const act = async (userId: number, body: { post?: string; included: boolean }, msg: string) => {
    setBusy(true);
    try {
      await setAdminPersonnel(userId, body);
      toast.success(msg);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setBusy(false);
    }
  };

  const onList = new Set(list?.personnel.map(p => p.userId) ?? []);

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-x-auto">
        <div className="px-3 py-2 border-b text-sm font-semibold">On the assiduity list ({list?.personnel.length ?? 0})</div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Post (as printed)</th>
              <th className="px-3 py-2 text-left">On the list because</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(list?.personnel ?? []).map(p => (
              <tr key={p.userId}>
                <td className="px-3 py-1.5 font-medium">{p.name}</td>
                <td className="px-3 py-1.5">
                  <div className="flex gap-1">
                    <input
                      value={posts[p.userId] ?? ''}
                      disabled={!canEdit}
                      onChange={e => setPosts(prev => ({ ...prev, [p.userId]: e.target.value }))}
                      className="w-28 rounded border border-gray-300 px-2 py-0.5 text-sm disabled:bg-gray-50"
                    />
                    {canEdit && (posts[p.userId] ?? '') !== p.post && (
                      <button disabled={busy} onClick={() => act(p.userId, { post: posts[p.userId] ?? '', included: true }, 'Post saved.')} className="px-2 rounded bg-blue-600 text-white text-xs">
                        Save
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-3 py-1.5 text-xs text-gray-500">{p.source === 'role' ? 'Administrator role' : 'Added by hand'}</td>
                <td className="px-3 py-1.5 text-right">
                  {canEdit && (
                    <button disabled={busy} onClick={() => act(p.userId, { included: false }, `${p.name} taken off the list.`)} className="text-xs text-red-600 hover:underline">
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3">
        {canEdit && (
          <div className="bg-white rounded-lg shadow p-3 space-y-2">
            <div className="text-sm font-semibold">Add a staff member</div>
            <p className="text-xs text-gray-500">
              Discipline masters, deans, nurse, bursar, secretary and vice principal are listed automatically. Add anyone else here
              (lab attendant, technician, accountant…).
            </p>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or matricule" className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            <input value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="Post, e.g. LAB. ATT" className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {found.map(u => (
                <div key={u.id} className="flex items-center gap-2 py-1.5 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{u.name}</div>
                    <div className="text-[11px] text-gray-500 truncate">{u.roles.join(', ').toLowerCase().replace(/_/g, ' ')}</div>
                  </div>
                  {onList.has(u.id) ? (
                    <span className="text-xs text-gray-400">on the list</span>
                  ) : (
                    <button disabled={busy} onClick={() => act(u.id, { post: newPost.trim(), included: true }, `${u.name} added.`)} className="px-2 py-0.5 rounded bg-blue-600 text-white text-xs">
                      Add
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {(list?.removed.length ?? 0) > 0 && (
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-sm font-semibold mb-1">Taken off the list</div>
            {list!.removed.map(p => (
              <div key={p.userId} className="flex items-center justify-between py-1 text-sm">
                <span>
                  {p.name} <span className="text-xs text-gray-400">{p.post}</span>
                </span>
                {canEdit && (
                  <button disabled={busy} onClick={() => act(p.userId, { included: true }, `${p.name} back on the list.`)} className="text-xs text-blue-600 hover:underline">
                    Put back
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdministratorsAttendancePage() {
  const { selectedRole } = useAuth();
  const [tab, setTab] = useState<Tab>('register');
  const canEdit = selectedRole === 'DISCIPLINE_COORDINATOR' || selectedRole === 'SUPER_MANAGER' || selectedRole === 'MANAGER';

  return (
    <div className="p-3 md:p-4 space-y-3 w-full">
      {/* Print only the report sheet */}
      <style>{`@media print {
        body * { visibility: hidden !important; }
        .print-area, .print-area * { visibility: visible !important; }
        .print-area { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
      }`}</style>
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <h1 className="text-lg font-bold text-gray-900">Administrators Attendance</h1>
        <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-sm">
          {([
            { key: 'register', label: 'Daily register' },
            { key: 'report', label: 'Report' },
            { key: 'personnel', label: 'Personnel list' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-1 ${tab === t.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {tab === 'register' && <Register canEdit={canEdit} />}
      {tab === 'report' && <Report />}
      {tab === 'personnel' && <Personnel canEdit={canEdit} />}
    </div>
  );
}
