'use client';

import Link from 'next/link';
import { AcademicCapIcon } from '@heroicons/react/24/outline';
import { useDepartmentStatus, pctColor } from '../lib/useDepartmentStatus';
import { DeptPageShell } from '../lib/DeptPageShell';

// HOD Curriculum: scheme-of-work coverage for every subject x class the
// department teaches (lessons with a COMPLETED logbook entry / all lessons),
// including classes that are timetabled but have no scheme yet.
export default function HodCurriculumPage() {
  const { data, loading, error, reload } = useDepartmentStatus();
  const rows = data?.schemeCoverage ?? [];
  const missing = rows.filter((r) => r.schemeId === null).length;

  return (
    <DeptPageShell
      title="Curriculum"
      subtitle="Scheme-of-work coverage for your department"
      icon={<AcademicCapIcon className="w-6 h-6" />}
      data={data}
      loading={loading}
      error={error}
      reload={reload}
    >
      {missing > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          {missing} subject/class combination{missing === 1 ? ' is' : 's are'} timetabled without a scheme of work.
        </div>
      )}
      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No schemes of work or timetabled classes for your subjects yet.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Subject</th>
                <th className="px-3 py-2 text-left">Class</th>
                <th className="px-3 py-2 text-left">Teachers</th>
                <th className="px-3 py-2 text-right">Lessons done / total</th>
                <th className="px-3 py-2 text-right">Coverage</th>
                <th className="px-3 py-2 text-right">Scheme</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={`${r.subjectId}-${r.classId}`}>
                  <td className="px-3 py-2 font-medium text-gray-900">{r.subjectName}</td>
                  <td className="px-3 py-2 text-gray-700">{r.className}</td>
                  <td className="px-3 py-2 text-gray-700">{r.teachers.join(', ') || '—'}</td>
                  <td className="px-3 py-2 text-right">
                    {r.schemeId === null ? '—' : `${r.completedLessons} / ${r.totalLessons}`}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.schemeId === null ? (
                      <span className="inline-block px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">No scheme</span>
                    ) : (
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${pctColor(r.coveragePercent)}`}>
                        {r.coveragePercent}%
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.schemeId !== null ? (
                      <Link href={`/dashboard/hod/schemes-of-work/${r.schemeId}`} className="text-blue-600 hover:underline">
                        Open
                      </Link>
                    ) : (
                      <Link href="/dashboard/hod/schemes-of-work" className="text-blue-600 hover:underline">
                        Create
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DeptPageShell>
  );
}
