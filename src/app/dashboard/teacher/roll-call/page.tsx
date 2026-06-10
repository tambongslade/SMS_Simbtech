'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import { ClipboardDocumentCheckIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Button, Card, CardBody, Badge, Modal } from '@/components/ui';
import apiService from '@/lib/apiService';
import { PeriodRollCall } from '@/components/discipline/PeriodRollCall';

// One assigned slot in the teacher's timetable. teacherPeriodId is the key the
// in-class roll-call endpoint expects; we fall back to the row id defensively.
interface TimeSlot {
  id: number;
  teacherPeriodId?: number;
  subClassId: number;
  period: { id: number; dayOfWeek: string; startTime: string; endTime: string; isBreak: boolean; name: string };
  subject: { id: number; name: string };
  subClass: { id: number; name: string; class?: { id: number; name: string } };
}

interface TimetableResponse {
  success: boolean;
  data: { schedule: TimeSlot[] };
}

const todayName = () => new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
const nowHHMM = () => new Date().toTimeString().slice(0, 5);

export default function TeacherRollCallPage() {
  const [selected, setSelected] = useState<TimeSlot | null>(null);

  const { data, error, isLoading } = useSWR<TimetableResponse>(
    '/teachers/me/timetable',
    (url: string) => apiService.get(url),
  );

  if (error) {
    toast.error('Failed to load your timetable.');
  }

  const today = todayName();
  const now = nowHHMM();

  const todaysPeriods = useMemo(() => {
    const schedule = data?.data?.schedule || [];
    return schedule
      .filter((s) => s.period?.dayOfWeek === today && !s.period?.isBreak)
      .sort((a, b) => (a.period.startTime || '').localeCompare(b.period.startTime || ''));
  }, [data, today]);

  const teacherPeriodIdOf = (s: TimeSlot) => s.teacherPeriodId ?? s.id;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="h-7 w-7 text-blue-600" />
            In-Class Roll Call
          </h1>
          <p className="text-gray-600 mt-1">
            Today is <span className="font-medium capitalize">{today.toLowerCase()}</span>. Pick a period to mark
            students present or absent. Everyone defaults to present — only tap the ones who are missing.
          </p>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
            Loading your periods…
          </div>
        ) : todaysPeriods.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
            You have no classes scheduled for today.
          </div>
        ) : (
          <div className="space-y-3">
            {todaysPeriods.map((s) => {
              const isNow = s.period.startTime <= now && now <= s.period.endTime;
              return (
                <Card key={s.id}>
                  <CardBody>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{s.subject?.name}</span>
                          {isNow && <Badge color="green">Now</Badge>}
                        </div>
                        <div className="text-sm text-gray-600 mt-0.5">
                          {s.subClass?.class?.name ? `${s.subClass.class.name} · ` : ''}
                          {s.subClass?.name}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <ClockIcon className="h-3.5 w-3.5" />
                          {s.period.name} · {s.period.startTime}–{s.period.endTime}
                        </div>
                      </div>
                      <Button
                        color="primary"
                        size="sm"
                        leftIcon={ClipboardDocumentCheckIcon}
                        onClick={() => setSelected(s)}
                      >
                        Take Roll Call
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={
          selected
            ? `Roll Call — ${selected.subject?.name} · ${selected.subClass?.name}`
            : 'Roll Call'
        }
        size="lg"
      >
        {selected && (
          <PeriodRollCall
            teacherPeriodId={teacherPeriodIdOf(selected)}
            onSaved={() => setSelected(null)}
          />
        )}
      </Modal>
    </div>
  );
}
