'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Modal } from '@/components/ui';
import { useLanguage } from '@/components/context/LanguageContext';
import {
  type OverviewSlot,
  type TeacherAttendanceStatus,
  deleteTeacherAttendance,
  saveTeacherAttendanceDay,
  updateTeacherAttendance,
} from '@/lib/teacherAttendanceApi';

export interface EditTarget {
  slot: OverviewSlot;
  date: string; // YYYY-MM-DD
  dayLabel: string;
  periodLabel: string;
  className: string;
  /** The saved record, if attendance was already taken for this period. */
  existing?: { id: number; status: TeacherAttendanceStatus; reason?: string | null; recordedBy?: { name: string } | null };
}

interface Props {
  target: EditTarget | null;
  academicYearId?: number;
  onClose: () => void;
  /** Called after a successful save/remove so the page can reload its data. */
  onSaved: () => void;
}

// Click a cell to correct a teacher's attendance for that one period and day.
export default function EditAttendanceModal({ target, academicYearId, onClose, onSaved }: Props) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<TeacherAttendanceStatus>('PRESENT');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null);

  useEffect(() => {
    if (!target) return;
    setStatus(target.existing?.status ?? 'PRESENT');
    setReason(target.existing?.reason ?? '');
    setBusy(null);
  }, [target]);

  if (!target) return null;
  const { slot, existing } = target;

  const options: { value: TeacherAttendanceStatus; label: string; active: string; idle: string }[] = [
    { value: 'PRESENT', label: t('Present'), active: 'bg-green-600 text-white', idle: 'bg-green-50 text-green-700 hover:bg-green-100' },
    { value: 'LATE', label: t('Late'), active: 'bg-yellow-500 text-white', idle: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
    { value: 'ABSENT', label: t('Absent'), active: 'bg-red-600 text-white', idle: 'bg-red-50 text-red-700 hover:bg-red-100' },
  ];

  const cleanReason = status === 'PRESENT' ? '' : reason.trim();
  const unchanged = !!existing && existing.status === status && (existing.reason ?? '') === cleanReason;

  const fail = (error: unknown, fallback: string) =>
    toast.error(error instanceof Error && error.message ? error.message : fallback);

  const save = async () => {
    setBusy('save');
    try {
      if (existing) {
        // Only status + reason are sent, so the conduct checks a discipline master ticked are kept.
        await updateTeacherAttendance(existing.id, { status, reason: cleanReason });
      } else {
        await saveTeacherAttendanceDay({
          date: target.date,
          academicYearId,
          entries: [
            {
              teacherPeriodId: slot.id,
              status,
              wellDressed: true,
              classManagement: true,
              punctuality: true,
              assiduity: true,
              reason: cleanReason || undefined,
            },
          ],
        });
      }
      toast.success(t('Attendance updated.'));
      onSaved();
      onClose();
    } catch (error) {
      fail(error, t('Failed to update attendance.'));
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!existing) return;
    setBusy('remove');
    try {
      await deleteTeacherAttendance(existing.id);
      toast.success(t('Record removed.'));
      onSaved();
      onClose();
    } catch (error) {
      fail(error, t('Failed to remove the record.'));
      setBusy(null);
    }
  };

  return (
    <Modal isOpen onClose={() => !busy && onClose()} title={t('Teacher attendance')} size="sm">
      <div className="space-y-4">
        <div className="text-sm text-gray-700 space-y-0.5">
          <div className="font-semibold text-gray-900">{slot.teacherName ?? t('No teacher')}</div>
          <div>
            {slot.subjectName ?? ''} · {target.className}
          </div>
          <div className="text-gray-500">
            {target.dayLabel} {target.date} · {target.periodLabel}
          </div>
          {existing?.recordedBy && (
            <div className="text-xs text-gray-400">
              {t('Recorded by')} {existing.recordedBy.name}
            </div>
          )}
          {!existing && <div className="text-xs text-gray-400">{t('Not recorded yet')}</div>}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatus(opt.value)}
              disabled={!!busy}
              className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors ${status === opt.value ? opt.active : opt.idle}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {status !== 'PRESENT' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('Reason (optional)')}</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          {existing ? (
            <button
              onClick={remove}
              disabled={!!busy}
              className="text-xs text-red-600 hover:underline disabled:opacity-50"
              title={t('Back to not recorded')}
            >
              {busy === 'remove' ? t('Removing...') : t('Remove record')}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={!!busy}
              className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm"
            >
              {t('Cancel')}
            </button>
            <button
              onClick={save}
              disabled={!!busy || unchanged}
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {busy === 'save' ? t('Saving...') : t('Save')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
