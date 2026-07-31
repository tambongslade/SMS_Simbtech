'use client';

import { useEffect, useState, useCallback } from 'react';
import { sortClassesByLevel } from '@/lib/classOrdering';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  ArrowUturnLeftIcon,
  DocumentArrowDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { Button, Input, Select, Modal } from '@/components/ui';
import apiService from '@/lib/apiService';
import {
  listOverpaid,
  exportOverpaid,
  recordRefund,
  downloadBlob,
  fmtMoney,
  REFUND_METHODS,
  type OverpaidRow,
  type RefundMethod,
} from '@/lib/refundsApi';

type ClassInfo = { id: number; name: string };
type SubClassInfo = { id: number; name: string; classId?: number };

const LIMIT = 50;
const todayStr = () => new Date().toISOString().split('T')[0];

export default function BursarOverpaymentsPage() {
  const { selectedAcademicYear } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<OverpaidRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subClasses, setSubClasses] = useState<SubClassInfo[]>([]);
  const [classFilter, setClassFilter] = useState('');
  const [subClassFilter, setSubClassFilter] = useState('');
  const [minOverpayment, setMinOverpayment] = useState('1');

  // Refund modal
  const [refundRow, setRefundRow] = useState<OverpaidRow | null>(null);
  const [amount, setAmount] = useState('');
  const [refundDate, setRefundDate] = useState(todayStr());
  const [method, setMethod] = useState<RefundMethod>('CASH');
  const [reason, setReason] = useState('Overpayment refund');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await listOverpaid({
        academicYearId: selectedAcademicYear?.id,
        classId: classFilter ? Number(classFilter) : undefined,
        subClassId: subClassFilter ? Number(subClassFilter) : undefined,
        minOverpayment: minOverpayment ? Number(minOverpayment) : undefined,
        page,
        limit: LIMIT,
      });
      setRows(res.data);
      setTotal(res.meta?.total ?? res.data.length);
    } catch {
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAcademicYear?.id, classFilter, subClassFilter, minOverpayment, page]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setPage(1);
  }, [classFilter, subClassFilter, minOverpayment]);

  useEffect(() => {
    apiService.get<{ data: ClassInfo[] }>('/classes?limit=100').then((r) => setClasses(sortClassesByLevel(r.data || []))).catch(() => {});
    apiService
      .get<{ data: any[] }>('/classes/sub-classes?limit=100')
      .then((r) =>
        setSubClasses((r.data || []).map((sc: any) => ({ id: sc.id, name: sc.name, classId: sc.class?.id ?? sc.classId }))),
      )
      .catch(() => {});
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const subClassOptions = classFilter
    ? subClasses.filter((sc) => String(sc.classId) === classFilter)
    : subClasses;

  const handleExport = async () => {
    setIsExporting(true);
    toast.loading('Generating export…', { id: 'overpaid-export' });
    try {
      const blob = await exportOverpaid({
        academicYearId: selectedAcademicYear?.id,
        classId: classFilter ? Number(classFilter) : undefined,
        subClassId: subClassFilter ? Number(subClassFilter) : undefined,
        minOverpayment: minOverpayment ? Number(minOverpayment) : undefined,
      });
      downloadBlob(blob, `overpayments_${todayStr()}.xlsx`);
      toast.success('Export downloaded.', { id: 'overpaid-export' });
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Export failed.', { id: 'overpaid-export' });
      } else {
        toast.dismiss('overpaid-export');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const openRefund = (row: OverpaidRow) => {
    setRefundRow(row);
    setAmount(String(row.currentOverpayment));
    setRefundDate(todayStr());
    setMethod('CASH');
    setReason('Overpayment refund');
    setNotes('');
  };

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundRow) return;
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Amount must be greater than 0.');
      return;
    }
    if (amountNum > refundRow.currentOverpayment) {
      toast.error(`Refund cannot exceed the current overpayment (${fmtMoney(refundRow.currentOverpayment)}).`);
      return;
    }
    if (!reason.trim()) {
      toast.error('A reason is required.');
      return;
    }
    setIsSaving(true);
    try {
      const result = await recordRefund({
        enrollmentId: refundRow.enrollmentId,
        amount: amountNum,
        refundDate,
        refundMethod: method,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });
      toast.success(`Refund recorded. Remaining overpayment: ${fmtMoney(result.feeAfter.currentOverpayment)}.`);
      // Update the row in place from the server response.
      setRows((prev) =>
        prev
          .map((r) =>
            r.enrollmentId === refundRow.enrollmentId
              ? {
                  ...r,
                  amountPaid: result.feeAfter.amountPaid,
                  currentOverpayment: result.feeAfter.currentOverpayment,
                  totalRefunded: r.totalRefunded + amountNum,
                  refundsCount: r.refundsCount + 1,
                }
              : r,
          )
          // Drop rows that are now fully refunded (below the min filter).
          .filter((r) => r.currentOverpayment >= (minOverpayment ? Number(minOverpayment) : 1)),
      );
      setRefundRow(null);
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Failed to record refund.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overpayments &amp; Refunds</h1>
          <p className="text-gray-600 mt-1">
            Students who have paid more than expected
            {selectedAcademicYear ? ` · ${selectedAcademicYear.name}` : ''}.
          </p>
        </div>
        <Button variant="outline" leftIcon={DocumentArrowDownIcon} isLoading={isExporting} onClick={handleExport}>
          Export Excel
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="min-w-[180px]">
          <Select
            label="Class"
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setSubClassFilter('');
            }}
            options={[{ value: '', label: 'All classes' }, ...classes.map((c) => ({ value: String(c.id), label: c.name }))]}
          />
        </div>
        <div className="min-w-[180px]">
          <Select
            label="Subclass"
            value={subClassFilter}
            onChange={(e) => setSubClassFilter(e.target.value)}
            options={[{ value: '', label: 'All subclasses' }, ...subClassOptions.map((sc) => ({ value: String(sc.id), label: sc.name }))]}
          />
        </div>
        <div className="min-w-[160px]">
          <Input
            label="Min overpayment"
            type="number"
            min={1}
            value={minOverpayment}
            onChange={(e) => setMinOverpayment(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expected</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Refunded</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current Overpayment</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Loading overpayments…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No overpayments found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.enrollmentId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{row.name}</div>
                      <div className="text-xs text-gray-500">{row.matricule}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {row.className || '—'}
                      {row.subClassName ? <span className="text-gray-400"> · {row.subClassName}</span> : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{fmtMoney(row.amountExpected)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{fmtMoney(row.amountPaid)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {row.totalRefunded > 0 ? fmtMoney(row.totalRefunded) : '—'}
                      {row.refundsCount > 0 && (
                        <span className="text-xs text-gray-400"> ({row.refundsCount})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-emerald-700 text-right">
                      {fmtMoney(row.currentOverpayment)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="xs"
                          variant="outline"
                          leftIcon={EyeIcon}
                          onClick={() => router.push(`/dashboard/bursar/student-registration/${row.studentId}`)}
                        >
                          View
                        </Button>
                        <Button
                          size="xs"
                          color="primary"
                          leftIcon={ArrowUturnLeftIcon}
                          onClick={() => openRefund(row)}
                          disabled={row.currentOverpayment <= 0}
                        >
                          Refund
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-gray-500">Loading overpayments…</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">No overpayments found.</div>
          ) : (
            rows.map((row) => (
              <div key={row.enrollmentId} className="p-4 space-y-1.5">
                <div>
                  <div className="text-sm font-semibold text-gray-900 break-words">{row.name}</div>
                  <div className="text-xs text-gray-500">{row.matricule}</div>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-500">Class</span>
                  <span className="text-sm text-gray-900 text-right break-words">
                    {row.className || '—'}
                    {row.subClassName ? <span className="text-gray-400"> · {row.subClassName}</span> : null}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-500">Expected</span>
                  <span className="text-sm text-gray-900 text-right break-words">{fmtMoney(row.amountExpected)}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-500">Paid</span>
                  <span className="text-sm text-gray-900 text-right break-words">{fmtMoney(row.amountPaid)}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-500">Refunded</span>
                  <span className="text-sm text-gray-900 text-right break-words">
                    {row.totalRefunded > 0 ? fmtMoney(row.totalRefunded) : '—'}
                    {row.refundsCount > 0 && (
                      <span className="text-xs text-gray-400"> ({row.refundsCount})</span>
                    )}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-500">Current Overpayment</span>
                  <span className="text-sm font-semibold text-emerald-700 text-right break-words">
                    {fmtMoney(row.currentOverpayment)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1.5">
                  <Button
                    size="xs"
                    variant="outline"
                    leftIcon={EyeIcon}
                    onClick={() => router.push(`/dashboard/bursar/student-registration/${row.studentId}`)}
                  >
                    View
                  </Button>
                  <Button
                    size="xs"
                    color="primary"
                    leftIcon={ArrowUturnLeftIcon}
                    onClick={() => openRefund(row)}
                    disabled={row.currentOverpayment <= 0}
                  >
                    Refund
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <span className="text-sm text-gray-600">
            {total} student{total === 1 ? '' : 's'} with overpayments · Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" leftIcon={ChevronLeftIcon} disabled={page <= 1 || isLoading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </Button>
            <Button variant="outline" size="sm" rightIcon={ChevronRightIcon} disabled={page >= totalPages || isLoading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Refund modal */}
      <Modal isOpen={!!refundRow} onClose={() => setRefundRow(null)} title="Record Refund" size="md">
        {refundRow && (
          <form onSubmit={handleRefund} className="space-y-4">
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              <div className="font-medium text-gray-900">{refundRow.name}</div>
              <div className="text-gray-500">{refundRow.matricule}</div>
              <div className="mt-1">
                Current overpayment:{' '}
                <span className="font-semibold text-emerald-700">{fmtMoney(refundRow.currentOverpayment)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Amount (XAF) *"
                type="number"
                min={1}
                max={refundRow.currentOverpayment}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                helperText={`Max ${fmtMoney(refundRow.currentOverpayment)}`}
              />
              <Input label="Refund Date *" type="date" value={refundDate} onChange={(e) => setRefundDate(e.target.value)} required />
              <Select
                label="Method *"
                value={method}
                onChange={(e) => setMethod(e.target.value as RefundMethod)}
                options={REFUND_METHODS}
              />
              <Input label="Reason *" value={reason} onChange={(e) => setReason(e.target.value)} required />
            </div>
            <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => setRefundRow(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" color="primary" isLoading={isSaving}>
                Record Refund
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
