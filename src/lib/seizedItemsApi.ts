// API client for seized items (DM → Principal custody transfer flow).
// Requests go camelCase (middleware converts); responses normalized from
// either casing.

import apiService from './apiService';

export type SeizedItemStatus = 'IN_CUSTODY' | 'RELEASED' | 'DESTROYED';
export type SeizedTransferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export interface PersonRef {
  id: number;
  name: string;
  matricule?: string;
}

export interface SeizedItemTransfer {
  id: number;
  fromUserId: number;
  toUserId: number;
  status: SeizedTransferStatus;
  note?: string | null;
  initiatedAt?: string;
  resolvedAt?: string | null;
  fromUser?: PersonRef;
  toUser?: PersonRef;
}

export interface SeizedItem {
  id: number;
  enrollmentId: number;
  itemDescription: string;
  reason: string;
  photoUrl?: string | null;
  location?: string | null;
  status: SeizedItemStatus;
  seizedAt?: string;
  seizedBy?: PersonRef | null;
  currentCustodian?: PersonRef | null;
  currentCustodianId?: number | null;
  releasedTo?: PersonRef | null;
  releasedAt?: string | null;
  releasedNotes?: string | null;
  destroyedAt?: string | null;
  destroyedNotes?: string | null;
  enrollment?: {
    id: number;
    student?: { id: number; matricule?: string; name: string };
    subClass?: { id: number; name: string; class?: { id: number; name: string } };
  };
  transfers: SeizedItemTransfer[];
}

const pick = (o: any, camel: string, snake: string) => o?.[camel] ?? o?.[snake];

const normalizeTransfer = (t: any): SeizedItemTransfer => ({
  id: t.id,
  fromUserId: pick(t, 'fromUserId', 'from_user_id'),
  toUserId: pick(t, 'toUserId', 'to_user_id'),
  status: t.status,
  note: t.note ?? null,
  initiatedAt: pick(t, 'initiatedAt', 'initiated_at'),
  resolvedAt: pick(t, 'resolvedAt', 'resolved_at') ?? null,
  fromUser: pick(t, 'fromUser', 'from_user'),
  toUser: pick(t, 'toUser', 'to_user'),
});

export const normalizeSeizedItem = (i: any): SeizedItem => ({
  id: i.id,
  enrollmentId: pick(i, 'enrollmentId', 'enrollment_id'),
  itemDescription: pick(i, 'itemDescription', 'item_description'),
  reason: i.reason,
  photoUrl: pick(i, 'photoUrl', 'photo_url') ?? null,
  location: i.location ?? null,
  status: i.status,
  seizedAt: pick(i, 'seizedAt', 'seized_at'),
  seizedBy: pick(i, 'seizedBy', 'seized_by') ?? null,
  currentCustodian: pick(i, 'currentCustodian', 'current_custodian') ?? null,
  currentCustodianId:
    pick(i, 'currentCustodianId', 'current_custodian_id') ??
    (pick(i, 'currentCustodian', 'current_custodian')?.id ?? null),
  releasedTo: pick(i, 'releasedTo', 'released_to') ?? null,
  releasedAt: pick(i, 'releasedAt', 'released_at') ?? null,
  releasedNotes: pick(i, 'releasedNotes', 'released_notes') ?? null,
  destroyedAt: pick(i, 'destroyedAt', 'destroyed_at') ?? null,
  destroyedNotes: pick(i, 'destroyedNotes', 'destroyed_notes') ?? null,
  enrollment: (() => {
    const e = i.enrollment;
    if (!e) return undefined;
    return {
      id: e.id,
      student: e.student,
      subClass: pick(e, 'subClass', 'sub_class'),
    };
  })(),
  transfers: (i.transfers || []).map(normalizeTransfer),
});

export const listSeizedItems = async (params: {
  status?: SeizedItemStatus;
  enrollmentId?: number;
  studentId?: number;
  custodianId?: number;
  seizedById?: number;
  onlyMineAsCustodian?: boolean;
  limit?: number;
} = {}): Promise<SeizedItem[]> => {
  const qs = new URLSearchParams();
  if (params.status) qs.append('status', params.status);
  if (params.enrollmentId) qs.append('enrollmentId', String(params.enrollmentId));
  if (params.studentId) qs.append('studentId', String(params.studentId));
  if (params.custodianId) qs.append('custodianId', String(params.custodianId));
  if (params.seizedById) qs.append('seizedById', String(params.seizedById));
  if (params.onlyMineAsCustodian) qs.append('onlyMineAsCustodian', 'true');
  qs.append('limit', String(params.limit ?? 100));
  const res = await apiService.get<{ data: any[] }>(`/seized-items?${qs.toString()}`);
  return (res.data || []).map(normalizeSeizedItem);
};

export const getSeizedItem = async (id: number): Promise<SeizedItem> => {
  const res = await apiService.get<{ data: any }>(`/seized-items/${id}`);
  return normalizeSeizedItem(res.data);
};

export const recordSeizure = async (body: {
  enrollmentId: number;
  itemDescription: string;
  reason: string;
  location?: string;
  photoUrl?: string;
}): Promise<SeizedItem> => {
  const res = await apiService.post<{ data: any }>('/seized-items', body);
  return normalizeSeizedItem(res.data);
};

export const updateSeizure = async (
  id: number,
  body: { itemDescription?: string; reason?: string; location?: string; photoUrl?: string }
): Promise<SeizedItem> => {
  const res = await apiService.patch<{ data: any }>(`/seized-items/${id}`, body);
  return normalizeSeizedItem(res.data);
};

export const initiateSeizedTransfer = async (
  itemId: number,
  body: { toUserId: number; note?: string }
): Promise<{ item: SeizedItem; transfer: SeizedItemTransfer }> => {
  const res = await apiService.post<{ data: any }>(`/seized-items/${itemId}/transfers`, body);
  return {
    item: normalizeSeizedItem(res.data.item ?? res.data),
    transfer: normalizeTransfer(res.data.transfer ?? {}),
  };
};

export const acceptSeizedTransfer = async (itemId: number, transferId: number): Promise<void> => {
  await apiService.post(`/seized-items/${itemId}/transfers/${transferId}/accept`, {});
};

export const rejectSeizedTransfer = async (itemId: number, transferId: number): Promise<void> => {
  await apiService.post(`/seized-items/${itemId}/transfers/${transferId}/reject`, {});
};

export const cancelSeizedTransfer = async (itemId: number, transferId: number): Promise<void> => {
  await apiService.post(`/seized-items/${itemId}/transfers/${transferId}/cancel`, {});
};

export const releaseSeizedItem = async (
  itemId: number,
  body: { releasedToId: number; notes?: string }
): Promise<SeizedItem> => {
  const res = await apiService.post<{ data: any }>(`/seized-items/${itemId}/release`, body);
  return normalizeSeizedItem(res.data);
};

export const destroySeizedItem = async (itemId: number, notes?: string): Promise<SeizedItem> => {
  const res = await apiService.post<{ data: any }>(`/seized-items/${itemId}/destroy`, { notes: notes || undefined });
  return normalizeSeizedItem(res.data);
};

export const SEIZED_ITEM_ROLES = [
  'DISCIPLINE_MASTER', 'SENIOR_DISCIPLINE_MASTER', 'DEAN_OF_DISCIPLINE',
  'VICE_PRINCIPAL', 'PRINCIPAL', 'MANAGER', 'SUPER_MANAGER',
];

export const SEIZED_DESTROY_ROLES = ['PRINCIPAL', 'SUPER_MANAGER'];
