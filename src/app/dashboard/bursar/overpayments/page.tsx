'use client';

import { useEffect, useState, useCallback } from 'react';
import { sortClassesByLevel, sortSubClassesByLevel } from '@/lib/classOrdering';
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
import { useLanguage } from '@/components/context/LanguageContext';
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
import { createFinanceRequest } from '@/lib/financeRequestsApi';

type ClassInfo = { id: number; name: string };
type SubClassInfo = { id: number; name: string; classId?: number };

const LIMIT = 50;
const todayStr = () => new Date().toISOString().split('T')[0];

export default function BursarOverpaymentsPage() {
  const { selectedAcademicYear, selectedRole } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  // Recording a refund outright is a Super Manager privilege; everyone else
  // raises a REFUND finance request for a Super Manager to approve.
  const canRecordDirectly = selectedRole === 'SUPER_MANAGER';

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
  const [reason, setReason] = useState(t('Overpayment refund'));
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
        setSubClasses(
          sortSubClassesByLevel(
            (r.data || []).map((sc: any) => ({
              id: sc.id,
              name: sc.name,
              classId: sc.class?.id ?? sc.classId,
              className: sc.class?.name,
            })),
          ),
        ),
      )
      .catch(() => {});
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const subClassOptions = classFilter
    ? subClasses.filter((sc) => String(sc.classId) === classFilter)
    : subClasses;

  const handleExport = async () => {
    setIsExporting(true);
    toast.loading(t('Generating export…'), { id: 'overpaid-export' });
    try {
      const blob = await exportOverpaid({
        academicYearId: selectedAcademicYear?.id,
        classId: classFilter ? Number(classFilter) : undefined,
        subClassId: subClassFilter ? Number(subClassFilter) : undefined,
        minOverpayment: minOverpayment ? Number(minOverpayment) : undefined,
      });
      await downloadBlob(blob, `overpayments_${todayStr()}.xlsx`);
      toast.success(t('Export downloaded.'), { id: 'overpaid-export' });
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || t('Export failed.'), { id: 'overpaid-export' });
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
    setReason(t('Overpayment refund'));
    setNotes('');
  };

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundRow) return;
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error(t('Amount must be greater than 0.'));
      return;
    }
    if (amountNum > refundRow.currentOverpayment) {
      toast.error(`${t('Refund cannot exceed the current overpayment')} (${fmtMoney(refundRow.currentOverpayment)}).`);
      return;
    }
    if (!reason.trim()) {
      toast.error(t('A reason is required.'));
      return;
    }
    setIsSaving(true);
    try {
      if (!canRecordDirectly) {
        const created = await createFinanceRequest({
          type: 'REFUND',
          amount: amountNum,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
          payload: {
            enrollmentId: refundRow.enrollmentId,
            refundMethod: method,
            refundDate,
          },
        });
        toast.success(
          `${t('Refund request')} #${created.id} ${t('sent to the Super Manager for approval. The overpayment stays on file until it is approved.')}`,
        );
        setRefundRow(null);
        return;
      }

      const result = await recordRefund({
        enrollmentId: refundRow.enrollmentId,
        amount: amountNum,
        refundDate,
        refundMethod: method,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });
      toast.success(`${t('Refund recorded. Remaining overpayment')}: ${fmtMoney(result.feeAfter.currentOverpayment)}.`);
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
        toast.error(error?.message || t('Failed to record refund.'));
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
          <h1 className="text-2xl font-bold text-gray-900">{t('Overpayments & Refunds')}</h1>
          <p className="text-gray-600 mt-1">
            {t('Students who have paid more than expected')}
            {selectedAcademicYear ? ` · ${selectedAcademicYear.name}` : ''}.
            {!canRecordDirectly && ' ' + t('Refunds are sent to the Super Manager for approval.')}
          </p>
        </div>
        <Button variant="outline" leftIcon={DocumentArrowDownIcon} isLoading={isExporting} onClick={handleExport}>
          {t('Export Excel')}
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="min-w-[180px]">
          <Select
            label={t('Class')}
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setSubClassFilter('');
            }}
            options={[{ value: '', label: t('All classes') }, ...classes.map((c) => ({ value: String(c.id), label: c.name }))]}
          />
        </div>
        <div className="min-w-[180px]">
          <Select
            label={t('Subclass')}
            value={subClassFilter}
            onChange={(e) => setSubClassFilter(e.target.value)}
            options={[{ value: '', label: t('All subclasses') }, ...subClassOptions.map((sc) => ({ value: String(sc.id), label: sc.name }))]}
          />
        </div>
        <div className="min-w-[160px]">
          <Input
            label={t('Min overpayment')}
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('Student')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('Class')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('Expected')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('Paid')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('Refunded')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('Current Overpayment')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    {t('Loading overpayments…')}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    {t('No overpayments found.')}
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
                          {t('View')}
                        </Button>
                        <Button
                          size="xs"
                          color="primary"
                          leftIcon={ArrowUturnLeftIcon}
                          onClick={() => openRefund(row)}
                          disabled={row.currentOverpayment <= 0}
                        >
                          {canRecordDirectly ? t('Refund') : t('Request Refund')}
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
            <div className="px-4 py-8 text-center text-gray-500">{t('Loading overpayments…')}</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">{t('No overpayments found.')}</div>
          ) : (
            rows.map((row) => (
              <div key={row.enrollmentId} className="p-4 space-y-1.5">
                <div>
                  <div className="text-sm font-semibold text-gray-900 break-words">{row.name}</div>
                  <div className="text-xs text-gray-500">{row.matricule}</div>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-500">{t('Class')}</span>
                  <span className="text-sm text-gray-900 text-right break-words">
                    {row.className || '—'}
                    {row.subClassName ? <span className="text-gray-400"> · {row.subClassName}</span> : null}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-500">{t('Expected')}</span>
                  <span className="text-sm text-gray-900 text-right break-words">{fmtMoney(row.amountExpected)}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-500">{t('Paid')}</span>
                  <span className="text-sm text-gray-900 text-right break-words">{fmtMoney(row.amountPaid)}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-500">{t('Refunded')}</span>
                  <span className="text-sm text-gray-900 text-right break-words">
                    {row.totalRefunded > 0 ? fmtMoney(row.totalRefunded) : '—'}
                    {row.refundsCount > 0 && (
                      <span className="text-xs text-gray-400"> ({row.refundsCount})</span>
                    )}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-500">{t('Current Overpayment')}</span>
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
                    {canRecordDirectly ? 'Refund' : 'Request Refund'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <span className="text-sm text-gray-600">
            {total} {total === 1 ? t('student with overpayments') : t('students with overpayments')} · {t('Page')} {page} {t('of')} {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" leftIcon={ChevronLeftIcon} disabled={page <= 1 || isLoading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              {t('Prev')}
            </Button>
            <Button variant="outline" size="sm" rightIcon={ChevronRightIcon} disabled={page >= totalPages || isLoading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              {t('Next')}
            </Button>
          </div>
        </div>
      </div>

      {/* Refund modal */}
      <Modal
        isOpen={!!refundRow}
        onClose={() => setRefundRow(null)}
        title={canRecordDirectly ? t('Record Refund') : t('Request Refund')}
        size="md"
      >
        {refundRow && (
          <form onSubmit={handleRefund} className="space-y-4">
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              <div className="font-medium text-gray-900">{refundRow.name}</div>
              <div className="text-gray-500">{refundRow.matricule}</div>
              <div className="mt-1">
                {t('Current overpayment')}:{' '}
                <span className="font-semibold text-emerald-700">{fmtMoney(refundRow.currentOverpayment)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={t('Amount (XAF) *')}
                type="number"
                min={1}
                max={refundRow.currentOverpayment}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                helperText={`${t('Max')} ${fmtMoney(refundRow.currentOverpayment)}`}
              />
              <Input label={t('Refund Date *')} type="date" value={refundDate} onChange={(e) => setRefundDate(e.target.value)} required />
              <Select
                label={t('Method *')}
                value={method}
                onChange={(e) => setMethod(e.target.value as RefundMethod)}
                options={REFUND_METHODS}
              />
              <Input label={t('Reason *')} value={reason} onChange={(e) => setReason(e.target.value)} required />
            </div>
            <Input label={t('Notes')} value={notes} onChange={(e) => setNotes(e.target.value)} />

            {!canRecordDirectly && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                {t('This goes to the Super Manager for approval. The refund is only issued — and the fees adjusted — once they approve it.')}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => setRefundRow(null)} disabled={isSaving}>
                {t('Cancel')}
              </Button>
              <Button type="submit" color="primary" isLoading={isSaving}>
                {canRecordDirectly ? t('Record Refund') : t('Send for Approval')}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
