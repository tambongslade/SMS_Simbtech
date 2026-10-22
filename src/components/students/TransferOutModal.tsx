'use client';
// U13 - Transfer a student out to another school. Keeps all marks / fees / enrollment
// history (unlike Unenroll, which is refused once records exist) and issues a
// leaving certificate PDF.
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowRightOnRectangleIcon, DocumentArrowDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import apiService from '@/lib/apiService';
import { saveFile } from '@/lib/download';

export interface TransferOutStudent {
  id: number;
  name: string;
  matricule?: string;
  academicYearId?: number;
}

export interface StudentTransferRecord {
  id: number;
  studentId: number;
  academicYearId?: number | null;
  transferDate: string;
  reason: string;
  destinationSchool?: string | null;
  remarks?: string | null;
  lastClassName?: string | null;
  certificateNumber: string;
  student?: { id: number; name: string; matricule?: string };
}

const REASONS = [
  'Parent relocation',
  'Change of school (parent request)',
  'Financial reasons',
  'Health reasons',
  'Disciplinary transfer',
  'Other',
];

/** Today's date (YYYY-MM-DD) in the school's timezone (Africa/Douala). */
function schoolToday(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Douala' }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** Download the leaving certificate PDF for a student (latest transfer, or a specific one). */
export async function downloadLeavingCertificate(studentId: number, matricule?: string, transferId?: number) {
  const toastId = 'leaving-cert';
  toast.loading('Preparing leaving certificate...', { id: toastId });
  try {
    const qs = transferId ? `?transferId=${transferId}` : '';
    const blob = await apiService.get<Blob>(`/students/${studentId}/leaving-certificate${qs}`, undefined, 'blob');
    await saveFile(blob, `leaving-certificate-${matricule || studentId}.pdf`, 'application/pdf');
    toast.success('Leaving certificate downloaded', { id: toastId });
  } catch {
    toast.dismiss(toastId); // apiService already showed the error
  }
}

interface TransferOutModalProps {
  student: TransferOutStudent | null;
  onClose: () => void;
  onTransferred?: (record: StudentTransferRecord) => void;
  /** Optional context line, e.g. why unenrol was refused. */
  notice?: string | null;
}

export default function TransferOutModal({ student, onClose, onTransferred, notice }: TransferOutModalProps) {
  const [transferDate, setTransferDate] = useState(schoolToday());
  const [reasonChoice, setReasonChoice] = useState(REASONS[0]);
  const [reasonOther, setReasonOther] = useState('');
  const [destinationSchool, setDestinationSchool] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<StudentTransferRecord | null>(null);

  useEffect(() => {
    if (student) {
      setTransferDate(schoolToday());
      setReasonChoice(REASONS[0]);
      setReasonOther('');
      setDestinationSchool('');
      setRemarks('');
      setDone(null);
    }
  }, [student?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!student) return null;

  const reason = reasonChoice === 'Other' ? reasonOther.trim() : reasonChoice;

  const submit = async () => {
    if (!reason) {
      toast.error('Please give a reason for leaving');
      return;
    }
    if (!transferDate) {
      toast.error('Please choose the date of leaving');
      return;
    }
    setSaving(true);
    try {
      const res = await apiService.post<{ data: StudentTransferRecord }>(`/students/${student.id}/transfer-out`, {
        transferDate,
        reason,
        destinationSchool: destinationSchool.trim() || undefined,
        remarks: remarks.trim() || undefined,
        ...(student.academicYearId ? { academicYearId: student.academicYearId } : {}),
      });
      toast.success(`${student.name} transferred out. Records kept.`);
      setDone(res.data);
      onTransferred?.(res.data);
    } catch {
      // apiService toasts the server message (e.g. already transferred / migration pending)
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between p-5 border-b">
          <div className="flex items-start gap-3 min-w-0">
            <ArrowRightOnRectangleIcon className="h-6 w-6 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-900">Transfer out</h3>
              <p className="text-sm text-gray-600 break-words">
                {student.name}{student.matricule ? ` (${student.matricule})` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-700">
              The student is now marked <span className="font-medium">Transferred</span>. Marks, fees and
              attendance history are kept. Certificate No. <span className="font-mono">{done.certificateNumber}</span>.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={() => downloadLeavingCertificate(student.id, student.matricule, done.id)}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Download leaving certificate
              </button>
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {notice && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">{notice}</div>
            )}
            <p className="text-xs text-gray-500">
              Use this when a student leaves the school. Unlike Unenroll, all marks, fees and attendance
              records are kept, and a leaving certificate is issued.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of leaving *</label>
              <input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
              <select
                value={reasonChoice}
                onChange={(e) => setReasonChoice(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {reasonChoice === 'Other' && (
                <input
                  type="text"
                  value={reasonOther}
                  onChange={(e) => setReasonOther(e.target.value)}
                  placeholder="Describe the reason"
                  className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination school</label>
              <input
                type="text"
                value={destinationSchool}
                onChange={(e) => setDestinationSchool(e.target.value)}
                placeholder="e.g. GBHS Bamenda"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks / conduct (printed on certificate)</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />}
                {saving ? 'Saving...' : 'Transfer out'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Register of students transferred out, with certificate re-download. */
export function TransferRegisterModal({ open, onClose, academicYearId }: { open: boolean; onClose: () => void; academicYearId?: number }) {
  const [rows, setRows] = useState<StudentTransferRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: '20' });
    if (academicYearId) qs.append('academicYearId', String(academicYearId));
    apiService
      .get<{ data: StudentTransferRecord[]; meta?: { totalPages?: number } }>(`/students/transfers?${qs.toString()}`)
      .then((res) => {
        if (cancelled) return;
        setRows(res.data || []);
        setTotalPages(res.meta?.totalPages || 1);
      })
      .catch(() => { if (!cancelled) setRows([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, page, academicYearId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Transferred-out students</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">
          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-500">No transfers recorded.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {rows.map((r) => (
                <li key={r.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 break-words">
                      {r.student?.name ?? `Student #${r.studentId}`}
                      {r.student?.matricule ? <span className="text-gray-500 font-normal"> ({r.student.matricule})</span> : null}
                    </p>
                    <p className="text-xs text-gray-500 break-words">
                      {new Date(r.transferDate).toLocaleDateString('en-GB', { timeZone: 'UTC' })}
                      {r.lastClassName ? ` - ${r.lastClassName}` : ''} - {r.reason}
                      {r.destinationSchool ? ` - to ${r.destinationSchool}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => downloadLeavingCertificate(r.studentId, r.student?.matricule, r.id)}
                    className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded hover:bg-indigo-100 self-start sm:self-auto"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                    Certificate
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t text-sm">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded bg-gray-100 disabled:opacity-50">Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded bg-gray-100 disabled:opacity-50">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
