'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { PaperClipIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { Button, Input, Select, TextArea, Modal } from '@/components/ui';
import { listRecipientUsers, type RecipientUser } from '@/lib/financeRequestsApi';
import {
  createExpenditure,
  updateExpenditure,
  EXPENDITURE_CATEGORIES,
  EXPENDITURE_PAYMENT_METHODS,
  type Expenditure,
  type ExpenditureCategory,
  type ExpenditureInput,
  type ExpenditurePaymentMethod,
} from '@/lib/expendituresApi';

interface ExpenditureFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (saved: Expenditure) => void;
  // When provided, the modal edits this row; otherwise it creates a new one.
  editing?: Expenditure | null;
  // Force the payment method to CASH and hide the picker (bursar view).
  onlyCashMethod?: boolean;
}

const todayStr = () => new Date().toISOString().split('T')[0];
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp';

type RecipientMode = 'text' | 'user';

export function ExpenditureFormModal({ isOpen, onClose, onSaved, editing, onlyCashMethod = false }: ExpenditureFormModalProps) {
  const isEdit = !!editing;

  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState<ExpenditureCategory>('SUPPLIES');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('text');
  const [recipient, setRecipient] = useState('');
  const [recipientUserId, setRecipientUserId] = useState('');
  const [recipientQuery, setRecipientQuery] = useState('');
  const [recipients, setRecipients] = useState<RecipientUser[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<ExpenditurePaymentMethod | ''>('');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Prefill / reset whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setDate(editing.date ? editing.date.split('T')[0] : todayStr());
      setCategory(editing.category);
      setDescription(editing.description || '');
      setAmount(String(editing.amount ?? ''));
      setRecipientMode(editing.recipientUserId ? 'user' : 'text');
      setRecipient(editing.recipient || '');
      setRecipientUserId(editing.recipientUserId ? String(editing.recipientUserId) : '');
      setPaymentMethod(onlyCashMethod ? 'CASH' : (editing.paymentMethod || ''));
      setNotes(editing.notes || '');
    } else {
      setDate(todayStr());
      setCategory('SUPPLIES');
      setDescription('');
      setAmount('');
      setRecipientMode('text');
      setRecipient('');
      setRecipientUserId('');
      setPaymentMethod(onlyCashMethod ? 'CASH' : '');
      setNotes('');
    }
    setRecipientQuery('');
    setReceipt(null);
  }, [isOpen, editing]);

  // Load staff users for the "pick a user" recipient mode.
  useEffect(() => {
    if (isOpen) {
      listRecipientUsers().then(setRecipients).catch(() => setRecipients([]));
    }
  }, [isOpen]);

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

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > MAX_RECEIPT_BYTES) {
      toast.error('Receipt must be 10 MB or smaller.');
      e.target.value = '';
      return;
    }
    setReceipt(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return toast.error('Description is required.');
    if (!amount || Number(amount) <= 0) return toast.error('Amount must be greater than 0.');

    const payload: ExpenditureInput = {
      date,
      category,
      description: description.trim(),
      amount: Number(amount),
      paymentMethod: paymentMethod || undefined,
      notes: notes.trim() || undefined,
      receipt,
    };
    if (recipientMode === 'user' && recipientUserId) {
      payload.recipientUserId = Number(recipientUserId);
    } else if (recipientMode === 'text' && recipient.trim()) {
      payload.recipient = recipient.trim();
    }

    setIsSaving(true);
    try {
      const saved = isEdit
        ? await updateExpenditure(editing!.id, payload)
        : await createExpenditure(payload);
      toast.success(isEdit ? 'Expenditure updated.' : 'Expenditure logged.');
      onSaved(saved);
      onClose();
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Failed to save expenditure.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Expenditure' : 'Log an Expense'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Date *" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <Select
            label="Category *"
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenditureCategory)}
            options={EXPENDITURE_CATEGORIES}
          />
        </div>

        <Input
          label="Description *"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was the money for?"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Amount (XAF) *"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          {onlyCashMethod ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment method</label>
              <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-700">
                Cash
              </div>
            </div>
          ) : (
            <Select
              label="Payment method (optional)"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as ExpenditurePaymentMethod | '')}
              options={[{ value: '', label: '— None —' }, ...EXPENDITURE_PAYMENT_METHODS]}
            />
          )}
        </div>

        {/* Recipient: free-text vendor OR a system user */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Recipient (optional)</span>
            <div className="inline-flex rounded-md border border-gray-200 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setRecipientMode('text')}
                className={`px-3 py-1 ${recipientMode === 'text' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
              >
                Vendor / text
              </button>
              <button
                type="button"
                onClick={() => setRecipientMode('user')}
                className={`px-3 py-1 ${recipientMode === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
              >
                Staff user
              </button>
            </div>
          </div>

          {recipientMode === 'text' ? (
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. Bamenda Hardware Supplies"
            />
          ) : (
            <div className="space-y-2">
              <Input
                value={recipientQuery}
                onChange={(e) => setRecipientQuery(e.target.value)}
                placeholder="Filter staff by name, matricule or email…"
              />
              <Select
                value={recipientUserId}
                onChange={(e) => setRecipientUserId(e.target.value)}
                options={[
                  { value: '', label: recipients.length ? 'Select staff user…' : 'Loading staff…' },
                  ...filteredRecipients.map((u) => ({
                    value: String(u.id),
                    label: `${u.name}${u.matricule ? ` (${u.matricule})` : ''}`,
                  })),
                ]}
              />
            </div>
          )}
        </div>

        <TextArea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />

        {/* Receipt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Receipt (optional)</label>
          {isEdit && editing?.receiptUrl && !receipt && (
            <a
              href={editing.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-2"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" /> View current receipt
            </a>
          )}
          <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-600">
            <PaperClipIcon className="h-5 w-5 text-gray-400" />
            <span>{receipt ? receipt.name : 'Attach PDF / JPG / PNG / WEBP (≤ 10 MB)'}</span>
            <input type="file" accept={ACCEPT} onChange={handleFile} className="hidden" />
          </label>
          {isEdit && editing?.receiptUrl && receipt && (
            <p className="text-xs text-amber-600 mt-1">Uploading a new file replaces the existing receipt.</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" color="primary" isLoading={isSaving}>
            {isEdit ? 'Save Changes' : 'Log Expense'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
