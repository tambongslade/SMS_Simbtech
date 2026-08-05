'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Button, Modal, TextArea } from '@/components/ui';
import {
  approveFinanceRequest,
  rejectFinanceRequest,
  completeFinanceRequest,
  TYPE_LABELS,
  fmtMoney,
  type FinanceAction,
  type FinanceRequest,
} from '@/lib/financeRequestsApi';
import { TypeBadge } from './StatusBadge';

const ACTION_META: Record<
  FinanceAction,
  { title: string; verb: string; color: 'primary' | 'success' | 'danger'; notesRequired: boolean; placeholder: string }
> = {
  approve: {
    title: 'Approve Request',
    verb: 'Approve',
    color: 'success',
    notesRequired: false,
    placeholder: 'e.g. Approved — partner letter on file',
  },
  reject: {
    title: 'Reject Request',
    verb: 'Reject',
    color: 'danger',
    notesRequired: true,
    placeholder: 'Reason for rejection (e.g. Bank has no record)',
  },
  complete: {
    title: 'Complete Request',
    verb: 'Mark Complete',
    color: 'primary',
    notesRequired: false,
    placeholder: 'e.g. Received cash 2026-06-03 / Found XAF 50000 deposit',
  },
};

interface ActionModalProps {
  request: FinanceRequest | null;
  action: FinanceAction | null;
  onClose: () => void;
  onDone: (updated: FinanceRequest) => void;
}

export function ActionModal({ request, action, onClose, onDone }: ActionModalProps) {
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const open = !!request && !!action;
  const meta = action ? ACTION_META[action] : null;

  const handleClose = () => {
    if (isSaving) return;
    setNotes('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !action || !meta) return;
    if (meta.notesRequired && !notes.trim()) {
      toast.error('Please provide a note explaining this action.');
      return;
    }
    setIsSaving(true);
    try {
      const body = { notes: notes.trim() || undefined };
      let updated: FinanceRequest;
      if (action === 'approve') updated = await approveFinanceRequest(request.id, body);
      else if (action === 'reject') updated = await rejectFinanceRequest(request.id, body);
      else updated = await completeFinanceRequest(request.id, body);
      toast.success(`Request #${request.id} ${updated.status.toLowerCase()}.`);
      setNotes('');
      onDone(updated);
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Action failed.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={handleClose} title={meta?.title || 'Request'} size="md">
      {request && meta && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex items-center justify-between">
              <TypeBadge type={request.type} />
              <span className="text-gray-400">#{request.id}</span>
            </div>
            <div className="text-gray-900 font-medium">{request.reason}</div>
            {request.amount != null && (
              <div className="text-gray-600">Amount: {fmtMoney(request.amount)}</div>
            )}
          </div>

          {/* These two types have real financial side effects on approval. */}
          {action === 'approve' && request.type === 'PAYMENT_CLAIM' && (
            <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              Approving records a payment of {fmtMoney(request.amount)} against the student&apos;s
              fees straight away. Do not also record it manually.
            </div>
          )}
          {action === 'approve' && request.type === 'REFUND' && (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Approving issues the refund and reduces the amount paid on file by{' '}
              {fmtMoney(request.amount)}. The Bursar and the parents are notified.
            </div>
          )}

          <TextArea
            label={`Notes${meta.notesRequired ? ' *' : ' (optional)'}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={meta.placeholder}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" color={meta.color} isLoading={isSaving}>
              {meta.verb} {TYPE_LABELS[request.type]}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
