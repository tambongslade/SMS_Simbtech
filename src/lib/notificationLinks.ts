import { financeRequestsPath } from './financeRequestsApi';
import type { Notification } from './notifications-api';

/**
 * Where a notification should take the user when they tap it.
 *
 * The backend's own `actionUrl` wins when it points inside the app. Otherwise
 * we resolve the link from the entity it references — finance requests
 * (payment claims, refunds, fee reductions…) land on the active role's finance
 * requests page with `?requestId=`, which opens the request in a modal.
 */
export const notificationLink = (
  notification: Pick<Notification, 'actionUrl' | 'entityType' | 'entityId'>,
  role: string | null | undefined,
): string | null => {
  if (notification.actionUrl?.startsWith('/dashboard')) return notification.actionUrl;

  if (notification.entityType === 'FinanceRequest' && notification.entityId) {
    const base = financeRequestsPath(role);
    if (base) return `${base}?requestId=${notification.entityId}`;
  }

  return null;
};
