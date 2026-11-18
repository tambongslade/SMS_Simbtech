'use client';

// Statistics > Class Attendance > a class > a sub-class: every student of the
// sub-class with their discipline figures for the same date range. Clicking a
// student opens the card with each absence (when recorded, by whom).
// Re-exported under each role that has the Statistics page.

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { apiService } from '@/lib/apiService';
import { Card } from '@/components/ui/Card';
import StudentAbsenceRecordsModal from '@/components/discipline/StudentAbsenceRecordsModal';

interface StudentStats {
  studentId: number;
  studentName: string;
  matricule: string | null;
  rollCallsPresent: number;
  rollCallsLate: number;
  rollCallsAbsent: number;
  classAbsences: number;
  justifiedAbsences: number;
  lateness: number;
  sanctions: number;
  attendancePercent: number | null;
}
interface SubClassStats {
  range: { from: string; to: string };
  subClass: { id: number; name: string; className: string };
  students: StudentStats[];
}

type SortKey = 'name' | 'classAbsences' | 'attendance' | 'lateness';

export default function SubClassStatisticsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm text-gray-500">Loading…</div>}>
      <SubClassStatistics />
    </Suspense>
  );
}

function SubClassStatistics() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { selectedAcademicYear } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const from = search.get('from') || today;
  const to = search.get('to') || today;
  const [data, setData] = useState<SubClassStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [openStudent, setOpenStudent] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({ from, to });
    if (selectedAcademicYear?.id) qs.set('academicYearId', String(selectedAcademicYear.id));
    apiService
      .get<{ data: SubClassStats }>(`/super-manager/overview/statistics-report/sub-class/${params.id}?${qs.toString()}`)
      .then(r => !cancelled && setData(r.data))
      .catch(e => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load the class.'));
    return () => {
      cancelled = true;
    };
  }, [params.id, from, to, selectedAcademicYear?.id]);

  const rows = useMemo(() => {
    let list = data?.students ?? [];
    const q = filter.trim().toLowerCase();
    if (q) list = list.filter(s => `${s.studentName} ${s.matricule ?? ''}`.toLowerCase().includes(q));
    const by: Record<SortKey, (a: StudentStats, b: StudentStats) => number> = {
      name: (a, b) => a.studentName.localeCompare(b.studentName),
      classAbsences: (a, b) => b.classAbsences - a.classAbsences || a.studentName.localeCompare(b.studentName),
      attendance: (a, b) => (a.attendancePercent ?? 101) - (b.attendancePercent ?? 101),
      lateness: (a, b) => b.lateness - a.lateness || a.studentName.localeCompare(b.studentName),
    };
    return [...list].sort(by[sort]);
  }, [data, filter, sort]);

  const totals = useMemo(() => {
    const s = data?.students ?? [];
    const sum = (k: keyof StudentStats) => s.reduce((n, x) => n + (Number(x[k]) || 0), 0);
    const marks = sum('rollCallsPresent') + sum('rollCallsLate') + sum('rollCallsAbsent');
    return {
      students: s.length,
      present: sum('rollCallsPresent'),
      late: sum('rollCallsLate'),
      absent: sum('rollCallsAbsent'),
      classAbsences: sum('classAbsences'),
      lateness: sum('lateness'),
      sanctions: sum('sanctions'),
      pct: marks ? Math.round(((sum('rollCallsPresent') + sum('rollCallsLate')) / marks) * 1000) / 10 : null,
    };
  }, [data]);

  const statisticsHref = (pathname ?? '').replace(/\/sub-class\/[^/]+\/?$/, '');
  const th = (key: SortKey | null, label: string, right = true) => (
    <th
      className={`py-1.5 px-2 whitespace-nowrap ${right ? 'text-right' : 'text-left'} ${key ? 'cursor-pointer hover:text-gray-800' : ''} ${key && sort === key ? 'text-blue-700' : ''}`}
      onClick={key ? () => setSort(key) : undefined}
    >
      {label}
      {key && sort === key ? ' ▾' : ''}
    </th>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-4">
      <button onClick={() => router.push(statisticsHref || '/dashboard')} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
        <ArrowLeftIcon className="w-4 h-4" /> Back to Statistics
      </button>

      {error && <Card className="p-4 bg-red-50 border-red-200 text-red-800 text-sm">{error}</Card>}

      {!data && !error ? (
        <Card className="p-6 text-center text-sm text-gray-500">Loading…</Card>
      ) : data ? (
        <>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {data.subClass.className} · {data.subClass.name}
            </h1>
            <p className="text-sm text-gray-600">
              Students and their discipline figures · {data.range.from === data.range.to ? data.range.from : `${data.range.from} → ${data.range.to}`}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-sm">
            {[
              ['Students', totals.students, 'bg-gray-50 text-gray-800'],
              ['Roll-call attendance', totals.pct == null ? '—' : `${totals.pct}%`, 'bg-blue-50 text-blue-900'],
              ['Present marks', totals.present, 'bg-green-50 text-green-800'],
              ['Late marks', totals.late, 'bg-yellow-50 text-yellow-800'],
              ['Absent marks', totals.absent, 'bg-red-50 text-red-800'],
              ['Absence periods', totals.classAbsences, 'bg-red-50 text-red-800'],
              ['Sanctions', totals.sanctions, 'bg-purple-50 text-purple-800'],
            ].map(([label, value, cls]) => (
              <div key={String(label)} className={`rounded-lg px-3 py-2 ${cls}`}>
                <div className="text-[11px] uppercase tracking-wide opacity-80">{label}</div>
                <div className="text-lg font-bold">{value}</div>
              </div>
            ))}
          </div>

          <Card className="p-4">
            <div className="relative mb-3 sm:w-72">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Search a student"
                className="w-full rounded border border-gray-300 pl-7 pr-2 py-1.5 text-sm"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="text-[11px] uppercase text-gray-500 bg-gray-50 border-b">
                  <tr>
                    <th className="py-1.5 px-2 text-left w-8">#</th>
                    {th('name', 'Student', false)}
                    {th(null, 'Matricule', false)}
                    {th(null, 'Present')}
                    {th(null, 'Late')}
                    {th(null, 'Absent')}
                    {th('attendance', 'Attendance')}
                    {th('classAbsences', 'Absence periods')}
                    {th(null, 'Justified')}
                    {th('lateness', 'Lateness')}
                    {th(null, 'Sanctions')}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={11} className="py-4 text-center text-gray-400">No students.</td></tr>
                  ) : (
                    rows.map((s, i) => (
                      <tr
                        key={s.studentId}
                        onClick={() => setOpenStudent(s.studentId)}
                        className="border-b last:border-none hover:bg-blue-50 cursor-pointer"
                        title="Click to see each absence"
                      >
                        <td className="py-1.5 px-2 text-gray-400">{i + 1}</td>
                        <td className="py-1.5 px-2 font-medium text-gray-900 whitespace-nowrap">{s.studentName}</td>
                        <td className="py-1.5 px-2 text-gray-500 whitespace-nowrap">{s.matricule ?? '—'}</td>
                        <td className="py-1.5 px-2 text-right text-green-700">{s.rollCallsPresent}</td>
                        <td className="py-1.5 px-2 text-right text-yellow-700">{s.rollCallsLate || ''}</td>
                        <td className="py-1.5 px-2 text-right text-red-700">{s.rollCallsAbsent || ''}</td>
                        <td className={`py-1.5 px-2 text-right font-semibold ${s.attendancePercent == null ? 'text-gray-300' : s.attendancePercent >= 90 ? 'text-green-700' : s.attendancePercent >= 75 ? 'text-yellow-700' : 'text-red-700'}`}>
                          {s.attendancePercent == null ? '—' : `${s.attendancePercent}%`}
                        </td>
                        <td className="py-1.5 px-2 text-right font-semibold text-red-700">{s.classAbsences || ''}</td>
                        <td className="py-1.5 px-2 text-right text-green-700">{s.justifiedAbsences || ''}</td>
                        <td className="py-1.5 px-2 text-right">{s.lateness || ''}</td>
                        <td className="py-1.5 px-2 text-right">{s.sanctions || ''}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-gray-500">
              Present / Late / Absent = roll-call marks. Attendance = present or late out of all marks. Absence periods = periods missed (not
              justified), as in the Class Absences list. Click a student to see each absence.
            </p>
          </Card>
        </>
      ) : null}

      <StudentAbsenceRecordsModal
        studentId={openStudent}
        from={from}
        to={to}
        academicYearId={selectedAcademicYear?.id}
        onClose={() => setOpenStudent(null)}
      />
    </div>
  );
}
