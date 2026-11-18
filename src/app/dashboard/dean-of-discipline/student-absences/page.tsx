'use client';

// Student Absences (Deans of Discipline): pick a student of your sector, see their
// absences and justify them. The landing list shows the sector's students with
// absences still to justify; a class can be picked, or a student searched.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon, CheckCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import apiService from '@/lib/apiService';

interface SectorClass { id: number; name: string; classId: number; className: string }
interface StudentRow { studentId: number; name: string; matricule: string; subClassName: string; className: string; total: number; unjustified: number }
interface AbsenceRow {
  id: number;
  date: string;
  type: 'CLASS_ABSENCE' | 'MORNING_LATENESS';
  when: string;
  subject: string | null;
  recordedBy: string | null;
  justified: boolean;
  justifiedAt: string | null;
  justifiedBy: string | null;
  reason: string | null;
}
interface StudentAbsences {
  student: { id: number; name: string; matricule: string; className: string; subClassName: string };
  total: number;
  unjustified: number;
  absences: AbsenceRow[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const niceDate = (iso: string) => `${DAYS[new Date(`${iso}T00:00:00`).getDay()]} ${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export default function StudentAbsencesPage() {
  const [sector, setSector] = useState<SectorClass[] | null>(null);
  const [subClassId, setSubClassId] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [detail, setDetail] = useState<StudentAbsences | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiService
      .get<{ data: SectorClass[] }>('/dean-absences/sub-classes')
      .then(r => setSector(r.data))
      .catch(e => {
        setSector([]);
        toast.error(e instanceof Error ? e.message : 'Failed to load your classes.');
      });
  }, []);

  const loadStudents = useCallback(async () => {
    setLoadingList(true);
    try {
      const qs = new URLSearchParams();
      if (subClassId) qs.set('subClassId', String(subClassId));
      if (search.trim().length >= 2) qs.set('search', search.trim());
      const r = await apiService.get<{ data: StudentRow[] }>(`/dean-absences/students?${qs.toString()}`);
      setStudents(r.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load students.');
    } finally {
      setLoadingList(false);
    }
  }, [subClassId, search]);

  useEffect(() => {
    const t = setTimeout(loadStudents, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadStudents, search]);

  const loadDetail = useCallback(async (id: number) => {
    try {
      const r = await apiService.get<{ data: StudentAbsences }>(`/dean-absences/student/${id}`);
      setDetail(r.data);
      setPicked(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load absences.');
    }
  }, []);

  useEffect(() => {
    if (studentId) loadDetail(studentId);
    else setDetail(null);
  }, [studentId, loadDetail]);

  const groups = useMemo(() => {
    const m = new Map<string, SectorClass[]>();
    (sector ?? []).forEach(s => m.set(s.className, [...(m.get(s.className) ?? []), s]));
    return Array.from(m.entries());
  }, [sector]);

  const unjustifiedIds = (detail?.absences ?? []).filter(a => !a.justified).map(a => a.id);
  const allPicked = unjustifiedIds.length > 0 && unjustifiedIds.every(id => picked.has(id));

  const justify = async () => {
    if (!picked.size) return;
    if (!reason.trim()) {
      toast.error('Give the reason for the justification.');
      return;
    }
    setSaving(true);
    try {
      const r = await apiService.post<{ data: { justified: number; withdrawnWarnings: number; cancelledSummons: number } }>('/dean-absences/justify', {
        absenceIds: Array.from(picked),
        reason: reason.trim(),
      });
      const extra = [
        r.data.withdrawnWarnings ? `${r.data.withdrawnWarnings} warning(s) withdrawn` : '',
        r.data.cancelledSummons ? `${r.data.cancelledSummons} summons cancelled` : '',
      ].filter(Boolean).join(', ');
      toast.success(`${r.data.justified} absence${r.data.justified === 1 ? '' : 's'} justified${extra ? ` · ${extra}` : ''}.`);
      setReason('');
      if (studentId) await loadDetail(studentId);
      loadStudents();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to justify.');
    } finally {
      setSaving(false);
    }
  };

  const sectorLabel = groups.map(([c]) => c).join(', ');

  // ---- One student's absences ----
  if (studentId) {
    return (
      <div className="p-3 md:p-4 space-y-3 w-full max-w-5xl">
        <button onClick={() => setStudentId(null)} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <ArrowLeftIcon className="w-4 h-4" /> Back to the list
        </button>
        {!detail ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400">Loading…</div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-center gap-4">
              <div className="mr-auto">
                <h1 className="text-lg font-bold text-gray-900">{detail.student.name}</h1>
                <p className="text-sm text-gray-500">
                  {detail.student.matricule} · {detail.student.className} {detail.student.subClassName}
                </p>
              </div>
              <div className="text-center px-3">
                <div className="text-2xl font-bold text-gray-900">{detail.total}</div>
                <div className="text-xs text-gray-500">absences</div>
              </div>
              <div className="text-center px-3">
                <div className="text-2xl font-bold text-red-600">{detail.unjustified}</div>
                <div className="text-xs text-gray-500">not justified</div>
              </div>
              <div className="text-center px-3">
                <div className="text-2xl font-bold text-green-600">{detail.total - detail.unjustified}</div>
                <div className="text-xs text-gray-500">justified</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-3 py-2 w-8">
                      <input
                        type="checkbox"
                        checked={allPicked}
                        disabled={!unjustifiedIds.length}
                        onChange={() => setPicked(allPicked ? new Set() : new Set(unjustifiedIds))}
                        aria-label="Select all not justified"
                      />
                    </th>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">When</th>
                    <th className="px-3 py-2 text-left">Recorded by</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detail.absences.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">No absences this year.</td></tr>
                  ) : (
                    detail.absences.map(a => (
                      <tr key={a.id} className={a.justified ? 'bg-green-50/40' : picked.has(a.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                        <td className="px-3 py-2">
                          {!a.justified && (
                            <input
                              type="checkbox"
                              checked={picked.has(a.id)}
                              onChange={() =>
                                setPicked(prev => {
                                  const n = new Set(prev);
                                  if (n.has(a.id)) n.delete(a.id); else n.add(a.id);
                                  return n;
                                })
                              }
                              aria-label={`Select absence of ${a.date}`}
                            />
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap font-medium">{niceDate(a.date)}</td>
                        <td className="px-3 py-2 text-gray-600">
                          {a.type === 'MORNING_LATENESS' ? 'Morning lateness' : a.when || 'Absence'}
                          {a.subject && <span className="text-gray-400"> · {a.subject}</span>}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{a.recordedBy ?? '—'}</td>
                        <td className="px-3 py-2">
                          {a.justified ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                                <CheckCircleIcon className="w-4 h-4" /> Justified
                              </span>
                              <div className="text-xs text-gray-500">
                                {a.reason ? `“${a.reason}”` : ''}
                                {a.justifiedBy ? ` · ${a.justifiedBy}` : ''}
                                {a.justifiedAt ? ` · ${a.justifiedAt.slice(0, 10)}` : ''}
                              </div>
                            </div>
                          ) : (
                            <span className="text-red-600 font-medium">Not justified</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {unjustifiedIds.length > 0 && (
              <div className="sticky bottom-0 bg-white/95 backdrop-blur border rounded-lg shadow p-3 flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-700">
                  {picked.size} selected
                </span>
                <input
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Reason, e.g. medical certificate, parent came"
                  className="flex-1 min-w-[220px] rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
                <button
                  onClick={justify}
                  disabled={!picked.size || !reason.trim() || saving}
                  className="px-4 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                >
                  {saving ? 'Saving…' : `Justify ${picked.size || ''}`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ---- Student list ----
  return (
    <div className="p-3 md:p-4 space-y-3 w-full max-w-5xl">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Student Absences</h1>
        <p className="text-sm text-gray-500">
          {sector === null ? 'Loading your sector…' : sector.length ? `Your sector: ${sectorLabel}` : ''}
        </p>
      </div>

      {sector !== null && sector.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-sm text-gray-600">
          No classes are assigned to you yet. The Super Manager assigns each Dean of Discipline their classes.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow px-3 py-2 flex flex-wrap items-center gap-2">
            <select
              value={subClassId}
              onChange={e => {
                setSubClassId(e.target.value ? Number(e.target.value) : '');
                setSearch('');
              }}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
            >
              <option value="">Students with absences to justify</option>
              {groups.map(([className, list]) => (
                <optgroup key={className} label={className}>
                  {list.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="relative flex-1 min-w-[200px]">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search a student by name or matricule"
                className="w-full rounded border border-gray-300 pl-7 pr-2 py-1.5 text-sm"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">Student</th>
                  <th className="px-3 py-2 text-left">Class</th>
                  <th className="px-3 py-2 text-right">Absences</th>
                  <th className="px-3 py-2 text-right">Not justified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingList && students.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">Loading…</td></tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                      {subClassId || search.trim().length >= 2 ? 'No students found.' : 'No absences waiting to be justified in your sector.'}
                    </td>
                  </tr>
                ) : (
                  students.map(s => (
                    <tr key={s.studentId} onClick={() => setStudentId(s.studentId)} className="cursor-pointer hover:bg-blue-50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-500">{s.matricule}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{s.subClassName}</td>
                      <td className="px-3 py-2 text-right">{s.total}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${s.unjustified ? 'text-red-600' : 'text-green-600'}`}>{s.unjustified || 'None'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">Click a student to see their absences and justify them.</p>
        </>
      )}
    </div>
  );
}
