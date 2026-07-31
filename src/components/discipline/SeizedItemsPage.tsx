'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  ArchiveBoxXMarkIcon,
  PlusIcon,
  XMarkIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  CameraIcon,
} from '@heroicons/react/24/outline';
import apiService from '@/lib/apiService';
import { useAuth } from '@/components/context/AuthContext';
import { getChatSocket } from '@/lib/chatSocket';
import { searchContacts, uploadChatFile, type ChatContact } from '@/lib/chatApi';
import { searchUsers, type ChatUserLite } from '@/lib/chatApi';
import {
  type SeizedItem,
  type SeizedItemStatus,
  SEIZED_DESTROY_ROLES,
  listSeizedItems,
  recordSeizure,
  initiateSeizedTransfer,
  acceptSeizedTransfer,
  rejectSeizedTransfer,
  cancelSeizedTransfer,
  releaseSeizedItem,
  destroySeizedItem,
  normalizeSeizedItem,
} from '@/lib/seizedItemsApi';

const dateLabel = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

function statusBadge(status: SeizedItemStatus) {
  const styles: Record<SeizedItemStatus, string> = {
    IN_CUSTODY: 'bg-blue-100 text-blue-800',
    RELEASED: 'bg-green-100 text-green-800',
    DESTROYED: 'bg-red-100 text-red-700',
  };
  const labels: Record<SeizedItemStatus, string> = {
    IN_CUSTODY: 'In custody',
    RELEASED: 'Released',
    DESTROYED: 'Destroyed',
  };
  return <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${styles[status]}`}>{labels[status]}</span>;
}

// Small staff picker (chat contacts = staff only)
function StaffPicker({ selected, onPick, onClear, placeholder }: {
  selected: ChatContact | ChatUserLite | null;
  onPick: (u: any) => void;
  onClear: () => void;
  placeholder?: string;
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
      <input type="text" value={term} onChange={e => setTerm(e.target.value)}
        placeholder={placeholder || 'Search staff…'} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
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

// User picker for release (parents included, so it uses /users search)
function AnyUserPicker({ selected, onPick, onClear }: {
  selected: ChatUserLite | null;
  onPick: (u: ChatUserLite) => void;
  onClear: () => void;
}) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<ChatUserLite[]>([]);
  useEffect(() => {
    if (term.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try { setResults(await searchUsers(term, 10)); } catch { setResults([]); }
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
      <input type="text" value={term} onChange={e => setTerm(e.target.value)}
        placeholder="Search person (parent or student)…" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
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

export default function SeizedItemsPage() {
  const { user, selectedRole } = useAuth();
  const myId = user?.id;
  const canDestroy = SEIZED_DESTROY_ROLES.includes(selectedRole || '');

  const [items, setItems] = useState<SeizedItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<SeizedItemStatus | 'all'>('IN_CUSTODY');
  const [onlyMine, setOnlyMine] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Record modal
  const [showRecord, setShowRecord] = useState(false);
  // Transfer modal / release modal / destroy modal targets
  const [transferTarget, setTransferTarget] = useState<SeizedItem | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<SeizedItem | null>(null);
  const [destroyTarget, setDestroyTarget] = useState<SeizedItem | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setItems(await listSeizedItems({
        status: statusFilter === 'all' ? undefined : statusFilter,
        onlyMineAsCustodian: onlyMine || undefined,
        limit: 200,
      }));
    } catch (error: any) {
      toast.error(error.message || 'Failed to load seized items.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, onlyMine]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime
  useEffect(() => {
    const socket = getChatSocket();
    if (!socket) return;
    const onReceived = (raw: any) => {
      const item = normalizeSeizedItem(raw);
      toast(
        `${item.seizedBy?.name || 'Someone'} wants to transfer "${item.itemDescription}" to you` +
        (item.enrollment?.student?.name ? ` (from ${item.enrollment.student.name})` : ''),
        { icon: '📥', duration: 7000 }
      );
      refresh();
    };
    const onResolved = () => refresh();
    socket.on('discipline.seized_item.transfer.received', onReceived);
    socket.on('discipline.seized_item.transfer.resolved', onResolved);
    return () => {
      socket.off('discipline.seized_item.transfer.received', onReceived);
      socket.off('discipline.seized_item.transfer.resolved', onResolved);
    };
  }, [refresh]);

  const pendingForMe = useMemo(
    () => items.filter(i => i.transfers.some(t => t.status === 'PENDING' && t.toUserId === myId)),
    [items, myId]
  );

  const act = async (fn: () => Promise<any>, itemId: number, successMsg: string) => {
    setBusyId(itemId);
    try {
      await fn();
      toast.success(successMsg);
      refresh();
    } catch (error: any) {
      toast.error(error.message || 'Action failed.');
    } finally {
      setBusyId(null);
    }
  };

  const itemCard = (item: SeizedItem) => {
    const pending = item.transfers.find(t => t.status === 'PENDING');
    const iAmCustodian = item.currentCustodianId === myId;
    const pendingToMe = pending && pending.toUserId === myId;
    const pendingFromMe = pending && pending.fromUserId === myId;
    return (
      <div key={item.id} className="bg-white rounded-lg shadow p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">{item.itemDescription}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {item.enrollment?.student?.name || 'Student'}
              {item.enrollment?.subClass ? ` · ${item.enrollment.subClass.class?.name || ''} ${item.enrollment.subClass.name}` : ''}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{item.reason}{item.location ? ` · ${item.location}` : ''}</p>
            <p className="text-[11px] text-gray-400 mt-1">
              Seized by {item.seizedBy?.name || '—'} · {dateLabel(item.seizedAt)}
            </p>
            {item.status === 'IN_CUSTODY' && (
              <p className="text-[11px] mt-0.5">
                <span className={iAmCustodian ? 'text-green-700 font-medium' : 'text-gray-500'}>
                  {iAmCustodian ? 'In your custody' : `Held by ${item.currentCustodian?.name || '—'}`}
                </span>
                {pending && (
                  <span className="text-amber-600">
                    {' '}· transfer pending {pending.toUserId === myId ? 'your acceptance' : `with ${pending.toUser?.name || `user #${pending.toUserId}`}`}
                  </span>
                )}
              </p>
            )}
            {item.status === 'RELEASED' && (
              <p className="text-[11px] text-green-700 mt-0.5">Released to {item.releasedTo?.name || '—'} · {dateLabel(item.releasedAt)}{item.releasedNotes ? ` · ${item.releasedNotes}` : ''}</p>
            )}
            {item.status === 'DESTROYED' && (
              <p className="text-[11px] text-red-600 mt-0.5">Destroyed · {dateLabel(item.destroyedAt)}{item.destroyedNotes ? ` · ${item.destroyedNotes}` : ''}</p>
            )}
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1.5">
            {statusBadge(item.status)}
            {item.photoUrl && (
              <a href={item.photoUrl} target="_blank" rel="noreferrer" className="text-blue-600" title="View photo">
                <CameraIcon className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {item.status === 'IN_CUSTODY' && (
          <div className="flex flex-wrap gap-2 mt-3">
            {pendingToMe && pending && (
              <>
                <button
                  onClick={() => act(() => acceptSeizedTransfer(item.id, pending.id), item.id, 'Transfer accepted — the item is now in your custody.')}
                  disabled={busyId === item.id}
                  className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Accept Custody
                </button>
                <button
                  onClick={() => act(() => rejectSeizedTransfer(item.id, pending.id), item.id, 'Transfer rejected.')}
                  disabled={busyId === item.id}
                  className="px-3 py-1.5 border border-red-200 text-red-600 text-xs rounded-md hover:bg-red-50 disabled:opacity-50"
                >
                  Reject
                </button>
              </>
            )}
            {pendingFromMe && pending && (
              <button
                onClick={() => act(() => cancelSeizedTransfer(item.id, pending.id), item.id, 'Transfer cancelled.')}
                disabled={busyId === item.id}
                className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel Transfer
              </button>
            )}
            {iAmCustodian && !pending && (
              <>
                <button
                  onClick={() => setTransferTarget(item)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
                >
                  <PaperAirplaneIcon className="w-3.5 h-3.5" /> Transfer Custody
                </button>
                <button
                  onClick={() => setReleaseTarget(item)}
                  className="px-3 py-1.5 border border-green-300 text-green-700 text-xs rounded-md hover:bg-green-50"
                >
                  Release to Parent
                </button>
                {canDestroy && (
                  <button
                    onClick={() => setDestroyTarget(item)}
                    className="px-3 py-1.5 border border-red-300 text-red-600 text-xs rounded-md hover:bg-red-50"
                  >
                    Destroy
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ArchiveBoxXMarkIcon className="w-7 h-7 text-blue-600" /> Seized Items
          </h1>
          <p className="text-sm text-gray-500 mt-1">Items confiscated from students, with custody tracking.</p>
        </div>
        <button
          onClick={() => setShowRecord(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          <PlusIcon className="w-4 h-4" /> Record Seizure
        </button>
      </div>

      {pendingForMe.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          📥 {pendingForMe.length} custody transfer{pendingForMe.length > 1 ? 's' : ''} awaiting your acceptance below.
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white">
            <option value="IN_CUSTODY">In custody</option>
            <option value="RELEASED">Released</option>
            <option value="DESTROYED">Destroyed</option>
            <option value="all">All</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
          <input type="checkbox" checked={onlyMine} onChange={e => setOnlyMine(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
          Only items I hold
        </label>
        <button onClick={refresh}
          className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm">
          <ArrowPathIcon className="w-4 h-4" /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Loading seized items…</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">No seized items found.</div>
      ) : (
        <div className="space-y-3">
          {/* Items awaiting my acceptance first */}
          {[...items].sort((a, b) => {
            const aMine = a.transfers.some(t => t.status === 'PENDING' && t.toUserId === myId) ? 0 : 1;
            const bMine = b.transfers.some(t => t.status === 'PENDING' && t.toUserId === myId) ? 0 : 1;
            return aMine - bMine;
          }).map(itemCard)}
        </div>
      )}

      {showRecord && (
        <RecordSeizureModal
          onClose={() => setShowRecord(false)}
          onCreated={() => { setShowRecord(false); refresh(); }}
        />
      )}

      {/* Transfer modal */}
      {transferTarget && (
        <TransferModal
          item={transferTarget}
          onClose={() => setTransferTarget(null)}
          onDone={() => { setTransferTarget(null); refresh(); }}
        />
      )}

      {/* Release modal */}
      {releaseTarget && (
        <ReleaseModal
          item={releaseTarget}
          onClose={() => setReleaseTarget(null)}
          onDone={() => { setReleaseTarget(null); refresh(); }}
        />
      )}

      {/* Destroy modal */}
      {destroyTarget && (
        <DestroyModal
          item={destroyTarget}
          onClose={() => setDestroyTarget(null)}
          onDone={() => { setDestroyTarget(null); refresh(); }}
        />
      )}
    </div>
  );
}

function RecordSeizureModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [enrollmentId, setEnrollmentId] = useState<number | null>(null);
  const [studentLabel, setStudentLabel] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [location, setLocation] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (term.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await apiService.get(`/students/search?q=${encodeURIComponent(term)}&limit=10`);
        const inner = res.data?.data ?? res.data ?? [];
        setResults(Array.isArray(inner) ? inner : []);
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [term]);

  const uploadPhoto = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const uploaded = await uploadChatFile(files[0]);
      setPhotoUrl(uploaded.fileUrl);
      toast.success('Photo uploaded.');
    } catch (error: any) {
      toast.error(error.message || 'Photo upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentId) return;
    setIsSaving(true);
    try {
      await recordSeizure({
        enrollmentId,
        itemDescription: description.trim(),
        reason: reason.trim(),
        location: location.trim() || undefined,
        photoUrl: photoUrl || undefined,
      });
      toast.success('Seizure recorded — the item is in your custody.');
      onCreated();
    } catch (error: any) {
      toast.error(error.message || 'Failed to record seizure.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <XMarkIcon className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold mb-4">Record Seizure</h3>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student *</label>
            {studentLabel ? (
              <div className="flex items-center justify-between p-2 border rounded bg-gray-50 text-sm">
                <span>{studentLabel}</span>
                <button type="button" className="text-blue-600 text-xs" onClick={() => { setEnrollmentId(null); setStudentLabel(null); }}>Change</button>
              </div>
            ) : (
              <>
                <input type="text" value={term} onChange={e => setTerm(e.target.value)}
                  placeholder="Search student…" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                {results.length > 0 && (
                  <div className="mt-1 border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                    {results.map((s: any) => {
                      const enrollments: any[] = s.enrollments || [];
                      const enrollment = enrollments[enrollments.length - 1];
                      return (
                        <button key={s.id} type="button" disabled={!enrollment?.id}
                          onClick={() => { setEnrollmentId(enrollment.id); setStudentLabel(`${s.name} (${s.matricule || 'no matricule'})`); setResults([]); setTerm(''); }}
                          className="w-full text-left p-2 text-sm hover:bg-gray-100 border-b border-gray-100 last:border-b-0 disabled:opacity-50">
                          {s.name} {s.matricule ? `(${s.matricule})` : ''}
                          {!enrollment?.id && <span className="text-red-400 ml-1">not enrolled</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item description *</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} required
              placeholder="e.g. Mobile phone (Samsung A24)" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} required
              placeholder="e.g. Using phone during class" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Form 3A classroom" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo (optional)</label>
            {photoUrl ? (
              <div className="flex items-center justify-between text-sm">
                <a href={photoUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">View uploaded photo</a>
                <button type="button" className="text-red-500 text-xs" onClick={() => setPhotoUrl('')}>Remove</button>
              </div>
            ) : (
              <input type="file" accept="image/*" onChange={e => uploadPhoto(e.target.files)} disabled={isUploading}
                className="w-full text-sm" />
            )}
            {isUploading && <p className="text-xs text-gray-400 mt-1">Uploading…</p>}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700">Cancel</button>
            <button type="submit" disabled={isSaving || isUploading || !enrollmentId || !description.trim() || !reason.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
              {isSaving ? 'Saving…' : 'Record Seizure'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TransferModal({ item, onClose, onDone }: { item: SeizedItem; onClose: () => void; onDone: () => void }) {
  const [recipient, setRecipient] = useState<ChatContact | null>(null);
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient) return;
    setIsSaving(true);
    try {
      await initiateSeizedTransfer(item.id, { toUserId: recipient.id, note: note || undefined });
      toast.success(`Transfer sent to ${recipient.name} — custody moves when they accept.`);
      onDone();
    } catch (error: any) {
      toast.error(error.message || 'Failed to initiate transfer.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <XMarkIcon className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold mb-1">Transfer Custody</h3>
        <p className="text-sm text-gray-500 mb-4">"{item.itemDescription}" — you keep custody until the recipient accepts.</p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transfer to (e.g. the Principal)</label>
            <StaffPicker selected={recipient} onPick={setRecipient} onClear={() => setRecipient(null)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)}
              placeholder="e.g. Expensive — please keep in office safe" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700">Cancel</button>
            <button type="submit" disabled={isSaving || !recipient}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
              {isSaving ? 'Sending…' : 'Send Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReleaseModal({ item, onClose, onDone }: { item: SeizedItem; onClose: () => void; onDone: () => void }) {
  const [recipient, setRecipient] = useState<ChatUserLite | null>(null);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient) return;
    setIsSaving(true);
    try {
      await releaseSeizedItem(item.id, { releasedToId: recipient.id, notes: notes || undefined });
      toast.success(`Item released to ${recipient.name}.`);
      onDone();
    } catch (error: any) {
      toast.error(error.message || 'Failed to release item.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <XMarkIcon className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold mb-1">Release Item</h3>
        <p className="text-sm text-gray-500 mb-4">"{item.itemDescription}" — record who it was returned to.</p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Released to</label>
            <AnyUserPicker selected={recipient} onPick={setRecipient} onClear={() => setRecipient(null)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Returned to father in front office" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700">Cancel</button>
            <button type="submit" disabled={isSaving || !recipient}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50">
              {isSaving ? 'Releasing…' : 'Release'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DestroyModal({ item, onClose, onDone }: { item: SeizedItem; onClose: () => void; onDone: () => void }) {
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await destroySeizedItem(item.id, notes);
      toast.success('Item marked as destroyed.');
      onDone();
    } catch (error: any) {
      toast.error(error.message || 'Failed to destroy item.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <XMarkIcon className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold mb-1 text-red-700">Destroy Item</h3>
        <p className="text-sm text-gray-500 mb-4">
          "{item.itemDescription}" — this is permanent and only allowed for the Principal / Super-Manager holding the item.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Handed to police 2026-07-30" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700">Cancel</button>
            <button type="submit" disabled={isSaving}
              className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50">
              {isSaving ? 'Destroying…' : 'Confirm Destroy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
