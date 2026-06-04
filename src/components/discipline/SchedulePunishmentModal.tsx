'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { MagnifyingGlassIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Button, Input, TextArea, Modal } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import { searchFinanceStudents, type FinanceStudent } from '@/lib/financeRequestsApi';
import {
  createSaturdayPunishment,
  nextSaturdayStr,
  type SaturdayPunishment,
} from '@/lib/disciplineApi';

export interface PunishmentPrefill {
  studentId: number;
  studentName: string;
  reason?: string;
}

interface SchedulePunishmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (created: SaturdayPunishment) => void;
  // When set (e.g. from a 3-strike alert) the student is fixed and the reason
  // pre-filled; otherwise the modal shows a student picker.
  prefill?: PunishmentPrefill | null;
}

export function SchedulePunishmentModal({
  isOpen,
  onClose,
  onCreated,
  prefill,
}: SchedulePunishmentModalProps) {
  const { selectedAcademicYear } = useAuth();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FinanceStudent[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [student, setStudent] = useState<{ id: number; name: string } | null>(null);

  const [reason, setReason] = useState('');
  const [scheduledDate, setScheduledDate] = useState(nextSaturdayStr());
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStudent(prefill ? { id: prefill.studentId, name: prefill.studentName } : null);
    setReason(prefill?.reason || '');
    setScheduledDate(nextSaturdayStr());
    setNotes('');
    setQuery('');
    setResults([]);
  }, [isOpen, prefill]);

  // Debounced student search (manual scheduling only).
  useEffect(() => {
    if (prefill) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    const handle = setTimeout(() => {
      searchFinanceStudents({ q, academicYearId: selectedAcademicYear?.id, limit: 15 })
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setIsSearching(false));
    }, 350);
    return () => clearTimeout(handle);
  }, [query, prefill, selectedAcademicYear?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return toast.error('Select a student.');
    if (!reason.trim()) return toast.error('Reason is required.');
    if (!scheduledDate) return toast.error('Pick the Saturday date.');

    setIsSaving(true);
    try {
      const created = await createSaturdayPunishment({
        studentId: student.id,
        reason: reason.trim(),
        scheduledDate,
        notes: notes.trim() || undefined,
        academicYearId: selectedAcademicYear?.id,
      });
      toast.success(`Saturday punishment scheduled for ${student.name}.`);
      onCreated(created);
      onClose();
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Failed to schedule punishment.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Saturday Punishment" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {prefill ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
            <CheckCircleIcon className="h-4 w-4" />
            Student: <span className="font-medium">{prefill.studentName}</span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Input
                label="Student *"
                value={student ? student.name : query}
                onChange={(e) => {
                  setStudent(null);
                  setQuery(e.target.value);
                }}
                placeholder="Search by name or matricule…"
              />
              <MagnifyingGlassIcon className="absolute right-3 top-9 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
            {isSearching && <p className="text-xs text-gray-500">Searching…</p>}
            {results.length > 0 && !student && (
              <div className="border border-gray-200 rounded-lg divide-y max-h-48 overflow-y-auto">
                {results.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => {
                      setStudent({ id: s.id, name: s.name });
                      setResults([]);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                  >
                    <span className="font-medium text-gray-900">{s.name}</span>
                    {s.matricule && <span className="text-gray-500"> · {s.matricule}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <Input
          label="Reason *"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder='e.g. "3 lates in Term 2"'
        />
        <Input
          label="Scheduled Saturday *"
          type="date"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
        />
        <TextArea
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="e.g. Cleaning duty"
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" color="primary" isLoading={isSaving}>
            Schedule
          </Button>
        </div>
      </form>
    </Modal>
  );
}
