// API client for Personnel Inventory (/inventory).
// Wire format is camelCase; socket payloads may arrive snake_case (raw rows),
// so normalizers accept both.

import apiService from './apiService';

export type TransferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export interface InventoryItem {
  id: number;
  name: string;
  description?: string | null;
  unit: string;
  isActive: boolean;
}

export interface InventoryHolding {
  id: number;
  userId: number;
  itemId: number;
  quantity: number;
  updatedAt?: string;
  item?: InventoryItem;
}

export interface InventoryTransfer {
  id: number;
  itemId: number;
  fromUserId: number;
  toUserId: number;
  quantity: number;
  note?: string | null;
  status: TransferStatus;
  createdAt?: string;
  item?: InventoryItem;
  fromUser?: { id: number; name: string };
  toUser?: { id: number; name: string };
}

export interface InventoryLedgerEntry {
  id: number;
  itemId: number;
  delta: number;
  note?: string | null;
  createdAt: string;
  item?: InventoryItem;
  transferId?: number | null;
}

const pick = (o: any, camel: string, snake: string) => o?.[camel] ?? o?.[snake];

export const normalizeItem = (i: any): InventoryItem => ({
  id: i.id,
  name: i.name,
  description: i.description ?? null,
  unit: i.unit,
  isActive: pick(i, 'isActive', 'is_active') ?? true,
});

export const normalizeHolding = (h: any): InventoryHolding => ({
  id: h.id,
  userId: pick(h, 'userId', 'user_id'),
  itemId: pick(h, 'itemId', 'item_id'),
  quantity: h.quantity,
  updatedAt: pick(h, 'updatedAt', 'updated_at'),
  item: h.item ? normalizeItem(h.item) : undefined,
});

export const normalizeTransfer = (t: any): InventoryTransfer => ({
  id: t.id,
  itemId: pick(t, 'itemId', 'item_id'),
  fromUserId: pick(t, 'fromUserId', 'from_user_id'),
  toUserId: pick(t, 'toUserId', 'to_user_id'),
  quantity: t.quantity,
  note: t.note ?? null,
  status: t.status,
  createdAt: pick(t, 'createdAt', 'created_at'),
  item: t.item ? normalizeItem(t.item) : undefined,
  fromUser: pick(t, 'fromUser', 'from_user'),
  toUser: pick(t, 'toUser', 'to_user'),
});

export const normalizeLedger = (l: any): InventoryLedgerEntry => ({
  id: l.id,
  itemId: pick(l, 'itemId', 'item_id'),
  delta: l.delta,
  note: l.note ?? null,
  createdAt: pick(l, 'createdAt', 'created_at'),
  item: l.item ? normalizeItem(l.item) : undefined,
  transferId: pick(l, 'transferId', 'transfer_id') ?? null,
});

// --- Catalog ---

export const listItems = async (search?: string, includeInactive = false): Promise<InventoryItem[]> => {
  const qs = new URLSearchParams();
  if (search) qs.append('search', search);
  if (includeInactive) qs.append('includeInactive', 'true');
  const res = await apiService.get<{ data: any[] }>(`/inventory/items${qs.toString() ? `?${qs}` : ''}`);
  return (res.data || []).map(normalizeItem);
};

export const createItem = async (body: { name: string; description?: string; unit: string }): Promise<InventoryItem> => {
  const res = await apiService.post<{ data: any }>('/inventory/items', body);
  return normalizeItem(res.data);
};

export const updateItem = async (
  id: number,
  body: { name?: string; description?: string; unit?: string; isActive?: boolean }
): Promise<InventoryItem> => {
  const res = await apiService.patch<{ data: any }>(`/inventory/items/${id}`, body);
  return normalizeItem(res.data);
};

export const deleteItem = async (id: number): Promise<void> => {
  await apiService.delete(`/inventory/items/${id}`);
};

// --- Manager stock ops ---

export const grantStock = async (body: { userId: number; itemId: number; quantity: number; note?: string }): Promise<InventoryHolding> => {
  const res = await apiService.post<{ data: any }>('/inventory/holdings/grant', body);
  return normalizeHolding(res.data);
};

export const adjustStock = async (body: { userId: number; itemId: number; delta: number; note: string }): Promise<InventoryHolding> => {
  const res = await apiService.post<{ data: any }>('/inventory/holdings/adjust', body);
  return normalizeHolding(res.data);
};

export const listUserHoldings = async (userId: number): Promise<InventoryHolding[]> => {
  const res = await apiService.get<{ data: any[] }>(`/inventory/holdings?userId=${userId}`);
  return (res.data || []).map(normalizeHolding);
};

// --- Personal ---

export const myHoldings = async (): Promise<InventoryHolding[]> => {
  const res = await apiService.get<{ data: any[] }>('/inventory/me');
  return (res.data || []).map(normalizeHolding);
};

export const myLedger = async (params: { itemId?: number; limit?: number; before?: string } = {}): Promise<InventoryLedgerEntry[]> => {
  const qs = new URLSearchParams();
  if (params.itemId) qs.append('itemId', String(params.itemId));
  qs.append('limit', String(params.limit ?? 50));
  if (params.before) qs.append('before', params.before);
  const res = await apiService.get<{ data: any[] }>(`/inventory/me/ledger?${qs.toString()}`);
  return (res.data || []).map(normalizeLedger);
};

export const myTransfers = async (params: { direction?: 'incoming' | 'outgoing'; status?: TransferStatus } = {}): Promise<InventoryTransfer[]> => {
  const qs = new URLSearchParams();
  if (params.direction) qs.append('direction', params.direction);
  if (params.status) qs.append('status', params.status);
  const res = await apiService.get<{ data: any[] }>(`/inventory/me/transfers${qs.toString() ? `?${qs}` : ''}`);
  return (res.data || []).map(normalizeTransfer);
};

// --- Transfers ---

export const createTransfer = async (body: { itemId: number; toUserId: number; quantity: number; note?: string }): Promise<InventoryTransfer> => {
  const res = await apiService.post<{ data: any }>('/inventory/transfers', body);
  return normalizeTransfer(res.data);
};

export const acceptTransfer = async (id: number): Promise<InventoryTransfer> => {
  const res = await apiService.post<{ data: any }>(`/inventory/transfers/${id}/accept`, {});
  return normalizeTransfer(res.data);
};

export const rejectTransfer = async (id: number): Promise<InventoryTransfer> => {
  const res = await apiService.post<{ data: any }>(`/inventory/transfers/${id}/reject`, {});
  return normalizeTransfer(res.data);
};

export const cancelTransfer = async (id: number): Promise<InventoryTransfer> => {
  const res = await apiService.post<{ data: any }>(`/inventory/transfers/${id}/cancel`, {});
  return normalizeTransfer(res.data);
};

export const INVENTORY_MANAGER_ROLES = ['MANAGER', 'SUPER_MANAGER'];
