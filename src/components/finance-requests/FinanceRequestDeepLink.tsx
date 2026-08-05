'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Button, Modal } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import {
  getFinanceRequest,
  availableActions,
  fmtMoney,
  fmtDateTime,
  payloadSummary,
  TYPE_LABELS,
  type FinanceAction,
  type FinanceRequest,
} from '@/lib/financeRequestsApi';
import { StatusBadge, TypeBadge } from './StatusBadge';
import { ActionModal } from './ActionModal';

const ACTION_LABEL: Record<FinanceAction, string> = {
  approve: 'Approve',
  reject: 'Reject',
  complete: 'Complete',
};

const ACTION_COLOR: Record<FinanceAction, 'success' | 'danger' | 'primary'> = {
  approve: 'success',
  reject: 'danger',
  complete: 'primary',
};

/**
 * Opens a single finance request in a modal when the page is reached with
 * `?requestId=<id>` — the landing point for APPROVAL_NEEDED / APPROVAL_APPROVED
 * / FEE_UPDATE notifications whose entityType is "FinanceRequest".
 */
function DeepLinkInner({ onActed }: { onActed?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, selectedRole } = useAuth();

  const requestId = Number(searchParams.get('requestId'));
  const [request, setRequest] = useState<FinanceRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [action, setAction] = useState<FinanceAction | null>(null);

  useEffect(() => {
    if (!requestId || isNaN(requestId)) {
      setRequest(null);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    getFinanceRequest(requestId)
      .then((req) => {
        if (!cancelled) setRequest(req);
      })
      .catch((error: any) => {
        if (cancelled) return;
        setRequest(null);
        if (error?.message !== 'Unauthorized') {
          toast.error(error?.message || `Could not open request #${requestId}.`);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  // Drop the query param so the modal doesn't reopen on back/refresh.
  const close = useCallback(() => {
    setRequest(null);
    setAction(null);
    router.replace(pathname);
  }, [router, pathname]);

  const handleActionDone = (updated: FinanceRequest) => {
    setRequest(updated);
    setAction(null);
    onActed?.();
  };

  if (!requestId || isNaN(requestId)) return null;

  const actions = request ? availableActions(request, selectedRole, user?.id) : [];

  return (
    <>
      <Modal
        isOpen={!action}
        onClose={close}
        title={request ? `${TYPE_LABELS[request.type]} #${request.id}` : 'Finance Request'}
        size="md"
      >
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading request…</div>
        ) : !request ? (
          <div className="py-8 text-center text-gray-500">
            Request #{requestId} is not available to you.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <TypeBadge type={request.type} />
              <StatusBadge status={request.status} />
            </div>

            <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
              <div className="font-medium text-gray-900">{request.reason}</div>
              <div className="text-gray-500">{payloadSummary(request)}</div>
              {request.amount != null && (
                <div className="text-gray-700">Amount: {fmtMoney(request.amount)}</div>
              )}
              {request.notes && <div className="text-gray-500 italic">“{request.notes}”</div>}
            </div>

            <dl className="text-sm space-y-1">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Requested by</dt>
                <dd className="text-gray-900 text-right">
                  {request.requestedBy?.name || `User #${request.requestedById}`}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Created</dt>
                <dd className="text-gray-900 text-right">{fmtDateTime(request.createdAt)}</dd>
              </div>
              {request.actedBy && (
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Decided by</dt>
                  <dd className="text-gray-900 text-right">
                    {request.actedBy.name} · {fmtDateTime(request.actedAt)}
                  </dd>
                </div>
              )}
              {request.actedNotes && (
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Decision notes</dt>
                  <dd className="text-gray-900 text-right italic">“{request.actedNotes}”</dd>
                </div>
              )}
            </dl>

            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-gray-200">
              <Button variant="outline" onClick={close}>
                Close
              </Button>
              {actions.map((a) => (
                <Button
                  key={a}
                  color={ACTION_COLOR[a]}
                  variant={a === 'reject' ? 'outline' : 'solid'}
                  onClick={() => setAction(a)}
                >
                  {ACTION_LABEL[a]}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <ActionModal
        request={action ? request : null}
        action={action}
        onClose={() => setAction(null)}
        onDone={handleActionDone}
      />
    </>
  );
}

export function FinanceRequestDeepLink(props: { onActed?: () => void }) {
  return (
    <Suspense fallback={null}>
      <DeepLinkInner {...props} />
    </Suspense>
  );
}
