'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Button, Input, Select, TextArea, Modal } from '@/components/ui';
import {
  createFinanceRequest,
  PAYMENT_CLAIM_METHODS,
  type FinanceRequest,
  type PaymentClaimMethod,
} from '@/lib/financeRequestsApi';
import type { Child } from '../hooks/useParentDashboard';

interface PaymentClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (created: FinanceRequest) => void;
  childrenOptions: Child[];
}

const todayStr = () => new Date().toISOString().split('T')[0];

/**
 * Parent-facing "I paid — here's the proof" form. It creates a PAYMENT_CLAIM
 * finance request; the Bursar validates it and the backend then records the
 * real payment against the student's fees.
 */
export function PaymentClaimModal({
  isOpen,
  onClose,
  onCreated,
  childrenOptions,
}: PaymentClaimModalProps) {
  // Children whose id came back from the server — a claim needs a real studentId.
  const selectable = childrenOptions.filter((c) => c.id > 0);

  const [studentId, setStudentId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentClaimMethod>('EXPRESS_UNION');
  const [paymentDate, setPaymentDate] = useState(todayStr());
  const [receiptNumber, setReceiptNumber] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStudentId(selectable.length === 1 ? String(selectable[0].id) : '');
    setAmount('');
    setMethod('EXPRESS_UNION');
    setPaymentDate(todayStr());
    setReceiptNumber('');
    setReason('');
    setNotes('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      toast.error('Choose which child the payment is for.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter the amount you paid.');
      return;
    }
    if (!paymentDate) {
      toast.error('Enter the date you paid.');
      return;
    }
    if (!reason.trim()) {
      toast.error('Tell the Bursar what the payment is for.');
      return;
    }

    setIsSaving(true);
    try {
      const created = await createFinanceRequest({
        type: 'PAYMENT_CLAIM',
        amount: Number(amount),
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        payload: {
          studentId: Number(studentId),
          paymentMethod: method,
          paymentDate,
          ...(receiptNumber.trim() ? { receiptNumber: receiptNumber.trim() } : {}),
        },
      });
      toast.success('Payment submitted. The Bursar will verify it shortly.');
      onCreated(created);
      onClose();
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Could not submit your payment.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Submit Proof of Payment" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Child *"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          options={[
            { value: '', label: selectable.length ? 'Select your child…' : 'No children available' },
            ...selectable.map((c) => ({
              value: String(c.id),
              label: `${c.name}${c.matricule ? ` (${c.matricule})` : ''}`,
            })),
          ]}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Amount paid (XAF) *"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 50000"
          />
          <Select
            label="Where you paid *"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentClaimMethod)}
            options={PAYMENT_CLAIM_METHODS}
          />
          <Input
            label="Date of payment *"
            type="date"
            max={todayStr()}
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />
          <Input
            label="Receipt number"
            value={receiptNumber}
            onChange={(e) => setReceiptNumber(e.target.value)}
            placeholder="e.g. EU-88213"
            helperText="From your slip — helps the Bursar find it"
          />
        </div>

        <Input
          label="What is this payment for? *"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. First installment for Term 1"
        />
        <TextArea
          label="Anything else the Bursar should know?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="e.g. Paid at the Express Union Bafoussam branch"
        />

        <p className="text-xs text-gray-500">
          Your payment appears on the fee statement once the Bursar confirms it against the bank
          record. You&apos;ll get a notification either way.
        </p>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" color="primary" isLoading={isSaving}>
            Submit Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
