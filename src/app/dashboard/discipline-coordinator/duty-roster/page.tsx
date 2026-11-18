'use client';

// Monthly discipline duty roster (Discipline Coordinator), in the four tables of the
// paper roster: Saturday control, control of preps, coordinators, zones and positions.
// Discipline masters are picked from the staff list; anyone not in the system can be
// typed in "others". "Preview & print" lays it out like the paper document.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { PlusIcon, PrinterIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import {
  type RosterMonth,
  type RosterRow,
  type RosterSection,
  type RosterStaff,
  ROSTER_SECTIONS,
  getDutyRoster,
  getRosterStaff,
  saveDutyRoster,
} from '@/lib/adminDutyApi';

const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const pad = (n: number) => String(n).padStart(2, '0');
const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const monthName = (m: string) => MONTHS[Number(m.slice(5, 7)) - 1] ?? m;
const saturdaysOf = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  const out: string[] = [];
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(y, mo - 1, d);
    if (dt.getMonth() !== mo - 1) break;
    if (dt.getDay() === 6) out.push(`${y}-${pad(mo)}-${pad(d)}`);
  }
  return out;
};
const dmy = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');

const SECTION_INFO: Record<RosterSection, { title: string; hint: string }> = {
  SATURDAY_CONTROL: { title: 'Saturday control', hint: 'Which discipline masters control which classes on each Saturday.' },
  PREPS_CONTROL: { title: 'Control of preps', hint: 'Who controls preps for each class, and when.' },
  COORDINATORS: { title: 'Coordinators', hint: 'One coordinator per block or area.' },
  ZONES: { title: 'Attribution of zones and positions', hint: 'Morning posts: time, zone, position, who, and what they do there.' },
};

const blank = (section: RosterSection, extra: Partial<RosterRow> = {}): RosterRow => ({
  id: null,
  section,
  week: null,
  date: null,
  timeLabel: null,
  zone: null,
  position: null,
  classLabel: null,
  activity: null,
  assigneeIds: [],
  assigneeNote: null,
  ...extra,
});

type Sections = Record<RosterSection, RosterRow[]>;
const emptySections = (): Sections => ({ SATURDAY_CONTROL: [], PREPS_CONTROL: [], COORDINATORS: [], ZONES: [] });

// Names of the people on a row: picked staff first, then the free-text others.
const peopleOf = (r: RosterRow, staff: Map<number, RosterStaff>) =>
  [...r.assigneeIds.map(id => staff.get(id)?.name ?? r.assigneeNames?.[r.assigneeIds.indexOf(id)] ?? `#${id}`), ...(r.assigneeNote ? [r.assigneeNote] : [])].join(' / ');

