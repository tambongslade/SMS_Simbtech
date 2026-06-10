'use client';

import { useEffect, useState, useCallback } from 'react';
import { sortClassesByLevel } from '@/lib/classOrdering';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  PencilSquareIcon,
  BanknotesIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { Button, Input, Select, Modal } from '@/components/ui';
import apiService from '@/lib/apiService';
import {
  listFeeItems,
  createFeeItem,
  updateFeeItem,
  recordFeeItemPayment,
  getFeeItemPayments,
  getEnrollmentFeeItems,
  fmtMoney,
  scopeTarget,
  PAYMENT_METHODS,
  type FeeItem,
  type FeeScope,
  type FeePaymentMethod,
  type FeeItemPayment,
  type RecordPaymentResult,
} from '@/lib/feeItemsApi';

type ClassInfo = { id: number; name: string };
type SubClassInfo = { id: number; name: string; classId?: number };

interface FormState {
  name: string;
  description: string;
  amount: string;
  scope: FeeScope;
  classId: string;
  subClassId: string;
  requiresSchoolFeesPaid: boolean;
  isActive: boolean;
}

const emptyForm: FormState = {
  name: '',
  description: '',
  amount: '',
  scope: 'ALL',
  classId: '',
  subClassId: '',
  requiresSchoolFeesPaid: false,
  isActive: true,
};

const todayStr = () => new Date().toISOString().split('T')[0];

// Inline student search for the record-payment flow.
const searchStudentsForPayment = async (q: string, academicYearId?: number) => {
  const qs = new URLSearchParams();
  qs.append('q', q);
  qs.append('limit', '8');
  if (academicYearId) qs.append('academicYearId', String(academicYearId));
  const res = await apiService.get<{ data: { data: any[] } }>(`/students/search?${qs.toString()}`);
  return res.data?.data || [];
};

