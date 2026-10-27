'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { Button, Input, TextArea, Modal } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import { searchFinanceStudents, type FinanceStudent } from '@/lib/financeRequestsApi';
import { searchPersonnel, type PersonnelUser } from '@/lib/personnelApi';
import feeService, { type FeeResponse } from '@/lib/feeService';
import {
  applyFeeDeduction,
  listFeeDeductions,
  deleteFeeDeduction,
  DuplicateDeductionError,
  type FeeDeductionRecord,
} from '@/lib/feeDeductionApi';

const LOG_LIMIT = 20;

const fmtAmount = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

// Applies a deduction directly to a student's SchoolFees.amountExpected for the
// current academic year (POST /fees/:id/deduction), recording a FeeDeduction
// row so every reduction is logged, tied either to a staff member whose child
// the student is (and linked to them via ParentStudent) or to a written reason.
export function FeeDeductionPanel() {
  const { selectedAcademicYear } = useAuth();

  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState<FinanceStudent[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [student, setStudent] = useState<FinanceStudent | null>(null);

  const [fees, setFees] = useState<FeeResponse[]>([]);
  const [isLoadingFees, setIsLoadingFees] = useState(false);

  const [target, setTarget] = useState<FeeResponse | null>(null);
  const [deduction, setDeduction] = useState('');
  const [isChildOfPersonnel, setIsChildOfPersonnel] = useState(false);
  const [personnelQuery, setPersonnelQuery] = useState('');
  const [personnelResults, setPersonnelResults] = useState<PersonnelUser[]>([]);
  const [isSearchingPersonnel, setIsSearchingPersonnel] = useState(false);
  const [personnel, setPersonnel] = useState<PersonnelUser | null>(null);
  const [reason, setReason] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<FeeDeductionRecord[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Deduction log
  const [deductions, setDeductions] = useState<FeeDeductionRecord[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [isLoadingLog, setIsLoadingLog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FeeDeductionRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const q = studentQuery.trim();
    if (!q || q.length < 2 || student) {
      setStudentResults([]);
      return;
    }
    setIsSearching(true);
    const handle = setTimeout(() => {
      searchFinanceStudents({ q, academicYearId: selectedAcademicYear?.id, limit: 15 })
        .then(setStudentResults)
        .catch(() => setStudentResults([]))
        .finally(() => setIsSearching(false));
    }, 350);
    return () => clearTimeout(handle);
  }, [studentQuery, student, selectedAcademicYear?.id]);

  useEffect(() => {
    const q = personnelQuery.trim();
    if (!q || q.length < 2 || personnel) {
      setPersonnelResults([]);
      return;
    }
    setIsSearchingPersonnel(true);
    const handle = setTimeout(() => {
      searchPersonnel({ q, limit: 15 })
        .then((res) => setPersonnelResults(res.data))
        .catch(() => setPersonnelResults([]))
        .finally(() => setIsSearchingPersonnel(false));
    }, 350);
    return () => clearTimeout(handle);
  }, [personnelQuery, personnel]);

  const loadFees = (studentId: number) => {
    setIsLoadingFees(true);
    feeService
      .getFeesByStudent(studentId, { academicYearId: selectedAcademicYear?.id })
      .then((res) => setFees(res.data || []))
      .catch(() => setFees([]))
      .finally(() => setIsLoadingFees(false));
  };

  const loadLog = useCallback(() => {
    setIsLoadingLog(true);
    listFeeDeductions({ academicYearId: selectedAcademicYear?.id, page: logPage, limit: LOG_LIMIT })
      .then((res) => {
        setDeductions(res.data);
        setLogTotal(res.meta?.total ?? res.data.length);
      })
      .catch(() => setDeductions([]))
      .finally(() => setIsLoadingLog(false));
  }, [selectedAcademicYear?.id, logPage]);

  useEffect(() => {
    loadLog();
  }, [loadLog]);

  const selectStudent = (s: FinanceStudent) => {
    setStudent(s);
    setStudentQuery('');
    setStudentResults([]);
    loadFees(s.id);
  };

  const clearStudent = () => {
    setStudent(null);
    setStudentQuery('');
    setStudentResults([]);
    setFees([]);
  };

  const openDeduct = (fee: FeeResponse) => {
    setTarget(fee);
    setDeduction('');
    setIsChildOfPersonnel(false);
    setPersonnelQuery('');
    setPersonnelResults([]);
    setPersonnel(null);
    setReason('');
    setDuplicateWarning(null);
  };

  const submitDeduction = async (confirmDuplicate: boolean) => {
    if (!target) return;
    setIsSaving(true);
    try {
      const amount = parseFloat(deduction);
      const result = await applyFeeDeduction(target.id, {
        amount,
        isPersonnelChild: isChildOfPersonnel,
        personnelId: isChildOfPersonnel ? personnel?.id : undefined,
        reason: isChildOfPersonnel ? undefined : reason.trim(),
        confirmDuplicate,
      });
      toast.success(
        `Deducted ${fmtAmount(amount)} from ${target.student?.name ?? 'student'}'s fees. New amount expected: ${fmtAmount(result.amountExpectedAfter)}.`
      );
      setTarget(null);
      if (student) loadFees(student.id);
      loadLog();
    } catch (error) {
      if (error instanceof DuplicateDeductionError) {
        setDuplicateWarning(error.existing);
        return;
      }
      const message = error instanceof Error ? error.message : undefined;
      if (message !== 'Unauthorized') {
        toast.error(message || 'Failed to apply the deduction.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    const amount = parseFloat(deduction);
    if (!amount || amount <= 0) {
      toast.error('Enter a deduction amount greater than 0.');
      return;
    }
    if (amount > target.amountExpected) {
      toast.error(`Deduction cannot exceed the expected fee (${fmtAmount(target.amountExpected)}).`);
      return;
    }
    if (isChildOfPersonnel && !personnel) {
      toast.error('Select which staff member this student is the child of.');
      return;
    }
    if (!isChildOfPersonnel && !reason.trim()) {
      toast.error('Enter a reason for the deduction.');
      return;
    }
    await submitDeduction(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteFeeDeduction(deleteTarget.id);
      toast.success('Deduction deleted and the amount restored.');
      setDeleteTarget(null);
      loadLog();
      if (student) loadFees(student.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      if (message !== 'Unauthorized') {
        toast.error(message || 'Failed to delete the deduction.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const logTotalPages = Math.max(1, Math.ceil(logTotal / LOG_LIMIT));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
          Fee Deduction
        </h2>
        <p className="text-gray-600 mt-1 text-sm">
          Select a student and reduce the fees they owe for the current academic year.
        </p>
      </div>

      {/* Student picker */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 space-y-3">
        {!student ? (
          <div className="space-y-2">
            <div className="relative">
              <Input
                label="Student"
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                placeholder="Search by name or matricule…"
              />
              <MagnifyingGlassIcon className="absolute right-3 top-9 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
            {isSearching && <p className="text-xs text-gray-500">Searching…</p>}
            {studentResults.length > 0 && (
              <div className="border border-gray-200 rounded-lg divide-y max-h-56 overflow-y-auto">
                {studentResults.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => selectStudent(s)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                  >
                    <span className="font-medium text-gray-900">{s.name}</span>
                    {s.matricule && <span className="text-gray-500"> · {s.matricule}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
              <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium truncate">{student.name}</span>
              {student.matricule && <span className="text-emerald-600">· {student.matricule}</span>}
            </div>
            <Button variant="outline" size="sm" leftIcon={ArrowPathIcon} onClick={clearStudent}>
              Change
            </Button>
          </div>
        )}
      </div>

      {/* Fee records for the selected student */}
      {student && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {isLoadingFees ? (
            <p className="p-6 text-center text-sm text-gray-500">Loading fee records…</p>
          ) : fees.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">
              No fee record found for this student in the current academic year.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {fees.map((fee) => {
                const balance = fee.amountExpected - fee.amountPaid;
                return (
                  <div key={fee.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {fee.enrollment?.subClass?.class?.name
                          ? `${fee.enrollment.subClass.class.name} · ${fee.enrollment.subClass.name}`
                          : 'Current enrollment'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Expected: {fmtAmount(fee.amountExpected)} · Paid: {fmtAmount(fee.amountPaid)} · Balance:{' '}
                        {fmtAmount(balance)}
                      </p>
                    </div>
                    <Button color="primary" size="sm" onClick={() => openDeduct(fee)}>
                      Apply Deduction
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Deduction log */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-gray-900">All Fee Deductions</h3>
          <Button variant="outline" size="sm" leftIcon={ArrowPathIcon} onClick={loadLog} disabled={isLoadingLog}>
            Refresh
          </Button>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {isLoadingLog ? (
            <p className="p-6 text-center text-sm text-gray-500">Loading…</p>
          ) : deductions.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">No deductions recorded yet.</p>
          ) : (
            deductions.map((d) => (
              <div key={d.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{d.enrollment.student.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {d.enrollment.student.matricule ? `${d.enrollment.student.matricule} · ` : ''}
                      {d.enrollment.subClass?.name}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 shrink-0">{fmtAmount(d.amount)}</span>
                </div>
                <p className="text-xs text-gray-700 mt-1.5">
                  {d.isPersonnelChild ? `Child of personnel: ${d.personnel?.name ?? '—'}` : d.reason}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {fmtDate(d.createdAt)} · by {d.createdBy?.name}
                </p>
                <div className="flex justify-end mt-2">
                  <Button size="xs" variant="outline" leftIcon={TrashIcon} onClick={() => setDeleteTarget(d)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop table */}
        <div className="overflow-x-auto hidden md:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason / Personnel</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applied by</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoadingLog ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading…</td>
                </tr>
              ) : deductions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No deductions recorded yet.</td>
                </tr>
              ) : (
                deductions.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{d.enrollment.student.name}</div>
                      <div className="text-xs text-gray-500">
                        {d.enrollment.student.matricule ? `${d.enrollment.student.matricule} · ` : ''}
                        {d.enrollment.subClass?.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {fmtAmount(d.amount)}
                      <div className="text-xs text-gray-400">
                        {fmtAmount(d.amountExpectedBefore)} → {fmtAmount(d.amountExpectedAfter)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {d.isPersonnelChild ? (
                        <span>
                          Child of personnel:{' '}
                          <span className="font-medium text-gray-900">{d.personnel?.name ?? '—'}</span>
                        </span>
                      ) : (
                        d.reason
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {d.createdBy?.name || '—'}
                      <div className="text-xs text-gray-400">{fmtDate(d.createdAt)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Button size="xs" variant="outline" leftIcon={TrashIcon} onClick={() => setDeleteTarget(d)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-gray-200">
          <span className="text-sm text-gray-600">
            {logTotal} deduction{logTotal === 1 ? '' : 's'} · Page {logPage} of {logTotalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" leftIcon={ChevronLeftIcon} disabled={logPage <= 1 || isLoadingLog} onClick={() => setLogPage((p) => Math.max(1, p - 1))}>
              Prev
            </Button>
            <Button variant="outline" size="sm" rightIcon={ChevronRightIcon} disabled={logPage >= logTotalPages || isLoadingLog} onClick={() => setLogPage((p) => Math.min(logTotalPages, p + 1))}>
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Deduction modal */}
      <Modal isOpen={!!target} onClose={() => !isSaving && setTarget(null)} title="Apply Fee Deduction" size="md">
        {target && (
          <form onSubmit={handleApply} className="space-y-4">
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              <span className="font-medium text-gray-900">{target.student?.name}</span> — currently expected to pay{' '}
              <span className="font-medium text-gray-900">{fmtAmount(target.amountExpected)}</span>
              {' '}(paid so far: {fmtAmount(target.amountPaid)}).
            </div>

            {duplicateWarning && duplicateWarning.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 space-y-2">
                <div className="flex items-start gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-amber-500" />
                  <p>
                    A fee reduction has already been applied to {target.student?.name ?? 'this student'}:
                  </p>
                </div>
                <ul className="pl-7 list-disc space-y-0.5">
                  {duplicateWarning.map((d) => (
                    <li key={d.id}>
                      {fmtAmount(d.amount)} on {fmtDate(d.createdAt)} —{' '}
                      {d.isPersonnelChild ? `child of ${d.personnel?.name ?? 'a staff member'}` : d.reason}
                    </li>
                  ))}
                </ul>
                <div className="flex justify-end pt-1">
                  <Button type="button" size="xs" color="warning" isLoading={isSaving} onClick={() => submitDeduction(true)}>
                    Apply anyway
                  </Button>
                </div>
              </div>
            )}

            <Input
              label="Deduction Amount *"
              type="number"
              min={1}
              max={target.amountExpected}
              value={deduction}
              onChange={(e) => setDeduction(e.target.value)}
              placeholder="e.g. 10000"
            />

            {deduction && !isNaN(parseFloat(deduction)) && (
              <p className="text-xs text-gray-500">
                New amount expected: {fmtAmount(Math.max(0, target.amountExpected - parseFloat(deduction)))}
              </p>
            )}

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isChildOfPersonnel}
                onChange={(e) => {
                  setIsChildOfPersonnel(e.target.checked);
                  setDuplicateWarning(null);
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              This student is the child of a staff member (personnel)
            </label>

            {isChildOfPersonnel ? (
              <div className="space-y-2">
                {!personnel ? (
                  <>
                    <div className="relative">
                      <Input
                        label="Which staff member? *"
                        value={personnelQuery}
                        onChange={(e) => setPersonnelQuery(e.target.value)}
                        placeholder="Search staff by name or matricule…"
                      />
                      <MagnifyingGlassIcon className="absolute right-3 top-9 h-5 w-5 text-gray-400 pointer-events-none" />
                    </div>
                    {isSearchingPersonnel && <p className="text-xs text-gray-500">Searching…</p>}
                    {personnelResults.length > 0 && (
                      <div className="border border-gray-200 rounded-lg divide-y max-h-48 overflow-y-auto">
                        {personnelResults.map((p) => (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => {
                              setPersonnel(p);
                              setPersonnelResults([]);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                          >
                            <span className="font-medium text-gray-900">{p.name}</span>
                            {p.matricule && <span className="text-gray-500"> · {p.matricule}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                    <span className="truncate">
                      <CheckCircleIcon className="h-4 w-4 inline mr-1 -mt-0.5" />
                      <span className="font-medium">{personnel.name}</span>
                      {personnel.matricule && <span className="text-emerald-600"> · {personnel.matricule}</span>}
                    </span>
                    <Button type="button" variant="outline" size="xs" onClick={() => setPersonnel(null)}>
                      Change
                    </Button>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  The student will be linked to this staff member as their guardian in the system.
                </p>
              </div>
            ) : (
              <TextArea
                label="Reason *"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="e.g. Scholarship, hardship case, sibling discount…"
              />
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => setTarget(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" color="primary" isLoading={isSaving}>
                Apply Deduction
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={!!deleteTarget} onClose={() => !isDeleting && setDeleteTarget(null)} title="Delete Deduction" size="sm">
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Delete the {fmtAmount(deleteTarget.amount)} deduction for{' '}
              <span className="font-medium">{deleteTarget.enrollment.student.name}</span>? The amount will be added
              back to what they&apos;re expected to pay.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button color="danger" isLoading={isDeleting} onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
