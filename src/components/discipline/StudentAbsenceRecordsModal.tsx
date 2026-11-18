'use client';

// Card listing one student's absence records in a date range: the day, the exact
// time each was recorded, by whom, and how (roll call / period). Used by the
// Statistics page (Class Absences list) and the sub-class student list.

import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline';
import { Modal } from '@/components/ui';
import { apiService } from '@/lib/apiService';

interface AbsenceRecord {
  id: number;
  date: string;
  recordedAt: string;
  recordedBy: string | null;
  source: string;
  period: string | null;
  subject: string | null;
  periods: number;
  justified: boolean;
  justifiedBy: string | null;
  justifiedAt: string | null;
  reason: string | null;
}
interface RecordsData {
  range: { from: string; to: string };
  student: { id: number; name: string; matricule: string | null; className: string; subClassName: string };
  records: AbsenceRecord[];
}

const SCHOOL_TZ = 'Africa/Douala';
const fmtDay = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const fmtStamp = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: SCHOOL_TZ });

export default function StudentAbsenceRecordsModal({
  studentId,
  from,
  to,
  academicYearId,
  type = 'CLASS_ABSENCE',
  onClose,
}: {
  studentId: number | null;
  from: string;
  to: string;
  academicYearId?: number;
  type?: 'CLASS_ABSENCE' | 'MORNING_LATENESS';
  onClose: () => void;
}) {
  const [data, setData] = useState<RecordsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    setData(null);
    setError(null);
    const qs = new URLSearchParams({ from, to, type });
    if (academicYearId) qs.set('academicYearId', String(academicYearId));
    apiService
      .get<{ data: RecordsData }>(`/super-manager/overview/statistics-report/student/${studentId}/absences?${qs.toString()}`)
      .then(r => !cancelled && setData(r.data))
      .catch(e => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load the absences.'));
    return () => {
      cancelled = true;
    };
  }, [studentId, from, to, type, academicYearId]);

  const label = type === 'MORNING_LATENESS' ? 'lateness' : 'absence';
  const unjustified = (data?.records ?? []).filter(r => !r.justified);
  const periods = unjustified.reduce((n, r) => n + r.periods, 0);

  return (
    <Modal isOpen={studentId != null} onClose={onClose} title={data ? data.student.name : 'Absences'} size="lg">
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !data ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
            <span>{data.student.matricule ?? '—'}</span>
            <span>{data.student.className} · {data.student.subClassName}</span>
            <span>{data.range.from === data.range.to ? data.range.from : `${data.range.from} → ${data.range.to}`}</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-gray-100 px-2 py-0.5">{data.records.length} {label} record{data.records.length === 1 ? '' : 's'}</span>
            <span className="rounded-full bg-red-50 text-red-700 px-2 py-0.5">{unjustified.length} not justified</span>
            {type === 'CLASS_ABSENCE' && <span className="rounded-full bg-red-50 text-red-700 px-2 py-0.5">{periods} period{periods === 1 ? '' : 's'} missed</span>}
          </div>
          {data.records.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No {label} recorded in this range.</p>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto border rounded-lg">
              {data.records.map(r => (
                <li key={r.id} className={`px-3 py-2.5 ${r.justified ? 'bg-green-50/50' : ''}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold text-gray-900">{fmtDay(r.date)}</span>
                    {r.justified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                        <CheckCircleIcon className="w-3.5 h-3.5" /> Justified
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-red-600">Not justified</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-sm text-gray-700">
                    {r.source}
                    {r.period ? ` · ${r.period}` : ''}
                    {r.subject ? ` · ${r.subject}` : ''}
                    {type === 'CLASS_ABSENCE' && r.periods !== 1 ? ` · ${r.periods} periods` : ''}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <ClockIcon className="w-3.5 h-3.5" /> Recorded {fmtStamp(r.recordedAt)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <UserIcon className="w-3.5 h-3.5" /> by {r.recordedBy ?? 'unknown'}
                    </span>
                  </div>
                  {r.justified && (
                    <div className="mt-0.5 text-xs text-green-800">
                      {r.reason ? `“${r.reason}”` : 'Justified'}
                      {r.justifiedBy ? ` · ${r.justifiedBy}` : ''}
                      {r.justifiedAt ? ` · ${fmtStamp(r.justifiedAt)}` : ''}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-gray-400">Times are Cameroon time.</p>
        </div>
      )}
    </Modal>
  );
}