export default function BursarFeeItemsPage() {
  const { selectedAcademicYear } = useAuth();

  const [items, setItems] = useState<FeeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subClasses, setSubClasses] = useState<SubClassInfo[]>([]);

  // Filters
  const [filterScope, setFilterScope] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');

  // Create / edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FeeItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  // Payments list
  const [paymentsItem, setPaymentsItem] = useState<FeeItem | null>(null);
  const [payments, setPayments] = useState<FeeItemPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // Record payment
  const [recordItem, setRecordItem] = useState<FeeItem | null>(null);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [enrollmentId, setEnrollmentId] = useState<number | null>(null);
  const [itemBalance, setItemBalance] = useState<number | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(todayStr());
  const [payMethod, setPayMethod] = useState<FeePaymentMethod>('CCA');
  const [payReceipt, setPayReceipt] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [cascadeResult, setCascadeResult] = useState<RecordPaymentResult | null>(null);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listFeeItems({
        academicYearId: selectedAcademicYear?.id,
        scope: filterScope !== 'all' ? (filterScope as FeeScope) : undefined,
        isActive: filterActive === 'all' ? undefined : filterActive === 'true',
      });
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAcademicYear?.id, filterScope, filterActive]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    apiService
      .get<{ data: ClassInfo[] }>('/classes?limit=100')
      .then((r) => setClasses(sortClassesByLevel(r.data || [])))
      .catch(() => setClasses([]));
    apiService
      .get<{ data: SubClassInfo[] }>('/classes/sub-classes?limit=100')
      .then((r) => setSubClasses(r.data || []))
      .catch(() => setSubClasses([]));
  }, []);

  // ---- Create / edit ----
  const openCreate = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (item: FeeItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description || '',
      amount: String(item.amount),
      scope: item.scope,
      classId: item.classId ? String(item.classId) : '',
      subClassId: item.subClassId ? String(item.subClassId) : '',
      requiresSchoolFeesPaid: item.requiresSchoolFeesPaid,
      isActive: item.isActive,
    });
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(form.amount);
    if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    if (!amountNum || amountNum <= 0) {
      toast.error('Amount must be greater than 0.');
      return;
    }
    if (form.scope === 'CLASS' && !form.classId) {
      toast.error('Select a class for a CLASS-scoped item.');
      return;
    }
    if (form.scope === 'SUBCLASS' && !form.subClassId) {
      toast.error('Select a subclass for a SUBCLASS-scoped item.');
      return;
    }

    const body = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      amount: amountNum,
      academicYearId: selectedAcademicYear?.id,
      scope: form.scope,
      classId: form.scope === 'CLASS' ? Number(form.classId) : null,
      subClassId: form.scope === 'SUBCLASS' ? Number(form.subClassId) : null,
      requiresSchoolFeesPaid: form.requiresSchoolFeesPaid,
      isActive: form.isActive,
    };

    setIsSaving(true);
    try {
      if (editingItem) {
        await updateFeeItem(editingItem.id, body);
        toast.success('Fee item updated.');
      } else {
        await createFeeItem(body);
        toast.success('Fee item created.');
      }
      setIsFormOpen(false);
      loadItems();
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Failed to save fee item.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (item: FeeItem) => {
    try {
      await updateFeeItem(item.id, { isActive: !item.isActive });
      toast.success(item.isActive ? 'Fee item deactivated.' : 'Fee item activated.');
      loadItems();
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Failed to update fee item.');
      }
    }
  };

  // ---- Payments list ----
  const openPayments = async (item: FeeItem) => {
    setPaymentsItem(item);
    setPayments([]);
    setPaymentsLoading(true);
    try {
      const data = await getFeeItemPayments(item.id);
      setPayments(data);
    } catch {
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  };

  // ---- Record payment ----
  const openRecord = (item: FeeItem) => {
    setRecordItem(item);
    setStudentQuery('');
    setStudentResults([]);
    setSelectedStudent(null);
    setEnrollmentId(null);
    setItemBalance(null);
    setPayAmount('');
    setPayDate(todayStr());
    setPayMethod('CCA');
    setPayReceipt('');
    setPayNotes('');
    setCascadeResult(null);
  };

  // Debounced student search (only while the record modal is open)
  useEffect(() => {
    if (!recordItem || selectedStudent) return;
    const q = studentQuery.trim();
    if (q.length < 2) {
      setStudentResults([]);
      return;
    }
    let active = true;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const results = await searchStudentsForPayment(q, selectedAcademicYear?.id);
        if (active) setStudentResults(results);
      } catch {
        if (active) setStudentResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 400);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [studentQuery, recordItem, selectedStudent, selectedAcademicYear?.id]);

  const selectStudent = async (student: any) => {
    if (!recordItem) return;
    const enrollments: any[] = student.enrollments || [];
    const enr = enrollments.find(
      (e) => String(e.academicYearId ?? e.academic_year_id) === String(recordItem.academicYearId),
    );
    if (!enr) {
      toast.error("This student has no enrollment in the fee item's academic year.");
      return;
    }
    setSelectedStudent(student);
    setEnrollmentId(enr.id);
    setStudentResults([]);
    // Look up the applicable balance for this item to prefill the amount.
    try {
      const applicable = await getEnrollmentFeeItems(enr.id);
      const match = applicable.find((fi) => fi.id === recordItem.id);
      if (match) {
        setItemBalance(match.balance ?? null);
        if (match.balance && match.balance > 0) setPayAmount(String(match.balance));
      } else {
        setItemBalance(null);
        toast('Note: this fee item is not in the student\'s applicable list (scope may not match).', {
          icon: '⚠️',
        });
      }
    } catch {
      setItemBalance(null);
    }
  };

  const resetStudentSelection = () => {
    setSelectedStudent(null);
    setEnrollmentId(null);
    setItemBalance(null);
    setPayAmount('');
    setStudentQuery('');
  };

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordItem || !enrollmentId) {
      toast.error('Select a student first.');
      return;
    }
    const amountNum = Number(payAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Amount must be greater than 0.');
      return;
    }
    setIsRecording(true);
    try {
      const result = await recordFeeItemPayment(recordItem.id, {
        enrollmentId,
        amount: amountNum,
        paymentDate: payDate,
        paymentMethod: payMethod,
        receiptNumber: payReceipt.trim() || undefined,
        notes: payNotes.trim() || undefined,
      });
      setCascadeResult(result);
      if (result.cascadedToSchoolFees) {
        toast.success('Payment redirected to school fees.', { duration: 6000 });
      } else {
        toast.success('Payment recorded.');
      }
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Failed to record payment.');
      }
    } finally {
      setIsRecording(false);
    }
  };

  const subClassOptions = subClasses.map((sc) => ({ value: String(sc.id), label: sc.name }));
  const classOptions = classes.map((c) => ({ value: String(c.id), label: c.name }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Items</h1>
          <p className="text-gray-600 mt-1">
            Ad-hoc fees (GCE, trips, etc.)
            {selectedAcademicYear ? ` · ${selectedAcademicYear.name}` : ''}
          </p>
        </div>
        <Button color="primary" leftIcon={PlusIcon} onClick={openCreate}>
          New Fee Item
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="min-w-[180px]">
          <Select
            label="Scope"
            value={filterScope}
            onChange={(e) => setFilterScope(e.target.value)}
            options={[
              { value: 'all', label: 'All scopes' },
              { value: 'ALL', label: 'All students' },
              { value: 'CLASS', label: 'Class' },
              { value: 'SUBCLASS', label: 'Subclass' },
            ]}
          />
        </div>
        <div className="min-w-[180px]">
          <Select
            label="Status"
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
            ]}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scope</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requires Fees Paid</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Loading fee items…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No fee items found.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-gray-500 max-w-xs truncate">{item.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">{fmtMoney(item.amount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="font-medium">{item.scope}</span>
                      <span className="text-gray-400"> · </span>
                      {scopeTarget(item)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.requiresSchoolFeesPaid ? (
                        <span className="inline-flex items-center gap-1 text-amber-700">
                          <ExclamationTriangleIcon className="h-4 w-4" /> Yes
                        </span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                          <CheckCircleIcon className="h-3.5 w-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                          <XCircleIcon className="h-3.5 w-3.5" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <Button size="xs" color="primary" leftIcon={BanknotesIcon} onClick={() => openRecord(item)} disabled={!item.isActive}>
                          Pay
                        </Button>
                        <Button size="xs" variant="outline" leftIcon={ListBulletIcon} onClick={() => openPayments(item)}>
                          Payments
                        </Button>
                        <Button size="xs" variant="outline" leftIcon={PencilSquareIcon} onClick={() => openEdit(item)}>
                          Edit
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          color={item.isActive ? 'danger' : 'success'}
                          onClick={() => toggleActive(item)}
                        >
                          {item.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / edit modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingItem ? 'Edit Fee Item' : 'New Fee Item'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name *"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              label="Amount (XAF) *"
              type="number"
              min={1}
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              required
            />
          </div>
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Scope *"
              value={form.scope}
              onChange={(e) =>
                setForm((f) => ({ ...f, scope: e.target.value as FeeScope, classId: '', subClassId: '' }))
              }
              options={[
                { value: 'ALL', label: 'All students' },
                { value: 'CLASS', label: 'Class' },
                { value: 'SUBCLASS', label: 'Subclass' },
              ]}
            />
            {form.scope === 'CLASS' && (
              <Select
                label="Class *"
                value={form.classId}
                onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
                options={[{ value: '', label: 'Select class' }, ...classOptions]}
              />
            )}
            {form.scope === 'SUBCLASS' && (
              <Select
                label="Subclass *"
                value={form.subClassId}
                onChange={(e) => setForm((f) => ({ ...f, subClassId: e.target.value }))}
                options={[{ value: '', label: 'Select subclass' }, ...subClassOptions]}
              />
            )}
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.requiresSchoolFeesPaid}
                onChange={(e) => setForm((f) => ({ ...f, requiresSchoolFeesPaid: e.target.checked }))}
              />
              Requires school fees paid (strict cascade — payments redirect to school fees if owing)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Active
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" color="primary" isLoading={isSaving}>
              {editingItem ? 'Save Changes' : 'Create Fee Item'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Payments list modal */}
      <Modal isOpen={!!paymentsItem} onClose={() => setPaymentsItem(null)} title={`Payments · ${paymentsItem?.name ?? ''}`} size="xl">
        {paymentsLoading ? (
          <p className="text-sm text-gray-500">Loading payments…</p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-gray-500">No payments recorded for this item.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-400">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Student</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Method</th>
                  <th className="py-2 pr-4">Receipt</th>
                  <th className="py-2 pr-4">Recorded By</th>
                  <th className="py-2 pr-4">Cascaded</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="py-2 pr-4 text-gray-600">{p.paymentDate?.split('T')[0]}</td>
                    <td className="py-2 pr-4 text-gray-800">
                      {p.enrollment?.student?.name || `Enrollment ${p.enrollmentId}`}
                      {p.enrollment?.student?.matricule && (
                        <span className="text-gray-400"> ({p.enrollment.student.matricule})</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-gray-800">{fmtMoney(p.amount)}</td>
                    <td className="py-2 pr-4 text-gray-600">{p.paymentMethod}</td>
                    <td className="py-2 pr-4 text-gray-600">{p.receiptNumber || '—'}</td>
                    <td className="py-2 pr-4 text-gray-600">{p.recordedBy?.name || '—'}</td>
                    <td className="py-2 pr-4">
                      {p.cascadedToSchoolFees ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">
                          → School fees
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Record payment modal */}
      <Modal isOpen={!!recordItem} onClose={() => setRecordItem(null)} title={`Record Payment · ${recordItem?.name ?? ''}`} size="lg">
        {recordItem && (
          <div className="space-y-4">
            {cascadeResult ? (
              // ---- Result view ----
              <div className="space-y-4">
                {cascadeResult.cascadedToSchoolFees ? (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                    <div className="flex items-start gap-2">
                      <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-900">
                        <p className="font-semibold">Payment redirected to school fees</p>
                        <p className="mt-1">{cascadeResult.message}</p>
                        <p className="mt-1 text-amber-800">
                          The <span className="font-medium">{recordItem.name}</span> balance is unchanged.
                          Generate two receipts if needed.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-green-300 bg-green-50 p-4">
                    <div className="flex items-start gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-green-900">
                        <p className="font-semibold">Payment recorded</p>
                        <p className="mt-1">{cascadeResult.message}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Record another for the same item
                      setCascadeResult(null);
                      resetStudentSelection();
                      setPayReceipt('');
                      setPayNotes('');
                      setPayDate(todayStr());
                    }}
                  >
                    Record Another
                  </Button>
                  <Button color="primary" onClick={() => setRecordItem(null)}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              // ---- Entry form ----
              <form onSubmit={handleRecord} className="space-y-4">
                <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                  <span className="font-medium">{recordItem.name}</span> · {fmtMoney(recordItem.amount)} ·{' '}
                  {recordItem.scope} ({scopeTarget(recordItem)})
                  {recordItem.requiresSchoolFeesPaid && (
                    <span className="block text-amber-700 mt-1">
                      Strict: if the student owes school fees, this payment is redirected there.
                    </span>
                  )}
                </div>

                {/* Student picker */}
                {selectedStudent ? (
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{selectedStudent.name}</div>
                      <div className="text-gray-500">
                        {selectedStudent.matricule} · Enrollment #{enrollmentId}
                        {itemBalance != null && (
                          <> · Balance: <span className="font-medium">{fmtMoney(itemBalance)}</span></>
                        )}
                      </div>
                    </div>
                    <Button type="button" size="xs" variant="outline" onClick={resetStudentSelection}>
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      label="Find student *"
                      placeholder="Name or matricule"
                      value={studentQuery}
                      onChange={(e) => setStudentQuery(e.target.value)}
                      leftIcon={<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />}
                      helperText={searching ? 'Searching…' : 'Type at least 2 characters'}
                    />
                    {studentResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        {studentResults.map((s) => (
                          <button
                            type="button"
                            key={s.id}
                            onClick={() => selectStudent(s)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                          >
                            <span className="font-medium text-gray-900">{s.name}</span>
                            <span className="text-gray-500"> · {s.matricule}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Amount (XAF) *"
                    type="number"
                    min={1}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    required
                  />
                  <Input
                    label="Payment Date *"
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    required
                  />
                  <Select
                    label="Method *"
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as FeePaymentMethod)}
                    options={PAYMENT_METHODS}
                  />
                  <Input
                    label="Receipt Number"
                    value={payReceipt}
                    onChange={(e) => setPayReceipt(e.target.value)}
                  />
                </div>
                <Input label="Notes" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                  <Button type="button" variant="outline" onClick={() => setRecordItem(null)} disabled={isRecording}>
                    Cancel
                  </Button>
                  <Button type="submit" color="primary" isLoading={isRecording} disabled={!enrollmentId}>
                    Record Payment
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
