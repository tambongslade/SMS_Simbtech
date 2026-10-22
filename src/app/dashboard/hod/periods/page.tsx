'use client';

import { CalendarIcon } from '@heroicons/react/24/outline';
import { useDepartmentStatus, pctColor } from '../lib/useDepartmentStatus';
import { DeptPageShell } from '../lib/DeptPageShell';

// HOD Period Tracking: each department teacher's weekly load (from the
// timetable) and how many lessons they have logged in the logbook.
export default function HodPeriodTrackingPage() {
  const { data, loading, error, reload } = useDepartmentStatus();
  const rows = data?.teachers ?? [];

  return (
    <DeptPageShell
      title="Period Tracking"
      subtitle="Weekly teaching load and logbook activity for your department"
      icon={<CalendarIcon className="w-6 h-6" />}
      data={data}
      loading={loading}
      error={error}
      reload={reload}
    >
      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No teachers are timetabled or assigned to your subjects yet.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Teacher</th>
                <th className="px-3 py-2 text-left">Subjects</th>
                <th className="px-3 py-2 text-right">Streams</th>
                <th className="px-3 py-2 text-right">Dept. periods / week</th>
                <th className="px-3 py-2 text-right">All periods / week</th>
                <th className="px-3 py-2 text-right">Hours / week</th>
                <th className="px-3 py-2 text-right">Logged (7 days)</th>
                <th className="px-3 py-2 text-right">Logged (year)</th>
                <th className="px-3 py-2 text-left">Last logged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{r.name}</div>
                    {r.matricule && <div className="text-xs text-gray-500">{r.matricule}</div>}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{r.subjects.join(', ') || '—'}</td>
                  <td className="px-3 py-2 text-right">{r.subClassCount}</td>
                  <td className="px-3 py-2 text-right font-medium">{r.departmentPeriodsPerWeek}</td>
                  <td className="px-3 py-2 text-right">{r.totalPeriodsPerWeek}</td>
                  <td className="px-3 py-2 text-right">{r.totalHoursPerWeek}</td>
                  <td className="px-3 py-2 text-right">
                    {r.logbookEntriesLast7Days}
                    {r.logbookRateLast7Days !== null && (
                      <span className={`ml-2 inline-block px-1.5 py-0.5 rounded text-xs ${pctColor(r.logbookRateLast7Days)}`}>
                        {r.logbookRateLast7Days}%
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">{r.logbookEntriesThisYear}</td>
                  <td className="px-3 py-2 text-gray-700">{r.lastLogbookDate ? r.lastLogbookDate.slice(0, 10) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-gray-500">
        &quot;Logged (7 days)&quot; counts logbook entries in the last 7 days against the teacher&apos;s department periods per week.
      </p>
    </DeptPageShell>
  );
}
