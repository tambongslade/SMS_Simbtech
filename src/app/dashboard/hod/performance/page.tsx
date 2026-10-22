'use client';

import { useEffect, useState } from 'react';
import { DocumentChartBarIcon } from '@heroicons/react/24/outline';
import { apiService } from '@/lib/apiService';
import { useAuth } from '@/components/context/AuthContext';
import { useDepartmentStatus, pctColor } from '../lib/useDepartmentStatus';
import { DeptPageShell } from '../lib/DeptPageShell';

// HOD Performance: marks-entry status for the current sequence (from
// GET /hod/department-status) and per-subject results (GET /hod/subject-performance),
// both scoped to the HOD's department.

interface SubjectPerformance {
  subjectId: number;
  subjectName: string;
  totalStudents: number;
  totalClasses: number;
  averageMarks: number;
  passRate: number;
  excellentRate: number;
}

export default function HodPerformancePage() {
  const { data, loading, error, reload } = useDepartmentStatus();
  const { selectedAcademicYear, currentAcademicYear } = useAuth();
  const yearId = (selectedAcademicYear ?? currentAcademicYear)?.id;
  const [perf, setPerf] = useState<SubjectPerformance[] | null>(null);

  useEffect(() => {
    const qs = yearId ? `?academicYearId=${yearId}` : '';
    apiService
      .get<{ data: SubjectPerformance[] }>(`/hod/subject-performance${qs}`, { silent: true })
      .then((r) => setPerf(Array.isArray(r.data) ? r.data : []))
      .catch(() => setPerf([]));
  }, [yearId]);

  const seq = data?.marksStatus.sequence;
  const rows = data?.marksStatus.rows ?? [];
  const totalStudents = rows.reduce((s, r) => s + r.students, 0);
  const totalEntered = rows.reduce((s, r) => s + Math.min(r.marksEntered, r.students), 0);
  const overall = totalStudents > 0 ? Math.round((totalEntered / totalStudents) * 1000) / 10 : 0;

  return (
    <DeptPageShell
      title="Performance"
      subtitle="Marks-entry status and results for your department"
      icon={<DocumentChartBarIcon className="w-6 h-6" />}
      data={data}
      loading={loading}
      error={error}
      reload={reload}
    >
      <section className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-gray-900">Marks entry</h2>
          {seq ? (
            <span className="text-sm text-gray-600">
              Sequence {seq.sequenceNumber}
              {seq.term ? ` · ${seq.term.name}` : ''} · {seq.status}
              {seq.submissionDeadline ? ` · deadline ${seq.submissionDeadline.slice(0, 10)}` : ''} ·{' '}
              <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${pctColor(overall)}`}>{overall}% entered</span>
            </span>
          ) : (
            <span className="text-sm text-gray-500">No exam sequence for this academic year yet.</span>
          )}
        </div>
        {seq && (
          <div className="overflow-x-auto">
            {rows.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No streams take your subjects.</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Subject</th>
                    <th className="px-3 py-2 text-left">Stream</th>
                    <th className="px-3 py-2 text-left">Teacher(s)</th>
                    <th className="px-3 py-2 text-right">Marks / students</th>
                    <th className="px-3 py-2 text-right">Entered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => (
                    <tr key={r.subClassSubjectId}>
                      <td className="px-3 py-2 font-medium text-gray-900">{r.subjectName}</td>
                      <td className="px-3 py-2 text-gray-700">{r.subClassName}</td>
                      <td className="px-3 py-2 text-gray-700">{r.teachers.join(', ') || '—'}</td>
                      <td className="px-3 py-2 text-right">
                        {r.marksEntered} / {r.students}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${pctColor(r.percentEntered)}`}>
                          {r.percentEntered}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Results by subject</h2>
        </div>
        {perf === null ? (
          <div className="p-6 text-center text-gray-500">Loading…</div>
        ) : perf.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No marks recorded for your subjects yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">Subject</th>
                  <th className="px-3 py-2 text-right">Streams</th>
                  <th className="px-3 py-2 text-right">Students</th>
                  <th className="px-3 py-2 text-right">Average /20</th>
                  <th className="px-3 py-2 text-right">Pass rate</th>
                  <th className="px-3 py-2 text-right">≥ 16</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {perf.map((p) => (
                  <tr key={p.subjectId}>
                    <td className="px-3 py-2 font-medium text-gray-900">{p.subjectName}</td>
                    <td className="px-3 py-2 text-right">{p.totalClasses}</td>
                    <td className="px-3 py-2 text-right">{p.totalStudents}</td>
                    <td className="px-3 py-2 text-right">{Number(p.averageMarks ?? 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{Number(p.passRate ?? 0).toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right">{Number(p.excellentRate ?? 0).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DeptPageShell>
  );
}