// ---------------------------------------------------------------------------
function AssigneePicker({
  row,
  staff,
  disabled,
  onChange,
}: {
  row: RosterRow;
  staff: RosterStaff[];
  disabled: boolean;
  onChange: (patch: Partial<RosterRow>) => void;
}) {
  const byId = useMemo(() => new Map(staff.map(s => [s.id, s])), [staff]);
  return (
    <div className="space-y-1 min-w-[180px]">
      <div className="flex flex-wrap gap-1">
        {row.assigneeIds.map(id => (
          <span key={id} className="inline-flex items-center gap-1 rounded bg-blue-50 text-blue-800 px-1.5 py-0.5 text-xs">
            {byId.get(id)?.name ?? `#${id}`}
            {!disabled && (
              <button type="button" onClick={() => onChange({ assigneeIds: row.assigneeIds.filter(x => x !== id) })} aria-label="Remove">
                <XMarkIcon className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      {!disabled && (
        <select
          value=""
          onChange={e => {
            const id = Number(e.target.value);
            if (id && !row.assigneeIds.includes(id)) onChange({ assigneeIds: [...row.assigneeIds, id] });
          }}
          className="w-full rounded border border-gray-300 px-1.5 py-0.5 text-xs bg-white"
        >
          <option value="">+ add discipline master</option>
          {staff.filter(s => !row.assigneeIds.includes(s.id)).map(s => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}
      <input
        value={row.assigneeNote ?? ''}
        disabled={disabled}
        onChange={e => onChange({ assigneeNote: e.target.value || null })}
        placeholder="Others (not in the system)"
        className="w-full rounded border border-gray-200 px-1.5 py-0.5 text-xs disabled:bg-gray-50"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// The printable roster, laid out like the paper document (repeated cells merged).
function RosterPrint({ month, sections, staff }: { month: string; sections: Sections; staff: Map<number, RosterStaff> }) {
  const name = monthName(month);
  const year = month.slice(0, 4);
  // rowSpan for runs of equal values in one column
  const spans = (rows: RosterRow[], key: (r: RosterRow) => string) =>
    rows.map((r, i) => {
      if (i > 0 && key(rows[i - 1]) === key(r)) return 0;
      let n = 1;
      while (i + n < rows.length && key(rows[i + n]) === key(r)) n++;
      return n;
    });
  const td = 'border border-gray-500 px-2 py-1 align-middle';
  const th = 'border border-gray-500 px-2 py-1 bg-gray-100 font-bold';
  // A blank time / zone / activity / week / date means "same as the row above" (a merged cell on paper).
  const carry = (rows: RosterRow[], keys: (keyof RosterRow)[]) => {
    const out: RosterRow[] = [];
    rows.forEach((r, i) => {
      const row = { ...r };
      if (i > 0) keys.forEach(k => {
        if (row[k] == null || row[k] === '') (row as Record<string, unknown>)[k] = out[i - 1][k];
      });
      out.push(row);
    });
    return out;
  };
  const sat = carry(sections.SATURDAY_CONTROL, ['week', 'date']);
  const satSpan = spans(sat, r => `${r.week}|${r.date}`);
  const preps = carry(sections.PREPS_CONTROL, ['timeLabel']);
  const prepSpan = spans(preps, r => r.timeLabel ?? '');
  const zones = carry(sections.ZONES, ['timeLabel', 'zone', 'activity']);
  const zoneTime = spans(zones, r => r.timeLabel ?? '');
  const zoneName = spans(zones, r => `${r.timeLabel}|${r.zone}`);
  const zoneAct = spans(zones, r => `${r.timeLabel}|${r.activity}`);
  const sign = <div className="mt-6 mb-10 text-right font-semibold pr-6">The Principal</div>;

  return (
    <div className="print-area bg-white rounded-lg shadow p-4 sm:p-8 text-sm text-gray-900">
      {sat.length > 0 && (
        <>
          <h2 className="text-center font-bold underline mb-2">DUTY ROSTER FOR SATURDAY CONTROL MONTH OF {name}</h2>
          <table className="w-full border-collapse mb-2">
            <thead>
              <tr><th className={th}>WEEK</th><th className={th}>DAY</th><th className={th}>CLASS</th><th className={th}>DISCIPLINE MASTERS/MISTRESS</th></tr>
            </thead>
            <tbody>
              {sat.map((r, i) => (
                <tr key={i}>
                  {satSpan[i] > 0 && <td rowSpan={satSpan[i]} className={`${td} text-center`}>{r.week ?? ''}</td>}
                  {satSpan[i] > 0 && <td rowSpan={satSpan[i]} className={`${td} text-center`}>{dmy(r.date)}</td>}
                  <td className={td}>{r.classLabel}</td>
                  <td className={td}>{peopleOf(r, staff)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sign}
        </>
      )}
      {preps.length > 0 && (
        <>
          <h2 className="text-center font-bold underline mb-2">CONTROL OF PREPS MONTH OF {name}</h2>
          <table className="w-full border-collapse mb-2">
            <thead>
              <tr><th className={th}>TIME</th><th className={th}>DISCIPLINE MASTERS/ MISTRESS</th><th className={th}>CLASSES</th></tr>
            </thead>
            <tbody>
              {preps.map((r, i) => (
                <tr key={i}>
                  {prepSpan[i] > 0 && <td rowSpan={prepSpan[i]} className={`${td} text-center`}>{r.timeLabel}</td>}
                  <td className={td}>{peopleOf(r, staff)}</td>
                  <td className={td}>{r.classLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {sections.COORDINATORS.length > 0 && (
        <>
          <h2 className="text-center font-bold underline mt-4 mb-2">COORDINATORS</h2>
          <table className="w-full border-collapse mb-2">
            <thead>
              <tr>
                {sections.COORDINATORS.map((r, i) => (
                  <th key={i} className={th}>
                    {r.zone}
                    {r.position && <div className="font-normal">( {r.position} )</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {sections.COORDINATORS.map((r, i) => (
                  <td key={i} className={`${td} text-center`}>{peopleOf(r, staff)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </>
      )}
      {(preps.length > 0 || sections.COORDINATORS.length > 0) && sign}
      {zones.length > 0 && (
        <>
          <h2 className="text-center font-bold underline mb-2">
            DEPARTMENT OF DISCIPLINE ATTRIBUTION OF ZONES AND POSITIONS FOR THE MONTH OF {name} {year}
          </h2>
          <table className="w-full border-collapse mb-2">
            <thead>
              <tr><th className={th}>TIME</th><th className={th}>ZONES</th><th className={th}>POSITION</th><th className={th}>DISCIPLINE</th><th className={th}>ACTIVITY</th></tr>
            </thead>
            <tbody>
              {zones.map((r, i) => (
                <tr key={i}>
                  {zoneTime[i] > 0 && <td rowSpan={zoneTime[i]} className={`${td} text-center whitespace-pre-line`}>{r.timeLabel}</td>}
                  {zoneName[i] > 0 && <td rowSpan={zoneName[i]} className={`${td} font-semibold`}>{r.zone}</td>}
                  <td className={td}>{r.position}</td>
                  <td className={td}>{peopleOf(r, staff)}</td>
                  {zoneAct[i] > 0 && <td rowSpan={zoneAct[i]} className={`${td} whitespace-pre-line`}>{r.activity}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          {sign}
        </>
      )}
      {ROSTER_SECTIONS.every(s => sections[s].length === 0) && <p className="text-center text-gray-400 py-6">Nothing on this month’s roster yet.</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
export default function DutyRosterPage() {
  const { selectedRole } = useAuth();
  const canEdit = selectedRole === 'DISCIPLINE_COORDINATOR' || selectedRole === 'SUPER_MANAGER' || selectedRole === 'MANAGER';
  const [month, setMonth] = useState(thisMonth);
  const [view, setView] = useState<'edit' | 'print'>('edit');
  const [staff, setStaff] = useState<RosterStaff[]>([]);
  const [loaded, setLoaded] = useState<RosterMonth | null>(null);
  const [sections, setSections] = useState<Sections>(emptySections);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const staffById = useMemo(() => new Map(staff.map(s => [s.id, s])), [staff]);

  useEffect(() => {
    getRosterStaff().then(setStaff).catch(() => toast.error('Failed to load the discipline staff.'));
  }, []);

  const load = useCallback(async () => {
    try {
      const r = await getDutyRoster(month);
      setLoaded(r);
      setSections({ ...emptySections(), ...r.sections });
      setDirty(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load the roster.');
    }
  }, [month]);
  useEffect(() => {
    load();
  }, [load]);

  const update = (section: RosterSection, i: number, patch: Partial<RosterRow>) => {
    setSections(prev => ({ ...prev, [section]: prev[section].map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
    setDirty(true);
  };
  const add = (section: RosterSection, rows: RosterRow[]) => {
    setSections(prev => ({ ...prev, [section]: [...prev[section], ...rows] }));
    setDirty(true);
  };
  const remove = (section: RosterSection, i: number) => {
    setSections(prev => ({ ...prev, [section]: prev[section].filter((_, j) => j !== i) }));
    setDirty(true);
  };
  const move = (section: RosterSection, i: number, dir: -1 | 1) => {
    setSections(prev => {
      const rows = [...prev[section]];
      const j = i + dir;
      if (j < 0 || j >= rows.length) return prev;
      [rows[i], rows[j]] = [rows[j], rows[i]];
      return { ...prev, [section]: rows };
    });
    setDirty(true);
  };

  // One week per Saturday of the month, with the classes of the last week (or Form 5 / Lower / Upper Sixth).
  const fillSaturdays = () => {
    const existing = sections.SATURDAY_CONTROL;
    const classes = existing.length ? Array.from(new Set(existing.map(r => r.classLabel ?? ''))) : ['FORM 5', 'LOWER SIXTH', 'UPPER SIXTH'];
    const have = new Set(existing.map(r => r.date));
    const rows: RosterRow[] = [];
    saturdaysOf(month).forEach((date, w) => {
      if (have.has(date)) return;
      classes.forEach(c => rows.push(blank('SATURDAY_CONTROL', { week: w + 1, date, classLabel: c })));
    });
    if (!rows.length) {
      toast('Every Saturday of the month is already on the roster.');
      return;
    }
    add('SATURDAY_CONTROL', rows);
    setSections(prev => ({ ...prev, SATURDAY_CONTROL: [...prev.SATURDAY_CONTROL].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')) }));
  };

  // Start this month from the previous roster: same posts and people; Saturday dates moved to this month.
  const copyPrevious = async () => {
    if (!loaded?.previousMonth) return;
    try {
      const prev = await getDutyRoster(loaded.previousMonth);
      const sats = saturdaysOf(month);
      const next = emptySections();
      ROSTER_SECTIONS.forEach(s => {
        next[s] = prev.sections[s].map(r => {
          const row = { ...r, id: null };
          if (s === 'SATURDAY_CONTROL') {
            const w = r.week ?? 1;
            row.date = sats[w - 1] ?? null;
          }
          return row;
        }).filter(r => r.section !== 'SATURDAY_CONTROL' || r.date);
      });
      setSections(next);
      setDirty(true);
      toast.success(`Copied from ${monthName(loaded.previousMonth)}. Check it, then save.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to copy.');
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const entries = ROSTER_SECTIONS.flatMap(s => sections[s].map((r, i) => ({ ...r, sortOrder: i })));
      const res = await saveDutyRoster(month, entries);
      toast.success(`Roster saved (${res.rows} rows).`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save the roster.');
    } finally {
      setSaving(false);
    }
  };

  const inp = 'w-full rounded border border-gray-300 px-1.5 py-0.5 text-xs disabled:bg-gray-50';
  const ro = !canEdit;
  const isEmpty = ROSTER_SECTIONS.every(s => sections[s].length === 0);

  const rowTools = (section: RosterSection, i: number, last: boolean) =>
    canEdit && (
      <td className="px-1 py-1 whitespace-nowrap text-right">
        <button onClick={() => move(section, i, -1)} disabled={i === 0} className="px-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" aria-label="Move up">↑</button>
        <button onClick={() => move(section, i, 1)} disabled={last} className="px-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" aria-label="Move down">↓</button>
        <button onClick={() => remove(section, i)} className="p-1 text-red-500 hover:text-red-700" aria-label="Delete row">
          <TrashIcon className="w-3.5 h-3.5" />
        </button>
      </td>
    );

  const sectionCard = (section: RosterSection, head: string[], body: (r: RosterRow, i: number) => React.ReactNode, extraButtons?: React.ReactNode) => (
    <div className="bg-white rounded-lg shadow">
      <div className="px-3 py-2 border-b flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <div className="text-sm font-semibold">{SECTION_INFO[section].title}</div>
          <div className="text-xs text-gray-500">{SECTION_INFO[section].hint}</div>
        </div>
        {extraButtons}
        {canEdit && (
          <button onClick={() => add(section, [blank(section)])} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-xs">
            <PlusIcon className="w-3.5 h-3.5" /> Add row
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
              {head.map(h => (
                <th key={h} className="px-2 py-1.5 text-left">{h}</th>
              ))}
              {canEdit && <th />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sections[section].length === 0 ? (
              <tr><td colSpan={head.length + 1} className="px-2 py-4 text-center text-gray-400">No rows yet.</td></tr>
            ) : (
              sections[section].map((r, i) => (
                <tr key={r.id ?? `n${i}`} className="align-top">
                  {body(r, i)}
                  {rowTools(section, i, i === sections[section].length - 1)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-3 md:p-4 space-y-3 w-full">
      <style>{`@media print {
        body * { visibility: hidden !important; }
        .print-area, .print-area * { visibility: visible !important; }
        .print-area { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
      }`}</style>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <h1 className="text-lg font-bold text-gray-900 mr-1">Duty Roster</h1>
        <input
          type="month"
          value={month}
          onChange={e => {
            if (!e.target.value) return;
            if (dirty && !window.confirm('You have unsaved changes. Leave this month without saving?')) return;
            setMonth(e.target.value);
          }}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-sm">
          {(['edit', 'print'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1 ${view === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {v === 'edit' ? (canEdit ? 'Edit' : 'Roster') : 'Preview & print'}
            </button>
          ))}
        </div>
        {canEdit && isEmpty && loaded?.previousMonth && (
          <button onClick={copyPrevious} className="px-3 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm">
            Copy from {monthName(loaded.previousMonth)}
          </button>
        )}
        {view === 'print' && (
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm">
            <PrinterIcon className="w-4 h-4" /> Print
          </button>
        )}
        {canEdit && (
          <button onClick={save} disabled={!dirty || saving} className="ml-auto px-4 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 text-sm font-medium">
            {saving ? 'Saving…' : dirty ? 'Save roster' : 'Saved'}
          </button>
        )}
      </div>

      {view === 'print' ? (
        <RosterPrint month={month} sections={sections} staff={staffById} />
      ) : (
        <div className="space-y-3">
          {sectionCard(
            'SATURDAY_CONTROL',
            ['Week', 'Day', 'Class', 'Discipline masters / mistress'],
            (r, i) => (
              <>
                <td className="px-2 py-1 w-16">
                  <input type="number" min={1} max={6} value={r.week ?? ''} disabled={ro} onChange={e => update('SATURDAY_CONTROL', i, { week: e.target.value ? Number(e.target.value) : null })} className={inp} />
                </td>
                <td className="px-2 py-1 w-36">
                  <input type="date" value={r.date ?? ''} disabled={ro} onChange={e => update('SATURDAY_CONTROL', i, { date: e.target.value || null })} className={inp} />
                </td>
                <td className="px-2 py-1 w-44">
                  <input value={r.classLabel ?? ''} disabled={ro} onChange={e => update('SATURDAY_CONTROL', i, { classLabel: e.target.value || null })} placeholder="e.g. FORM 5" className={inp} />
                </td>
                <td className="px-2 py-1">
                  <AssigneePicker row={r} staff={staff} disabled={ro} onChange={p => update('SATURDAY_CONTROL', i, p)} />
                </td>
              </>
            ),
            canEdit && (
              <button onClick={fillSaturdays} className="px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs">
                Fill in the month’s Saturdays
              </button>
            )
          )}
          {sectionCard('PREPS_CONTROL', ['Time', 'Discipline masters / mistress', 'Class'], (r, i) => (
            <>
              <td className="px-2 py-1 w-44">
                <input value={r.timeLabel ?? ''} disabled={ro} onChange={e => update('PREPS_CONTROL', i, { timeLabel: e.target.value || null })} placeholder="3:40 pm to 5:30 pm" className={inp} />
              </td>
              <td className="px-2 py-1">
                <AssigneePicker row={r} staff={staff} disabled={ro} onChange={p => update('PREPS_CONTROL', i, p)} />
              </td>
              <td className="px-2 py-1 w-44">
                <input value={r.classLabel ?? ''} disabled={ro} onChange={e => update('PREPS_CONTROL', i, { classLabel: e.target.value || null })} placeholder="e.g. Form 3" className={inp} />
              </td>
            </>
          ))}
          {sectionCard('COORDINATORS', ['Block / area', 'Covers', 'Coordinator'], (r, i) => (
            <>
              <td className="px-2 py-1 w-48">
                <input value={r.zone ?? ''} disabled={ro} onChange={e => update('COORDINATORS', i, { zone: e.target.value || null })} placeholder="e.g. BETA BLOCK" className={inp} />
              </td>
              <td className="px-2 py-1 w-56">
                <input value={r.position ?? ''} disabled={ro} onChange={e => update('COORDINATORS', i, { position: e.target.value || null })} placeholder="e.g. Form 3, 4 and 5" className={inp} />
              </td>
              <td className="px-2 py-1">
                <AssigneePicker row={r} staff={staff} disabled={ro} onChange={p => update('COORDINATORS', i, p)} />
              </td>
            </>
          ))}
          {sectionCard('ZONES', ['Time', 'Zone', 'Position', 'Discipline master', 'Activity'], (r, i) => (
            <>
              <td className="px-2 py-1 w-40">
                <textarea rows={2} value={r.timeLabel ?? ''} disabled={ro} onChange={e => update('ZONES', i, { timeLabel: e.target.value || null })} placeholder="6:30 am to 7:30 am" className={inp} />
              </td>
              <td className="px-2 py-1 w-40">
                <input value={r.zone ?? ''} disabled={ro} onChange={e => update('ZONES', i, { zone: e.target.value || null })} placeholder="e.g. FIRST GATE" className={inp} />
              </td>
              <td className="px-2 py-1 w-40">
                <input value={r.position ?? ''} disabled={ro} onChange={e => update('ZONES', i, { position: e.target.value || null })} placeholder="e.g. Main school gate" className={inp} />
              </td>
              <td className="px-2 py-1">
                <AssigneePicker row={r} staff={staff} disabled={ro} onChange={p => update('ZONES', i, p)} />
              </td>
              <td className="px-2 py-1 w-64">
                <textarea rows={2} value={r.activity ?? ''} disabled={ro} onChange={e => update('ZONES', i, { activity: e.target.value || null })} placeholder="e.g. Checking uniformity" className={inp} />
              </td>
            </>
          ))}
          <p className="text-xs text-gray-500">
            Leave a time, zone, activity, week or day blank to mean “same as the row above”: those rows print as one merged cell, like
            the paper roster. Use ↑ ↓ to order rows.
          </p>
        </div>
      )}
    </div>
  );
}
