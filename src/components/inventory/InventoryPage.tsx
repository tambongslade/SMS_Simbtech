'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  ArchiveBoxIcon,
  PaperAirplaneIcon,
  ClockIcon,
  XMarkIcon,
  PlusIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { getChatSocket } from '@/lib/chatSocket';
import { searchContacts, type ChatContact } from '@/lib/chatApi';
import {
  type InventoryItem,
  type InventoryHolding,
  type InventoryTransfer,
  type InventoryLedgerEntry,
  INVENTORY_MANAGER_ROLES,
  listItems,
  createItem,
  updateItem,
  grantStock,
  adjustStock,
  listUserHoldings,
  myHoldings,
  myLedger,
  myTransfers,
  createTransfer,
  acceptTransfer,
  rejectTransfer,
  cancelTransfer,
  normalizeTransfer,
} from '@/lib/inventoryApi';

const dateLabel = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800',
    ACCEPTED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// Compact user picker backed by the chat contact search (staff only — parents
// can't hold inventory).
function RecipientPicker({ onPick, selected, onClear }: {
  onPick: (u: ChatContact) => void;
  selected: ChatContact | null;
  onClear: () => void;
}) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<ChatContact[]>([]);

  useEffect(() => {
    if (term.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try { setResults(await searchContacts(term, 10)); } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [term]);

  if (selected) {
    return (
      <div className="flex items-center justify-between p-2 border rounded bg-gray-50 text-sm">
        <span>{selected.name}</span>
        <button type="button" className="text-blue-600 text-xs" onClick={onClear}>Change</button>
      </div>
    );
  }
  return (
    <div>
      <input
        type="text"
        value={term}
        onChange={e => setTerm(e.target.value)}
        placeholder="Search staff…"
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
      />
      {results.length > 0 && (
        <div className="mt-1 border border-gray-200 rounded-md max-h-40 overflow-y-auto bg-white">
          {results.map(u => (
            <button key={u.id} type="button" onClick={() => { onPick(u); setTerm(''); setResults([]); }}
              className="w-full text-left p-2 text-sm hover:bg-gray-100 border-b border-gray-100 last:border-b-0">
              {u.name} <span className="text-xs text-gray-400">{(u.roles || []).join(', ')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InventoryPage() {
  const { user, selectedRole } = useAuth();
  const myId = user?.id;
  const isManager = INVENTORY_MANAGER_ROLES.includes(selectedRole || '');

  const [tab, setTab] = useState<'stock' | 'transfers' | 'manage'>('stock');
  const [holdings, setHoldings] = useState<InventoryHolding[]>([]);
  const [incoming, setIncoming] = useState<InventoryTransfer[]>([]);
  const [outgoing, setOutgoing] = useState<InventoryTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyTransfer, setBusyTransfer] = useState<number | null>(null);

  // Send modal
  const [sendFrom, setSendFrom] = useState<InventoryHolding | null>(null);
  const [sendQty, setSendQty] = useState('');
  const [sendNote, setSendNote] = useState('');
  const [recipient, setRecipient] = useState<ChatContact | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Ledger drawer
  const [ledgerItem, setLedgerItem] = useState<InventoryItem | null>(null);
  const [ledger, setLedger] = useState<InventoryLedgerEntry[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [h, inc, out] = await Promise.all([
        myHoldings(),
        myTransfers({ direction: 'incoming' }),
        myTransfers({ direction: 'outgoing' }),
      ]);
      setHoldings(h);
      setIncoming(inc);
      setOutgoing(out);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load inventory.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime: user room events fire on grants/adjusts and transfer lifecycle
  useEffect(() => {
    const socket = getChatSocket();
    if (!socket) return;
    const onHoldingUpdated = () => refresh();
    const onReceived = (raw: any) => {
      const t = normalizeTransfer(raw);
      toast(`${t.fromUser?.name || 'Someone'} sent you ${t.quantity} ${t.item?.unit || ''} ${t.item?.name || 'items'}`, { icon: '📦', duration: 6000 });
      refresh();
    };
    const onResolved = () => refresh();
    socket.on('inventory.holding.updated', onHoldingUpdated);
    socket.on('inventory.transfer.received', onReceived);
    socket.on('inventory.transfer.resolved', onResolved);
    return () => {
      socket.off('inventory.holding.updated', onHoldingUpdated);
      socket.off('inventory.transfer.received', onReceived);
      socket.off('inventory.transfer.resolved', onResolved);
    };
  }, [refresh]);

  const pendingIncoming = useMemo(() => incoming.filter(t => t.status === 'PENDING'), [incoming]);
  const pendingOutgoing = useMemo(() => outgoing.filter(t => t.status === 'PENDING'), [outgoing]);

  const openLedger = async (item: InventoryItem) => {
    setLedgerItem(item);
    setIsLoadingLedger(true);
    try {
      setLedger(await myLedger({ itemId: item.id, limit: 50 }));
    } catch (error: any) {
      toast.error(error.message || 'Failed to load history.');
    } finally {
      setIsLoadingLedger(false);
    }
  };

  const submitSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendFrom?.item || !recipient) return;
    const qty = parseInt(sendQty, 10);
    if (!qty || qty <= 0) return;
    if (qty > sendFrom.quantity) {
      toast.error(`You only have ${sendFrom.quantity} ${sendFrom.item.unit}.`);
      return;
    }
    setIsSending(true);
    try {
      await createTransfer({ itemId: sendFrom.item.id, toUserId: recipient.id, quantity: qty, note: sendNote || undefined });
      toast.success(`Transfer of ${qty} ${sendFrom.item.unit} ${sendFrom.item.name} sent to ${recipient.name} — awaiting their confirmation.`);
      setSendFrom(null); setSendQty(''); setSendNote(''); setRecipient(null);
      refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send transfer.');
    } finally {
      setIsSending(false);
    }
  };

  const act = async (t: InventoryTransfer, action: 'accept' | 'reject' | 'cancel') => {
    setBusyTransfer(t.id);
    try {
      if (action === 'accept') await acceptTransfer(t.id);
      else if (action === 'reject') await rejectTransfer(t.id);
      else await cancelTransfer(t.id);
      toast.success(action === 'accept' ? 'Transfer accepted.' : action === 'reject' ? 'Transfer rejected — sender refunded.' : 'Transfer cancelled — stock refunded.');
      refresh();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${action} transfer.`);
    } finally {
      setBusyTransfer(null);
    }
  };

  const transferRow = (t: InventoryTransfer, direction: 'in' | 'out') => (
    <li key={t.id} className="px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-900">
          {t.quantity} {t.item?.unit || ''} {t.item?.name || `Item #${t.itemId}`}
        </p>
        {statusBadge(t.status)}
      </div>
      <p className="text-xs text-gray-500 mt-0.5">
        {direction === 'in' ? `From ${t.fromUser?.name || 'Unknown'}` : `To ${t.toUser?.name || 'Unknown'}`}
        {t.note ? ` · ${t.note}` : ''} · {dateLabel(t.createdAt)}
      </p>
      {t.status === 'PENDING' && (
        <div className="flex gap-2 mt-2">
          {direction === 'in' ? (
            <>
              <button onClick={() => act(t, 'accept')} disabled={busyTransfer === t.id}
                className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 disabled:opacity-50">
                Accept
              </button>
              <button onClick={() => act(t, 'reject')} disabled={busyTransfer === t.id}
                className="px-3 py-1 border border-red-200 text-red-600 text-xs rounded-md hover:bg-red-50 disabled:opacity-50">
                Reject
              </button>
            </>
          ) : (
            <button onClick={() => act(t, 'cancel')} disabled={busyTransfer === t.id}
              className="px-3 py-1 border border-gray-300 text-gray-600 text-xs rounded-md hover:bg-gray-50 disabled:opacity-50">
              Cancel
            </button>
          )}
        </div>
      )}
    </li>
  );

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ArchiveBoxIcon className="w-7 h-7 text-blue-600" /> Inventory
        </h1>
        <p className="text-sm text-gray-500 mt-1">Your stock, transfers and history.</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {([
          ['stock', 'My Stock'],
          ['transfers', `Transfers${pendingIncoming.length ? ` (${pendingIncoming.length})` : ''}`],
          ...(isManager ? [['manage', 'Manage']] : []),
        ] as Array<[string, string]>).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
      </div>

      {/* Incoming action tray shown on every tab when non-empty */}
      {pendingIncoming.length > 0 && tab !== 'transfers' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          📦 {pendingIncoming.length} transfer{pendingIncoming.length > 1 ? 's' : ''} awaiting your confirmation —{' '}
          <button onClick={() => setTab('transfers')} className="underline font-medium">review now</button>
        </div>
      )}

      {tab === 'stock' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <p className="p-6 text-gray-500">Loading…</p>
          ) : holdings.length === 0 ? (
            <p className="p-6 text-gray-500 text-center">You don't hold any inventory yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {holdings.map(h => (
                <li key={h.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{h.item?.name || `Item #${h.itemId}`}</p>
                    <p className="text-xs text-gray-500">
                      <span className="font-semibold text-gray-700">{h.quantity}</span> {h.item?.unit || ''}
                      {h.item?.description ? ` · ${h.item.description}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => h.item && openLedger(h.item)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="History">
                      <ClockIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setSendFrom(h); setSendQty(''); setSendNote(''); setRecipient(null); }}
                      disabled={h.quantity <= 0}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-50">
                      <PaperAirplaneIcon className="w-3.5 h-3.5" /> Send
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'transfers' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-900">
              Incoming {pendingIncoming.length > 0 && <span className="text-amber-600">— {pendingIncoming.length} need your action</span>}
            </div>
            {incoming.length === 0 ? <p className="p-4 text-sm text-gray-400">No incoming transfers.</p> : (
              <ul className="divide-y divide-gray-50">{incoming.map(t => transferRow(t, 'in'))}</ul>
            )}
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-900">
              Outgoing {pendingOutgoing.length > 0 && <span className="text-gray-400">— {pendingOutgoing.length} pending</span>}
            </div>
            {outgoing.length === 0 ? <p className="p-4 text-sm text-gray-400">No outgoing transfers.</p> : (
              <ul className="divide-y divide-gray-50">{outgoing.map(t => transferRow(t, 'out'))}</ul>
            )}
          </div>
        </div>
      )}

      {tab === 'manage' && isManager && <ManagerPanel />}

      {/* Send modal */}
      {sendFrom && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSendFrom(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <XMarkIcon className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold mb-1">Send {sendFrom.item?.name}</h3>
            <p className="text-sm text-gray-500 mb-4">You have {sendFrom.quantity} {sendFrom.item?.unit}. The stock leaves your balance immediately and is refunded if rejected or cancelled.</p>
            <form onSubmit={submitSend} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient</label>
                <RecipientPicker selected={recipient} onPick={setRecipient} onClear={() => setRecipient(null)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity ({sendFrom.item?.unit})</label>
                <input type="number" min="1" max={sendFrom.quantity} value={sendQty} onChange={e => setSendQty(e.target.value)}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <input type="text" value={sendNote} onChange={e => setSendNote(e.target.value)}
                  placeholder="e.g. for chem lab" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setSendFrom(null)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700">Cancel</button>
                <button type="submit" disabled={isSending || !recipient || !sendQty}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
                  {isSending ? 'Sending…' : 'Send Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger drawer */}
      {ledgerItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setLedgerItem(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <XMarkIcon className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold mb-4">{ledgerItem.name} — History</h3>
            {isLoadingLedger ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : ledger.length === 0 ? (
              <p className="text-sm text-gray-400">No history for this item.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {ledger.map(l => (
                  <li key={l.id} className="py-2 flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-semibold ${l.delta >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {l.delta >= 0 ? '+' : ''}{l.delta} {ledgerItem.unit}
                      </p>
                      {l.note && <p className="text-xs text-gray-500">{l.note}</p>}
                    </div>
                    <span className="text-[11px] text-gray-400 shrink-0">{dateLabel(l.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Manager panel: catalog CRUD + grant/adjust stock ---

function ManagerPanel() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<InventoryItem | 'new' | null>(null);
  const [form, setForm] = useState({ name: '', description: '', unit: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Grant / adjust
  const [grantUser, setGrantUser] = useState<ChatContact | null>(null);
  const [grantItemId, setGrantItemId] = useState<number | ''>('');
  const [grantQty, setGrantQty] = useState('');
  const [grantNote, setGrantNote] = useState('');
  const [grantMode, setGrantMode] = useState<'grant' | 'adjust'>('grant');
  const [isGranting, setIsGranting] = useState(false);
  const [userHoldings, setUserHoldings] = useState<InventoryHolding[] | null>(null);

  const refreshItems = useCallback(async () => {
    setIsLoading(true);
    try {
      setItems(await listItems(undefined, true));
    } catch (error: any) {
      toast.error(error.message || 'Failed to load catalog.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refreshItems(); }, [refreshItems]);

  useEffect(() => {
    if (!grantUser) { setUserHoldings(null); return; }
    listUserHoldings(grantUser.id).then(setUserHoldings).catch(() => setUserHoldings(null));
  }, [grantUser]);

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editing === 'new') {
        await createItem({ name: form.name.trim(), description: form.description || undefined, unit: form.unit.trim() });
        toast.success('Item created.');
      } else if (editing) {
        await updateItem(editing.id, { name: form.name.trim(), description: form.description || undefined, unit: form.unit.trim() });
        toast.success('Item updated.');
      }
      setEditing(null);
      refreshItems();
    } catch (error: any) {
      toast.error(String(error.message || '').includes('409') ? 'An item with that name already exists.' : error.message || 'Failed to save item.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (item: InventoryItem) => {
    try {
      await updateItem(item.id, { isActive: !item.isActive });
      refreshItems();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update item.');
    }
  };

  const submitGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantUser || !grantItemId) return;
    const n = parseInt(grantQty, 10);
    if (!n) return;
    setIsGranting(true);
    try {
      if (grantMode === 'grant') {
        await grantStock({ userId: grantUser.id, itemId: Number(grantItemId), quantity: Math.abs(n), note: grantNote || undefined });
        toast.success(`Granted ${Math.abs(n)} to ${grantUser.name}.`);
      } else {
        await adjustStock({ userId: grantUser.id, itemId: Number(grantItemId), delta: n, note: grantNote || 'Manual adjustment' });
        toast.success(`Adjusted ${grantUser.name}'s stock by ${n}.`);
      }
      setGrantQty(''); setGrantNote('');
      listUserHoldings(grantUser.id).then(setUserHoldings).catch(() => {});
    } catch (error: any) {
      toast.error(error.message || 'Operation failed.');
    } finally {
      setIsGranting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Catalog */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-sm text-gray-900">Catalog ({items.length})</h2>
          <div className="flex gap-2">
            <button onClick={refreshItems} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md" title="Refresh">
              <ArrowPathIcon className="w-4 h-4" />
            </button>
            <button onClick={() => { setEditing('new'); setForm({ name: '', description: '', unit: '' }); }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700">
              <PlusIcon className="w-3.5 h-3.5" /> New Item
            </button>
          </div>
        </div>
        {isLoading ? (
          <p className="p-4 text-sm text-gray-500">Loading…</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {items.map(item => (
              <li key={item.id} className={`px-4 py-2.5 flex items-center justify-between gap-2 ${!item.isActive ? 'opacity-50' : ''}`}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.name} <span className="text-xs text-gray-400">({item.unit})</span></p>
                  {item.description && <p className="text-xs text-gray-500 truncate">{item.description}</p>}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => { setEditing(item); setForm({ name: item.name, description: item.description || '', unit: item.unit }); }}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Edit">
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => toggleActive(item)}
                    className={`px-2 py-1 text-xs rounded-md border ${item.isActive ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-700 hover:bg-green-50'}`}>
                    {item.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Grant / adjust */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold text-sm text-gray-900 mb-3">Grant / Adjust Staff Stock</h2>
        <form onSubmit={submitGrant} className="space-y-3">
          <RecipientPicker selected={grantUser} onPick={setGrantUser} onClear={() => setGrantUser(null)} />
          {grantUser && userHoldings && userHoldings.length > 0 && (
            <p className="text-xs text-gray-500">
              Current: {userHoldings.map(h => `${h.quantity} ${h.item?.unit || ''} ${h.item?.name || ''}`).join(' · ')}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <select value={grantItemId} onChange={e => setGrantItemId(Number(e.target.value) || '')}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white" required>
              <option value="">Select item…</option>
              {items.filter(i => i.isActive).map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
            </select>
            <select value={grantMode} onChange={e => setGrantMode(e.target.value as any)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">
              <option value="grant">Grant (add)</option>
              <option value="adjust">Adjust (±)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={grantQty} onChange={e => setGrantQty(e.target.value)}
              placeholder={grantMode === 'grant' ? 'Quantity (> 0)' : 'Delta (e.g. -3)'}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm" required />
            <input type="text" value={grantNote} onChange={e => setGrantNote(e.target.value)}
              placeholder={grantMode === 'grant' ? 'Note (optional)' : 'Reason (required)'}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm" required={grantMode === 'adjust'} />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={isGranting || !grantUser || !grantItemId || !grantQty}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
              <CheckIcon className="w-4 h-4" /> {isGranting ? 'Saving…' : grantMode === 'grant' ? 'Grant Stock' : 'Apply Adjustment'}
            </button>
          </div>
        </form>
      </div>

      {/* Item modal */}
      {editing && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setEditing(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <XMarkIcon className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold mb-4">{editing === 'new' ? 'New Item' : `Edit ${editing.name}`}</h3>
            <form onSubmit={saveItem} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="e.g. Laptop" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                <input type="text" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="e.g. pcs" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="e.g. Dell 5490" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700">Cancel</button>
                <button type="submit" disabled={isSaving || !form.name.trim() || !form.unit.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
