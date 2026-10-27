'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Button, Input, Modal } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import { searchFinanceStudents, type FinanceStudent } from '@/lib/financeRequestsApi';
import feeService, { type FeeResponse } from '@/lib/feeService';

const fmtAmount = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

// Applies a deduction directly to a student's SchoolFees.amountExpected for the
// current academic year (PUT /fees/:id). There is no separate "deduction"
// model in the schema, so this is a direct, auditable reduction of what the
// student owes rather than a queued request.
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
  const [isSaving, setIsSaving] = useState(false);

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

  const loadFees = (studentId: number) => {
    setIsLoadingFees(true);
    feeService
      .getFeesByStudent(studentId, { academicYearId: selectedAcademicYear?.id })
      .then((res) => setFees(res.data || []))
      .catch(() => setFees([]))
      .finally(() => setIsLoadingFees(false));
  };

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

    setIsSaving(true);
    try {
      const newAmountExpected = Math.round((target.amountExpected - amount) * 100) / 100;
      await feeService.updateFee(target.id, { amountExpected: newAmountExpected });
      toast.success(
        `Deducted ${fmtAmount(amount)} from ${target.student?.name ?? 'student'}'s fees. New amount expected: ${fmtAmount(newAmountExpected)}.`
      );
      setTarget(null);
      if (student) loadFees(student.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      if (message !== 'Unauthorized') {
        toast.error(message || 'Failed to apply the deduction.');
      }
    } finally {
      setIsSaving(false);
    }
  };

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

      {/* Deduction modal */}
      <Modal isOpen={!!target} onClose={() => !isSaving && setTarget(null)} title="Apply Fee Deduction" size="md">
        {target && (
          <form onSubmit={handleApply} className="space-y-4">
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              <span className="font-medium text-gray-900">{target.student?.name}</span> — currently expected to pay{' '}
              <span className="font-medium text-gray-900">{fmtAmount(target.amountExpected)}</span>
              {' '}(paid so far: {fmtAmount(target.amountPaid)}).
            </div>

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
    </div>
  );
}
