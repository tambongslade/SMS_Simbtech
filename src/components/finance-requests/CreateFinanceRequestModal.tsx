'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { MagnifyingGlassIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Button, Input, Select, TextArea, Modal } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import {
  createFinanceRequest,
  searchFinanceStudents,
  listRecipientUsers,
  creatableTypes,
  isSelfRequester,
  TYPE_LABELS,
  PAYMENT_CLAIM_METHODS,
  REFUND_REQUEST_METHODS,
  type FinanceRequest,
  type FinanceRequestType,
  type FinanceStudent,
  type StudentEnrollment,
  type RecipientUser,
  type PaymentClaimMethod,
  type RefundRequestMethod,
} from '@/lib/financeRequestsApi';

interface CreateFinanceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (created: FinanceRequest) => void;
  // Restrict the selectable types (defaults to whatever the active role may create).
  allowedTypes?: FinanceRequestType[];
}

const ALL_TYPES: FinanceRequestType[] = [
  'FEE_REDUCTION',
  'PERSONNEL_DISBURSEMENT',
  'BANK_VERIFICATION',
  'PAYMENT_CLAIM',
  'REFUND',
];

const monthValue = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const todayValue = () => new Date().toISOString().split('T')[0];

export function CreateFinanceRequestModal({
  isOpen,
  onClose,
  onCreated,
  allowedTypes: allowedTypesProp,
}: CreateFinanceRequestModalProps) {
  const { user, selectedAcademicYear, selectedRole } = useAuth();

  // Staff outside the finance team may only request money for themselves, and
  // can't list other users — so the recipient picker is replaced by "you".
  const selfOnly = isSelfRequester(selectedRole);

  const allowedTypes = useMemo(() => {
    if (allowedTypesProp?.length) return allowedTypesProp;
    const byRole = creatableTypes(selectedRole);
    return byRole.length ? byRole : ALL_TYPES;
  }, [allowedTypesProp, selectedRole]);

  const [type, setType] = useState<FinanceRequestType>(allowedTypes[0]);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // FEE_REDUCTION / BANK_VERIFICATION: student picker
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState<FinanceStudent[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<FinanceStudent | null>(null);

  // FEE_REDUCTION extras
  const [enrollmentId, setEnrollmentId] = useState('');
  const [partnerName, setPartnerName] = useState('');

  // PERSONNEL_DISBURSEMENT: recipient picker
  const [recipients, setRecipients] = useState<RecipientUser[]>([]);
  const [recipientQuery, setRecipientQuery] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [purpose, setPurpose] = useState('');

  // BANK_VERIFICATION extras
  const [claimedAmount, setClaimedAmount] = useState('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');

  // PAYMENT_CLAIM extras
  const [paymentMethod, setPaymentMethod] = useState<PaymentClaimMethod>('EXPRESS_UNION');
  const [paymentDate, setPaymentDate] = useState(todayValue());
  const [receiptNumber, setReceiptNumber] = useState('');

  // REFUND extras
  const [refundMethod, setRefundMethod] = useState<RefundRequestMethod>('CASH');
  const [refundDate, setRefundDate] = useState(todayValue());

  const resetForm = () => {
    setType(allowedTypes[0]);
    setAmount('');
    setReason('');
    setNotes('');
    setStudentQuery('');
    setStudentResults([]);
    setSelectedStudent(null);
    setEnrollmentId('');
    setPartnerName('');
    setRecipientQuery('');
    setRecipientId(selfOnly && user?.id ? String(user.id) : '');
    setPurpose('');
    setClaimedAmount('');
    setPeriodFrom('');
    setPeriodTo('');
    setPaymentMethod('EXPRESS_UNION');
    setPaymentDate(todayValue());
    setReceiptNumber('');
    setRefundMethod('CASH');
    setRefundDate(todayValue());
  };

  // Reset whenever the modal opens.
  useEffect(() => {
    if (isOpen) {
      resetForm();
      const now = new Date();
      setPeriodFrom(monthValue(now));
      setPeriodTo(monthValue(now));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Load recipient users once (for the personnel disbursement picker). Self
  // requesters skip it — they can't list users and the recipient is themselves.
  useEffect(() => {
    if (!isOpen) return;
    if (selfOnly) {
      setRecipientId(user?.id ? String(user.id) : '');
      return;
    }
    listRecipientUsers().then(setRecipients).catch(() => setRecipients([]));
  }, [isOpen, selfOnly, user?.id]);

  // Types whose form starts from a student lookup.
  const usesStudentPicker =
    type === 'FEE_REDUCTION' ||
    type === 'BANK_VERIFICATION' ||
    type === 'PAYMENT_CLAIM' ||
    type === 'REFUND';
  // Types that need a specific enrollment, not just the student.
  const needsEnrollment = type === 'FEE_REDUCTION' || type === 'REFUND';

  // Debounced student search.
  useEffect(() => {
    if (!usesStudentPicker) return;
    const q = studentQuery.trim();
    if (q.length < 2) {
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
  }, [studentQuery, usesStudentPicker, selectedAcademicYear?.id]);

  const filteredRecipients = useMemo(() => {
    const q = recipientQuery.trim().toLowerCase();
    if (!q) return recipients.slice(0, 50);
    return recipients
      .filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.matricule?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [recipients, recipientQuery]);

  const pickStudent = (s: FinanceStudent) => {
    setSelectedStudent(s);
    setStudentResults([]);
    setStudentQuery(`${s.name}${s.matricule ? ` (${s.matricule})` : ''}`);
    // Pre-select the enrollment for the active academic year, else the latest.
    if (needsEnrollment) {
      const match =
        s.enrollments.find((e) => e.academicYearId === selectedAcademicYear?.id) ||
        s.enrollments[s.enrollments.length - 1];
      setEnrollmentId(match ? String(match.id) : '');
    }
  };

  const enrollmentLabel = (e: StudentEnrollment) => {
    const cls = [e.className, e.subClassName].filter(Boolean).join(' · ');
    const yr = e.academicYearName ? ` — ${e.academicYearName}` : '';
    return `${cls || 'Enrollment'}${yr} (#${e.id})`;
  };

  const validate = (): string | null => {
    if (!reason.trim()) return 'Reason is required.';
    if (type === 'FEE_REDUCTION') {
      if (!enrollmentId) return 'Select the student enrollment to discount.';
      if (!amount || Number(amount) <= 0) return 'Amount must be greater than 0.';
    }
    if (type === 'PERSONNEL_DISBURSEMENT') {
      // The backend requires both payload.recipientUserId and payload.purpose.
      if (!recipientId || isNaN(Number(recipientId))) {
        return selfOnly
          ? 'We could not identify your account. Sign out and back in, then try again.'
          : 'Select the recipient.';
      }
      if (!purpose.trim()) return 'Purpose is required — say what the money is for.';
      if (!amount || Number(amount) <= 0) return 'Amount must be greater than 0.';
    }
    if (type === 'BANK_VERIFICATION') {
      if (!selectedStudent) return 'Select the student.';
      if (!periodFrom || !periodTo) return 'Provide the estimated payment period.';
    }
    if (type === 'PAYMENT_CLAIM') {
      if (!selectedStudent) return 'Select the student the payment is for.';
      if (!amount || Number(amount) <= 0) return 'Amount must be greater than 0.';
      if (!paymentDate) return 'Provide the date the payment was made.';
    }
    if (type === 'REFUND') {
      if (!enrollmentId) return 'Select the enrollment to refund.';
      if (!amount || Number(amount) <= 0) return 'Amount must be greater than 0.';
      if (!refundDate) return 'Provide the refund date.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    let payload: Record<string, any> = {};
    let amountValue: number | null = null;

    if (type === 'FEE_REDUCTION') {
      amountValue = Number(amount);
      payload = {
        enrollmentId: Number(enrollmentId),
        ...(partnerName.trim() ? { partnerName: partnerName.trim() } : {}),
      };
    } else if (type === 'PERSONNEL_DISBURSEMENT') {
      amountValue = Number(amount);
      payload = { recipientUserId: Number(recipientId), purpose: purpose.trim() };
    } else if (type === 'PAYMENT_CLAIM') {
      amountValue = Number(amount);
      payload = {
        studentId: selectedStudent!.id,
        paymentMethod,
        paymentDate,
        ...(receiptNumber.trim() ? { receiptNumber: receiptNumber.trim() } : {}),
      };
    } else if (type === 'REFUND') {
      amountValue = Number(amount);
      payload = {
        enrollmentId: Number(enrollmentId),
        refundMethod,
        refundDate,
      };
    } else {
      // BANK_VERIFICATION — amount omitted
      payload = {
        studentId: selectedStudent!.id,
        estimatedPaymentPeriod: `${periodFrom} to ${periodTo}`,
        ...(claimedAmount && Number(claimedAmount) > 0
          ? { claimedAmount: Number(claimedAmount) }
          : {}),
      };
    }

    setIsSaving(true);
    try {
      const created = await createFinanceRequest({
        type,
        amount: amountValue,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        payload,
      });
      toast.success(`${TYPE_LABELS[type]} request created (#${created.id}).`);
      onCreated(created);
      onClose();
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Failed to create request.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const StudentPicker = (
    <div className="space-y-2">
      <div className="relative">
        <Input
          label="Student *"
          value={studentQuery}
          onChange={(e) => {
            setStudentQuery(e.target.value);
            setSelectedStudent(null);
            setEnrollmentId('');
          }}
          placeholder="Search by name or matricule…"
        />
        <MagnifyingGlassIcon className="absolute right-3 top-9 h-5 w-5 text-gray-400 pointer-events-none" />
      </div>
      {isSearching && <p className="text-xs text-gray-500">Searching…</p>}
      {studentResults.length > 0 && (
        <div className="border border-gray-200 rounded-lg divide-y max-h-48 overflow-y-auto">
          {studentResults.map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => pickStudent(s)}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
            >
              <span className="font-medium text-gray-900">{s.name}</span>
              {s.matricule && <span className="text-gray-500"> · {s.matricule}</span>}
            </button>
          ))}
        </div>
      )}
      {selectedStudent && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
          <CheckCircleIcon className="h-4 w-4" />
          Selected: <span className="font-medium">{selectedStudent.name}</span>
          {selectedStudent.matricule && <span>· {selectedStudent.matricule}</span>}
        </div>
      )}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Finance Request" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {allowedTypes.length > 1 ? (
          <Select
            label="Request Type *"
            value={type}
            onChange={(e) => setType(e.target.value as FinanceRequestType)}
            options={allowedTypes.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
          />
        ) : (
          <div className="text-sm text-gray-600">
            Type: <span className="font-medium text-gray-900">{TYPE_LABELS[type]}</span>
          </div>
        )}

        {/* FEE_REDUCTION */}
        {type === 'FEE_REDUCTION' && (
          <>
            {StudentPicker}
            {selectedStudent && (
              <Select
                label="Enrollment to discount *"
                value={enrollmentId}
                onChange={(e) => setEnrollmentId(e.target.value)}
                options={[
                  { value: '', label: 'Select enrollment…' },
                  ...selectedStudent.enrollments.map((en) => ({
                    value: String(en.id),
                    label: enrollmentLabel(en),
                  })),
                ]}
              />
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Reduction amount (XAF) *"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Input
                label="Partner name (optional)"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                placeholder="e.g. XYZ Foundation"
              />
            </div>
          </>
        )}

        {/* PERSONNEL_DISBURSEMENT */}
        {type === 'PERSONNEL_DISBURSEMENT' && (
          <>
            {selfOnly ? (
              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                Recipient: <span className="font-medium text-gray-900">{user?.name || 'You'}</span>
                <span className="text-gray-400"> — you can only request money for yourself.</span>
              </div>
            ) : (
              <>
                <Input
                  label="Find recipient"
                  value={recipientQuery}
                  onChange={(e) => setRecipientQuery(e.target.value)}
                  placeholder="Filter staff by name, matricule or email…"
                />
                <Select
                  label="Recipient *"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  options={[
                    { value: '', label: recipients.length ? 'Select recipient…' : 'Loading staff…' },
                    ...filteredRecipients.map((u) => ({
                      value: String(u.id),
                      label: `${u.name}${u.matricule ? ` (${u.matricule})` : ''}`,
                    })),
                  ]}
                />
              </>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Amount (XAF) *"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Input
                label="Purpose *"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Travel reimbursement"
                helperText="What the money will be used for"
              />
            </div>
          </>
        )}

        {/* BANK_VERIFICATION */}
        {type === 'BANK_VERIFICATION' && (
          <>
            {StudentPicker}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Claimed amount (optional)"
                type="number"
                min={1}
                value={claimedAmount}
                onChange={(e) => setClaimedAmount(e.target.value)}
                helperText="What the parent claims they paid"
              />
              <Input
                label="Period from *"
                type="month"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
              />
              <Input
                label="Period to *"
                type="month"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
              />
            </div>
          </>
        )}

        {/* PAYMENT_CLAIM */}
        {type === 'PAYMENT_CLAIM' && (
          <>
            {StudentPicker}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Amount paid (XAF) *"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Select
                label="Payment method *"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentClaimMethod)}
                options={PAYMENT_CLAIM_METHODS}
              />
              <Input
                label="Payment date *"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
              <Input
                label="Receipt number"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="e.g. EU-88213"
                helperText="From the bank / agency slip"
              />
            </div>
            <p className="text-xs text-gray-500">
              The Bursar verifies this claim before it is recorded against the student&apos;s fees.
            </p>
          </>
        )}

        {/* REFUND */}
        {type === 'REFUND' && (
          <>
            {StudentPicker}
            {selectedStudent && (
              <Select
                label="Enrollment to refund *"
                value={enrollmentId}
                onChange={(e) => setEnrollmentId(e.target.value)}
                options={[
                  { value: '', label: 'Select enrollment…' },
                  ...selectedStudent.enrollments.map((en) => ({
                    value: String(en.id),
                    label: enrollmentLabel(en),
                  })),
                ]}
              />
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Refund amount (XAF) *"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                helperText="Cannot exceed the current overpayment"
              />
              <Select
                label="Refund method *"
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as RefundRequestMethod)}
                options={REFUND_REQUEST_METHODS}
              />
              <Input
                label="Refund date *"
                type="date"
                value={refundDate}
                onChange={(e) => setRefundDate(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-500">
              A Super Manager must approve before the refund is recorded.
            </p>
          </>
        )}

        <Input
          label="Reason *"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            type === 'BANK_VERIFICATION'
              ? 'e.g. Parent claims they paid at the bank'
              : type === 'PAYMENT_CLAIM'
                ? 'e.g. First installment for Term 1'
                : type === 'REFUND'
                  ? 'e.g. Overpayment on Term 2 fees'
                  : 'Why is this request being made?'
          }
        />
        <TextArea
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" color="primary" isLoading={isSaving}>
            Create Request
          </Button>
        </div>
      </form>
    </Modal>
  );
}
