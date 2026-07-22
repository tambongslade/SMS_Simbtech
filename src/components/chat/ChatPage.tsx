'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  PaperAirplaneIcon,
  PlusIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  ChatBubbleOvalLeftIcon,
  UserGroupIcon,
  ArrowLeftIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowUpIcon,
  PaperClipIcon,
  MicrophoneIcon,
  StopIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { getChatSocket } from '@/lib/chatSocket';
import {
  type ChatChannel,
  type ChatMessage,
  type ChatUserLite,
  type ChatContact,
  type ChatAttachment,
  type ParentContacts,
  type PresenceInfo,
  listChannels,
  createChannel,
  getChannel,
  addChannelMember,
  removeChannelMember,
  listMessages,
  postMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  markChannelRead,
  openDm,
  listParentContacts,
  contactStaff,
  searchUsers,
  searchContacts,
  getPresence,
  uploadChatFile,
  normalizeMessage,
  normalizeChannel,
} from '@/lib/chatApi';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '✅', '🎉'];
const PAGE_SIZE = 50;

const timeLabel = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const lastSeenLabel = (iso?: string | null) => {
  if (!iso) return 'Offline';
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `last seen ${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `last seen ${hours}h ago`;
  return `last seen ${Math.round(hours / 24)}d ago`;
};

const formatDuration = (secs?: number | null) => {
  if (!secs) return '';
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

const PresenceDot = ({ online }: { online?: boolean }) => (
  <span className={`inline-block w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-gray-300'}`} />
);

// Shared user-picker (search + selected chips)
function UserPicker({
  selected,
  onChange,
  excludeIds = [],
}: {
  selected: ChatUserLite[];
  onChange: (users: ChatUserLite[]) => void;
  excludeIds?: number[];
}) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<ChatUserLite[]>([]);

  useEffect(() => {
    if (term.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const users = await searchUsers(term, 15);
        setResults(users.filter(u => !excludeIds.includes(u.id) && !selected.some(s => s.id === u.id)));
      } catch { setResults([]); }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, selected]);

  return (
    <div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(u => (
            <span key={u.id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
              {u.name}
              <button type="button" onClick={() => onChange(selected.filter(s => s.id !== u.id))}>
                <XMarkIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={term}
        onChange={e => setTerm(e.target.value)}
        placeholder="Search users…"
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
      />
      {results.length > 0 && (
        <div className="mt-1 border border-gray-200 rounded-md max-h-40 overflow-y-auto bg-white">
          {results.map(u => (
            <button
              key={u.id}
              type="button"
              onClick={() => { onChange([...selected, u]); setTerm(''); setResults([]); }}
              className="w-full text-left p-2 text-sm hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
            >
              {u.name} <span className="text-gray-400 text-xs">{(u.roles || []).join(', ')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const { user, selectedRole } = useAuth();
  const isParent = selectedRole === 'PARENT' || selectedRole === 'STUDENT';
  const myId = user?.id;

  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Thread panel
  const [threadRoot, setThreadRoot] = useState<ChatMessage | null>(null);
  const [threadMessages, setThreadMessages] = useState<ChatMessage[]>([]);

  // Composer
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunks = useRef<Blob[]>([]);
  const recordStart = useRef(0);

  // Presence / receipts
  const [activeDetail, setActiveDetail] = useState<ChatChannel | null>(null);
  const [presenceMap, setPresenceMap] = useState<Record<number, PresenceInfo>>({});
  const [deliveredMap, setDeliveredMap] = useState<Record<number, number[]>>({});

  // Modals / panels
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [showNewDm, setShowNewDm] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [infoChannel, setInfoChannel] = useState<ChatChannel | null>(null);
  const [showContacts, setShowContacts] = useState(false);
  const [contacts, setContacts] = useState<ParentContacts | null>(null);

  // Typing indicator: userId -> { name, expiry }
  const [typingUsers, setTypingUsers] = useState<Record<number, { name?: string; expiry: number }>>({});
  const lastTypingEmit = useRef(0);
  const TYPING_TTL = 7000; // slightly longer than the server's 6s auto-stop

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const activeIdRef = useRef<number | null>(null);
  activeIdRef.current = activeId;
  const threadRootRef = useRef<ChatMessage | null>(null);
  threadRootRef.current = threadRoot;

  const activeChannel = useMemo(() => channels.find(c => c.id === activeId) || null, [channels, activeId]);
  const canPost = !isParent || activeChannel?.type === 'DIRECT';

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  // --- Loaders ---

  const refreshChannels = useCallback(async () => {
    try {
      const list = await listChannels();
      setChannels(list);
      // Sidebar presence dots for DMs: make sure we know each DM's peer, then
      // batch-fetch their presence. The list endpoint may omit members.
      const needDetail = list.filter(c => c.type === 'DIRECT' && !(c.members && c.members.length > 0));
      if (needDetail.length > 0) {
        const details = await Promise.all(needDetail.slice(0, 25).map(c => getChannel(c.id).catch(() => null)));
        const byId = new Map(details.filter(Boolean).map(d => [d!.id, d!]));
        if (byId.size > 0) {
          setChannels(prev => prev.map(c => (byId.has(c.id) ? { ...c, members: byId.get(c.id)!.members } : c)));
        }
        const seeded: Record<number, PresenceInfo> = {};
        details.filter(Boolean).forEach(d => (d!.members || []).forEach(m => { if (m.presence) seeded[m.userId] = m.presence; }));
        if (Object.keys(seeded).length > 0) setPresenceMap(prev => ({ ...prev, ...seeded }));
      }
      const peerIds = Array.from(new Set(
        list.filter(c => c.type === 'DIRECT').flatMap(c => (c.members || []).map(m => m.userId)).filter(id => id && id !== myId)
      ));
      if (peerIds.length > 0) {
        const presence = await getPresence(peerIds);
        setPresenceMap(prev => ({ ...prev, ...presence }));
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load channels.');
    } finally {
      setIsLoadingChannels(false);
    }
  }, [myId]);

  const openChannel = useCallback(async (channelId: number) => {
    setActiveId(channelId);
    setThreadRoot(null);
    setThreadMessages([]);
    setEditing(null);
    setPendingAttachments([]);
    setActiveDetail(null);
    setIsLoadingMessages(true);
    try {
      const msgs = await listMessages(channelId, { limit: PAGE_SIZE });
      setMessages(msgs);
      setHasMore(msgs.length >= PAGE_SIZE);
      // Persist read state (socket variant also broadcasts message.read)
      const socket = getChatSocket();
      if (socket?.connected) socket.emit('message.read', { channelId });
      else markChannelRead(channelId).catch(() => {});
      setChannels(prev => prev.map(c => (c.id === channelId ? { ...c, unreadCount: 0 } : c)));
      scrollToBottom();
    } catch (error: any) {
      toast.error(error.message || 'Failed to load messages.');
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
    // Enrich with members + presence (GET /chat/channels/:id includes both)
    try {
      const detail = await getChannel(channelId);
      setActiveDetail(detail);
      // Seed presence from the enriched member payload, then batch-refresh
      const seeded: Record<number, PresenceInfo> = {};
      (detail.members || []).forEach(m => { if (m.presence) seeded[m.userId] = m.presence; });
      if (Object.keys(seeded).length > 0) setPresenceMap(prev => ({ ...prev, ...seeded }));
      const ids = (detail.members || []).map(m => m.userId).filter(id => id !== undefined);
      if (ids.length > 0) {
        const presence = await getPresence(ids);
        setPresenceMap(prev => ({ ...prev, ...presence }));
      }
    } catch {
      // presence/members are progressive enhancement — chat still works
    }
  }, []);

  const loadOlder = async () => {
    if (!activeId || messages.length === 0) return;
    try {
      const older = await listMessages(activeId, { limit: PAGE_SIZE, before: messages[0].createdAt });
      setMessages(prev => [...older, ...prev]);
      setHasMore(older.length >= PAGE_SIZE);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load history.');
    }
  };

  const openThread = async (root: ChatMessage) => {
    setThreadRoot(root);
    setThreadMessages([]);
    try {
      setThreadMessages(await listMessages(root.channelId, { threadOf: root.id, limit: 200 }));
    } catch (error: any) {
      toast.error(error.message || 'Failed to load thread.');
    }
  };

  useEffect(() => { refreshChannels(); }, [refreshChannels]);

  // --- Socket wiring ---

  useEffect(() => {
    const socket = getChatSocket();
    if (!socket) return;

    const onMessageNew = (raw: any) => {
      const msg = normalizeMessage(raw);
      const visible = msg.channelId === activeIdRef.current;
      // Ack delivery back to the sender
      if (msg.senderId !== myId) socket.emit('message.delivered', { messageId: msg.id });
      if (visible) {
        if (msg.parentMessageId) {
          // Reply: bump the parent's counter; append to thread if it's open
          setMessages(prev => prev.map(m => (m.id === msg.parentMessageId ? { ...m, replyCount: m.replyCount + 1 } : m)));
          if (threadRootRef.current && msg.parentMessageId === threadRootRef.current.id) {
            setThreadMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));
          }
        } else {
          setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));
          scrollToBottom();
        }
        if (msg.senderId !== myId) {
          socket.emit('message.read', { channelId: msg.channelId, upToMessageId: msg.id });
        }
      } else if (msg.senderId !== myId && !msg.parentMessageId) {
        setChannels(prev => prev.map(c => (c.id === msg.channelId ? { ...c, unreadCount: c.unreadCount + 1 } : c)));
      }
      // Bump channel ordering + preview
      setChannels(prev => {
        const updated = prev.map(c =>
          c.id === msg.channelId
            ? { ...c, updatedAt: msg.createdAt, lastMessage: { id: msg.id, content: msg.content, senderId: msg.senderId, senderName: msg.sender?.name, createdAt: msg.createdAt } }
            : c
        );
        return [...updated].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      });
    };

    const onMessageUpdated = (raw: any) => {
      const msg = normalizeMessage(raw);
      setMessages(prev => prev.map(m => (m.id === msg.id ? msg : m)));
      setThreadMessages(prev => prev.map(m => (m.id === msg.id ? msg : m)));
    };

    const onMessageDeleted = (p: any) => {
      const id = p?.id;
      const patch = { deletedAt: new Date().toISOString(), content: '' };
      setMessages(prev => prev.map(m => (m.id === id ? { ...m, ...patch } : m)));
      setThreadMessages(prev => prev.map(m => (m.id === id ? { ...m, ...patch } : m)));
    };

    const onReactionAdded = (p: any) => {
      const messageId = p?.message_id ?? p?.messageId;
      const r = p?.reaction || p;
      const reaction = { id: r?.id, emoji: r?.emoji, userId: r?.user_id ?? r?.userId, user: r?.user };
      const apply = (m: ChatMessage) =>
        m.id === messageId && !m.reactions.some(x => x.userId === reaction.userId && x.emoji === reaction.emoji)
          ? { ...m, reactions: [...m.reactions, reaction] }
          : m;
      setMessages(prev => prev.map(apply));
      setThreadMessages(prev => prev.map(apply));
    };

    const onReactionRemoved = (p: any) => {
      const messageId = p?.message_id ?? p?.messageId;
      const userId = p?.user_id ?? p?.userId;
      const emoji = p?.emoji;
      const apply = (m: ChatMessage) =>
        m.id === messageId ? { ...m, reactions: m.reactions.filter(r => !(r.userId === userId && r.emoji === emoji)) } : m;
      setMessages(prev => prev.map(apply));
      setThreadMessages(prev => prev.map(apply));
    };

    const onChannelCreated = (raw: any) => {
      const ch = normalizeChannel(raw);
      setChannels(prev => (prev.some(c => c.id === ch.id) ? prev : [ch, ...prev]));
    };

    const onTypingStart = (p: any) => {
      const channelId = p?.channelId ?? p?.channel_id;
      const userId = p?.userId ?? p?.user_id;
      if (channelId !== activeIdRef.current || userId === myId) return;
      setTypingUsers(prev => ({ ...prev, [userId]: { name: p?.userName, expiry: Date.now() + TYPING_TTL } }));
    };

    const onTypingStop = (p: any) => {
      const channelId = p?.channelId ?? p?.channel_id;
      const userId = p?.userId ?? p?.user_id;
      if (channelId !== activeIdRef.current) return;
      setTypingUsers(prev => {
        if (!(userId in prev)) return prev;
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    const onMessageDelivered = (p: any) => {
      const messageId = p?.messageId ?? p?.message_id;
      const userId = p?.userId ?? p?.user_id;
      if (!messageId || !userId) return;
      setDeliveredMap(prev => {
        const existing = prev[messageId] || [];
        return existing.includes(userId) ? prev : { ...prev, [messageId]: [...existing, userId] };
      });
    };

    const onMessageRead = (p: any) => {
      const channelId = p?.channelId ?? p?.channel_id;
      const userId = p?.userId ?? p?.user_id;
      const lastReadAt = p?.lastReadAt ?? p?.last_read_at;
      if (!channelId || !userId || userId === myId) return;
      // Recompute seen state for my messages in the open channel
      if (channelId === activeIdRef.current && lastReadAt) {
        const apply = (m: ChatMessage) =>
          m.senderId === myId && m.createdAt <= lastReadAt && !m.seenByUserIds.includes(userId)
            ? { ...m, seenByUserIds: [...m.seenByUserIds, userId], seenCount: m.seenCount + 1 }
            : m;
        setMessages(prev => prev.map(apply));
        setThreadMessages(prev => prev.map(apply));
      }
      setActiveDetail(prev =>
        prev && prev.id === channelId
          ? { ...prev, members: (prev.members || []).map(m => (m.userId === userId ? { ...m } : m)) }
          : prev
      );
    };

    const onPresenceOnline = (p: any) => {
      const userId = p?.userId ?? p?.user_id;
      if (userId) setPresenceMap(prev => ({ ...prev, [userId]: { online: true, lastSeenAt: null } }));
    };

    const onPresenceOffline = (p: any) => {
      const userId = p?.userId ?? p?.user_id;
      const lastSeenAt = p?.lastSeenAt ?? p?.last_seen_at ?? new Date().toISOString();
      if (userId) setPresenceMap(prev => ({ ...prev, [userId]: { online: false, lastSeenAt } }));
    };

    const onReconnect = () => {
      refreshChannels();
      if (activeIdRef.current) {
        listMessages(activeIdRef.current, { limit: PAGE_SIZE })
          .then(msgs => { setMessages(msgs); setHasMore(msgs.length >= PAGE_SIZE); })
          .catch(() => {});
      }
    };

    socket.on('message.new', onMessageNew);
    socket.on('message.updated', onMessageUpdated);
    socket.on('message.deleted', onMessageDeleted);
    socket.on('reaction.added', onReactionAdded);
    socket.on('reaction.removed', onReactionRemoved);
    socket.on('channel.created', onChannelCreated);
    socket.on('typing', onTypingStart); // legacy alias
    socket.on('typing.start', onTypingStart);
    socket.on('typing.stop', onTypingStop);
    socket.on('message.delivered', onMessageDelivered);
    socket.on('message.read', onMessageRead);
    socket.on('presence.online', onPresenceOnline);
    socket.on('presence.offline', onPresenceOffline);
    socket.on('connect', onReconnect);

    return () => {
      socket.off('message.new', onMessageNew);
      socket.off('message.updated', onMessageUpdated);
      socket.off('message.deleted', onMessageDeleted);
      socket.off('reaction.added', onReactionAdded);
      socket.off('reaction.removed', onReactionRemoved);
      socket.off('channel.created', onChannelCreated);
      socket.off('typing', onTypingStart);
      socket.off('typing.start', onTypingStart);
      socket.off('typing.stop', onTypingStop);
      socket.off('message.delivered', onMessageDelivered);
      socket.off('message.read', onMessageRead);
      socket.off('presence.online', onPresenceOnline);
      socket.off('presence.offline', onPresenceOffline);
      socket.off('connect', onReconnect);
    };
  }, [myId, refreshChannels]);

  // Expire typing indicators
  useEffect(() => {
    const t = setInterval(() => {
      setTypingUsers(prev => {
        const now = Date.now();
        const next: typeof prev = {};
        Object.entries(prev).forEach(([k, v]) => { if (v.expiry > now) next[Number(k)] = v; });
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // --- Actions ---

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const content = draft.trim();
    if ((!content && pendingAttachments.length === 0) || !activeId) return;
    setIsSending(true);
    getChatSocket()?.emit('typing.stop', { channelId: activeId });
    try {
      if (editing) {
        const updated = await editMessage(editing.id, content);
        setMessages(prev => prev.map(m => (m.id === updated.id ? updated : m)));
        setThreadMessages(prev => prev.map(m => (m.id === updated.id ? updated : m)));
        setEditing(null);
      } else if (threadRoot) {
        const msg = await postMessage(activeId, { content, parentMessageId: threadRoot.id, attachments: pendingAttachments });
        setThreadMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));
        setMessages(prev => prev.map(m => (m.id === threadRoot.id ? { ...m, replyCount: m.replyCount + 1 } : m)));
      } else {
        const msg = await postMessage(activeId, { content, attachments: pendingAttachments });
        setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));
        scrollToBottom();
      }
      setDraft('');
      setPendingAttachments([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    const socket = getChatSocket();
    if (!activeId || !socket) return;
    if (value.length === 0) {
      socket.emit('typing.stop', { channelId: activeId });
      return;
    }
    // Throttled typing.start (~1/sec); server auto-stops after 6s of silence
    const now = Date.now();
    if (now - lastTypingEmit.current > 1000) {
      lastTypingEmit.current = now;
      socket.emit('typing.start', { channelId: activeId });
    }
  };

  const handleComposerBlur = () => {
    if (activeId) getChatSocket()?.emit('typing.stop', { channelId: activeId });
  };

  // Measure image dimensions so the server can render aspect-correct thumbnails
  const imageDims = (file: File): Promise<{ width?: number; height?: number }> =>
    new Promise(resolve => {
      if (!file.type.startsWith('image/')) return resolve({});
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
      img.onerror = () => { resolve({}); URL.revokeObjectURL(url); };
      img.src = url;
    });

  const handleFilesPicked = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const dims = await imageDims(file);
        const uploaded = await uploadChatFile(file);
        setPendingAttachments(prev => [...prev, { ...uploaded, ...dims }]);
      }
    } catch (error: any) {
      toast.error(error.message || 'Upload failed.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Voice recording is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : undefined);
      recordChunks.current = [];
      rec.ondataavailable = e => { if (e.data.size > 0) recordChunks.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const durationSecs = Math.round((Date.now() - recordStart.current) / 1000);
        const blob = new Blob(recordChunks.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size === 0) return;
        setIsUploading(true);
        try {
          const uploaded = await uploadChatFile(blob, `voice-${Date.now()}.webm`);
          setPendingAttachments(prev => [...prev, { ...uploaded, kind: 'AUDIO', durationSecs }]);
        } catch (error: any) {
          toast.error(error.message || 'Failed to upload voice note.');
        } finally {
          setIsUploading(false);
        }
      };
      recorderRef.current = rec;
      recordStart.current = Date.now();
      rec.start();
      setIsRecording(true);
    } catch {
      toast.error('Microphone access denied.');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecording(false);
  };

  const handleDelete = async (msg: ChatMessage) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await deleteMessage(msg.id);
      const patch = { deletedAt: new Date().toISOString(), content: '' };
      setMessages(prev => prev.map(m => (m.id === msg.id ? { ...m, ...patch } : m)));
      setThreadMessages(prev => prev.map(m => (m.id === msg.id ? { ...m, ...patch } : m)));
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete message.');
    }
  };

  const toggleReaction = async (msg: ChatMessage, emoji: string) => {
    const mine = msg.reactions.some(r => r.userId === myId && r.emoji === emoji);
    const apply = (updater: (m: ChatMessage) => ChatMessage) => {
      setMessages(prev => prev.map(m => (m.id === msg.id ? updater(m) : m)));
      setThreadMessages(prev => prev.map(m => (m.id === msg.id ? updater(m) : m)));
    };
    try {
      if (mine) {
        await removeReaction(msg.id, emoji);
        apply(m => ({ ...m, reactions: m.reactions.filter(r => !(r.userId === myId && r.emoji === emoji)) }));
      } else {
        await addReaction(msg.id, emoji);
        apply(m => (m.reactions.some(r => r.userId === myId && r.emoji === emoji)
          ? m
          : { ...m, reactions: [...m.reactions, { emoji, userId: myId!, user: { id: myId!, name: user?.name || '' } }] }));
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update reaction.');
    }
  };

  const openInfo = async () => {
    if (!activeId) return;
    setShowInfo(true);
    setInfoChannel(null);
    try {
      setInfoChannel(await getChannel(activeId));
    } catch (error: any) {
      toast.error(error.message || 'Failed to load channel info.');
      setShowInfo(false);
    }
  };

  const handleLeave = async () => {
    if (!activeChannel || !myId) return;
    if (!window.confirm(`Leave "${activeChannel.name}"?`)) return;
    try {
      await removeChannelMember(activeChannel.id, myId);
      setChannels(prev => prev.filter(c => c.id !== activeChannel.id));
      setActiveId(null);
      setShowInfo(false);
      toast.success('You left the channel.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to leave channel.');
    }
  };

  const openContactsPanel = async () => {
    setShowContacts(true);
    if (!contacts) {
      try {
        setContacts(await listParentContacts());
      } catch (error: any) {
        toast.error(error.message || 'Failed to load contacts.');
      }
    }
  };

  const startDmWith = async (u: ChatUserLite & { dmChannelId?: number | null }, viaParentEndpoint: boolean) => {
    try {
      // Reuse the existing 1:1 channel when the contact search already found one
      if (u.dmChannelId && channels.some(c => c.id === u.dmChannelId)) {
        setShowContacts(false);
        setShowNewDm(false);
        openChannel(u.dmChannelId);
        return;
      }
      const ch = viaParentEndpoint ? await contactStaff(u.id) : await openDm([u.id]);
      setChannels(prev => (prev.some(c => c.id === ch.id) ? prev : [ch, ...prev]));
      // This socket session predates the channel — join its room explicitly
      getChatSocket()?.emit('subscribe', { channelId: ch.id });
      setShowContacts(false);
      setShowNewDm(false);
      openChannel(ch.id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to open conversation.');
    }
  };

  // --- Grouping for the sidebar ---
  const grouped = useMemo(() => ({
    system: channels.filter(c => c.isSystem),
    custom: channels.filter(c => !c.isSystem && c.type !== 'DIRECT'),
    direct: channels.filter(c => c.type === 'DIRECT'),
  }), [channels]);

  const typingNames = useMemo(() => {
    const entries = Object.entries(typingUsers);
    if (entries.length === 0) return '';
    const names = entries.map(([id, v]) =>
      v.name || activeDetail?.members?.find(m => m.userId === Number(id))?.user?.name || 'Someone');
    return `${names.join(', ')} typing…`;
  }, [typingUsers, activeDetail]);

  // Presence line for the header: DM peer's status, or online count for groups
  const headerPresence = useMemo(() => {
    const members = activeDetail?.members || [];
    if (activeDetail?.type === 'DIRECT') {
      const other = members.find(m => m.userId !== myId);
      if (!other) return '';
      const p = presenceMap[other.userId];
      if (!p) return '';
      return p.online ? 'Online' : lastSeenLabel(p.lastSeenAt);
    }
    const online = members.filter(m => m.userId !== myId && presenceMap[m.userId]?.online).length;
    return online > 0 ? `${online} online` : '';
  }, [activeDetail, presenceMap, myId]);

  const dmTitle = (c: ChatChannel) => {
    if (c.type !== 'DIRECT') return c.name;
    const source = c.id === activeDetail?.id ? activeDetail : c;
    const others = (source.members || []).filter(m => m.userId !== myId).map(m => m.user?.name).filter(Boolean);
    return others.length > 0 ? others.join(', ') : c.name;
  };

  // Sender-side delivery ladder: Sent (✓) → Delivered (✓✓) → Read (blue ✓✓)
  const renderDeliveryStatus = (m: ChatMessage) => {
    if (m.senderId !== myId || m.deletedAt) return null;
    const read = m.seenCount > 0 || m.seenByUserIds.length > 0;
    const delivered = (deliveredMap[m.id] || []).length > 0;
    const memberTotal = Math.max((activeDetail?.members?.length || 2) - 1, 1);
    const title = read
      ? `Read by ${Math.max(m.seenCount, m.seenByUserIds.length)}`
      : delivered
        ? `Delivered to ${(deliveredMap[m.id] || []).length} of ${memberTotal}`
        : 'Sent';
    return (
      <span className="inline-flex items-center" title={title}>
        <CheckIcon className={`w-3 h-3 ${read ? 'text-sky-300' : 'text-blue-200'}`} />
        {(read || delivered) && <CheckIcon className={`w-3 h-3 -ml-1.5 ${read ? 'text-sky-300' : 'text-blue-200'}`} />}
      </span>
    );
  };

  const renderChannelButton = (c: ChatChannel) => (
    <button
      key={c.id}
      onClick={() => openChannel(c.id)}
      className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between gap-2 ${
        activeId === c.id ? 'bg-blue-50 text-blue-800' : 'hover:bg-gray-100 text-gray-800'
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium truncate flex items-center gap-1.5">
          {dmTitle(c)}
          {c.type === 'DIRECT' && (() => {
            const peerId = (c.members || []).find(m => m.userId !== myId)?.userId;
            const p = peerId ? presenceMap[peerId] : undefined;
            return p ? <PresenceDot online={p.online} /> : null;
          })()}
        </p>
        {c.lastMessage && (
          <p className="text-xs text-gray-500 truncate">
            {c.lastMessage.senderName ? `${c.lastMessage.senderName}: ` : ''}
            {c.lastMessage.content || 'Attachment'}
          </p>
        )}
      </div>
      {c.unreadCount > 0 && (
        <span className="shrink-0 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center">
          {c.unreadCount > 99 ? '99+' : c.unreadCount}
        </span>
      )}
    </button>
  );

  const renderMessage = (m: ChatMessage, inThread = false) => {
    const mine = m.senderId === myId;
    const isAdmin = activeChannel?.myRole === 'ADMIN';
    return (
      <div key={m.id} className={`group flex ${mine ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[85%] sm:max-w-[70%] rounded-lg px-3 py-2 ${mine ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-900'}`}>
          {!mine && <p className={`text-xs font-semibold ${mine ? 'text-blue-100' : 'text-blue-700'}`}>{m.sender?.name || 'Unknown'}</p>}
          {m.deletedAt ? (
            <p className={`text-sm italic ${mine ? 'text-blue-200' : 'text-gray-400'}`}>Message deleted</p>
          ) : (
            <>
              {m.content && <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>}
              {m.attachments.map((a, i) => {
                const key = a.id ?? i;
                if (a.kind === 'IMAGE') {
                  return (
                    <a key={key} href={a.fileUrl} target="_blank" rel="noreferrer" className="block mt-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.fileUrl}
                        alt={a.fileName}
                        className="rounded-md max-h-64 max-w-full object-contain"
                        style={a.width && a.height ? { aspectRatio: `${a.width} / ${a.height}` } : undefined}
                      />
                    </a>
                  );
                }
                if (a.kind === 'AUDIO') {
                  return (
                    <div key={key} className="mt-1">
                      <audio controls src={a.fileUrl} className="max-w-full h-10" />
                      {a.durationSecs ? (
                        <p className={`text-[10px] ${mine ? 'text-blue-200' : 'text-gray-400'}`}>
                          Voice note · {formatDuration(a.durationSecs)}
                        </p>
                      ) : null}
                    </div>
                  );
                }
                if (a.kind === 'VIDEO') {
                  return (
                    <video
                      key={key}
                      controls
                      src={a.fileUrl}
                      className="rounded-md max-h-64 max-w-full mt-1"
                      style={a.width && a.height ? { aspectRatio: `${a.width} / ${a.height}` } : undefined}
                    />
                  );
                }
                return (
                  <a
                    key={key}
                    href={a.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`block text-xs underline mt-1 ${mine ? 'text-blue-100' : 'text-blue-600'}`}
                  >
                    📎 {a.fileName}
                    {a.sizeBytes ? ` (${Math.round(a.sizeBytes / 1024)} KB)` : ''}
                  </a>
                );
              })}
            </>
          )}
          <div className={`flex items-center gap-2 mt-1 text-[10px] ${mine ? 'text-blue-200' : 'text-gray-400'}`}>
            <span>{timeLabel(m.createdAt)}</span>
            {m.editedAt && !m.deletedAt && <span>(edited)</span>}
            {renderDeliveryStatus(m)}
            {!inThread && m.replyCount > 0 && (
              <button onClick={() => openThread(m)} className="underline font-medium">
                {m.replyCount} repl{m.replyCount === 1 ? 'y' : 'ies'}
              </button>
            )}
          </div>
          {m.reactions.length > 0 && !m.deletedAt && (
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(
                m.reactions.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.emoji]: (acc[r.emoji] || 0) + 1 }), {})
              ).map(([emoji, count]) => {
                const mineReaction = m.reactions.some(r => r.userId === myId && r.emoji === emoji);
                return (
                  <button
                    key={emoji}
                    onClick={() => toggleReaction(m, emoji)}
                    className={`text-xs px-1.5 py-0.5 rounded-full border ${
                      mineReaction ? 'bg-blue-100 border-blue-300' : mine ? 'bg-blue-500 border-blue-400' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {emoji} {count}
                  </button>
                );
              })}
            </div>
          )}
          {!m.deletedAt && (
            <div className="hidden group-hover:flex items-center gap-2 mt-1">
              {QUICK_EMOJIS.map(e => (
                <button key={e} onClick={() => toggleReaction(m, e)} className="text-sm hover:scale-125 transition-transform">{e}</button>
              ))}
              {!inThread && (
                <button onClick={() => openThread(m)} title="Reply in thread" className={mine ? 'text-blue-100' : 'text-gray-400'}>
                  <ChatBubbleOvalLeftIcon className="w-4 h-4" />
                </button>
              )}
              {mine && (
                <button onClick={() => { setEditing(m); setDraft(m.content); setThreadRoot(inThread ? threadRoot : null); }} title="Edit" className={mine ? 'text-blue-100' : 'text-gray-400'}>
                  <PencilSquareIcon className="w-4 h-4" />
                </button>
              )}
              {(mine || isAdmin) && (
                <button onClick={() => handleDelete(m)} title="Delete" className={mine ? 'text-blue-100' : 'text-gray-400'}>
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-gray-50">
      {/* Channel sidebar */}
      <aside className={`${activeId ? 'hidden md:flex' : 'flex'} w-full md:w-80 shrink-0 flex-col border-r border-gray-200 bg-white`}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="w-5 h-5" /> Chat
          </h2>
          <div className="flex gap-1">
            {isParent ? (
              <button onClick={openContactsPanel} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md" title="Contact staff">
                <UserGroupIcon className="w-5 h-5" />
              </button>
            ) : (
              <>
                <button onClick={() => setShowNewDm(true)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md" title="New direct message">
                  <ChatBubbleOvalLeftIcon className="w-5 h-5" />
                </button>
                <button onClick={() => setShowNewChannel(true)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md" title="New channel">
                  <PlusIcon className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {isLoadingChannels ? (
            <p className="text-sm text-gray-500 p-3">Loading channels…</p>
          ) : channels.length === 0 ? (
            <p className="text-sm text-gray-500 p-3">No conversations yet.</p>
          ) : (
            <>
              {grouped.direct.length > 0 && (
                <div>
                  <p className="px-3 text-xs font-semibold text-gray-400 uppercase mb-1">Direct Messages</p>
                  {grouped.direct.map(renderChannelButton)}
                </div>
              )}
              {grouped.system.length > 0 && (
                <div>
                  <p className="px-3 text-xs font-semibold text-gray-400 uppercase mb-1">System Channels</p>
                  {grouped.system.map(renderChannelButton)}
                </div>
              )}
              {grouped.custom.length > 0 && (
                <div>
                  <p className="px-3 text-xs font-semibold text-gray-400 uppercase mb-1">Custom Channels</p>
                  {grouped.custom.map(renderChannelButton)}
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Message pane */}
      <main className={`${activeId ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
        {!activeChannel ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Select a conversation to start chatting.
          </div>
        ) : (
          <>
            <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-3">
              <button onClick={() => setActiveId(null)} className="md:hidden text-gray-500">
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <button onClick={openInfo} className="min-w-0 text-left flex-1">
                <p className="font-semibold text-gray-900 truncate flex items-center gap-2">
                  {dmTitle(activeChannel)}
                  {activeChannel.type === 'DIRECT' && headerPresence === 'Online' && <PresenceDot online />}
                </p>
                <p className="text-xs text-gray-500">
                  {activeChannel.isSystem ? 'System channel' : activeChannel.type === 'DIRECT' ? 'Direct message' : 'Custom channel'}
                  {activeChannel.memberCount ? ` · ${activeChannel.memberCount} members` : ''}
                  {headerPresence && <span className={headerPresence === 'Online' ? 'text-green-600' : ''}> · {headerPresence}</span>}
                  {typingNames && <span className="text-blue-600"> · {typingNames}</span>}
                </p>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {hasMore && (
                <div className="text-center">
                  <button onClick={loadOlder} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                    <ArrowUpIcon className="w-3 h-3" /> Load older messages
                  </button>
                </div>
              )}
              {isLoadingMessages ? (
                <p className="text-center text-sm text-gray-400 py-8">Loading messages…</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">No messages yet — say hello!</p>
              ) : (
                messages.map(m => renderMessage(m))
              )}
              <div ref={bottomRef} />
            </div>

            {canPost ? (
              <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-200">
                {editing && (
                  <div className="flex items-center justify-between text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mb-2">
                    Editing message
                    <button type="button" onClick={() => { setEditing(null); setDraft(''); }}><XMarkIcon className="w-4 h-4" /></button>
                  </div>
                )}
                {pendingAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {pendingAttachments.map((a, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                        {a.kind === 'IMAGE' ? '🖼️' : a.kind === 'AUDIO' ? '🎤' : a.kind === 'VIDEO' ? '🎬' : '📎'} {a.fileName}
                        {a.durationSecs ? ` (${formatDuration(a.durationSecs)})` : ''}
                        <button type="button" onClick={() => setPendingAttachments(prev => prev.filter((_, j) => j !== i))}>
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {isUploading && <p className="text-xs text-gray-400 mb-1">Uploading…</p>}
                {isRecording && <p className="text-xs text-red-500 mb-1 animate-pulse">● Recording voice note… tap the stop button to attach.</p>}
                <div className="flex gap-2 items-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                    onChange={e => handleFilesPicked(e.target.files)}
                  />
                  {!editing && (
                    <>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full disabled:opacity-50"
                        title="Attach file (max 25 MB)"
                      >
                        <PaperClipIcon className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isUploading}
                        className={`p-2 rounded-full disabled:opacity-50 ${isRecording ? 'bg-red-500 text-white' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'}`}
                        title={isRecording ? 'Stop recording' : 'Record voice note'}
                      >
                        {isRecording ? <StopIcon className="w-5 h-5" /> : <MicrophoneIcon className="w-5 h-5" />}
                      </button>
                    </>
                  )}
                  <input
                    type="text"
                    value={draft}
                    onChange={e => handleDraftChange(e.target.value)}
                    onBlur={handleComposerBlur}
                    placeholder={threadRoot ? 'Reply in thread…' : 'Type a message…'}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isSending || isUploading || (!draft.trim() && pendingAttachments.length === 0)}
                    className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3 bg-gray-100 border-t border-gray-200 text-center text-xs text-gray-500">
                Parents can only post in direct messages with staff.
              </div>
            )}
          </>
        )}
      </main>

      {/* Thread panel */}
      {threadRoot && (
        <aside className="hidden lg:flex w-96 shrink-0 flex-col border-l border-gray-200 bg-white">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <p className="font-semibold text-gray-900 text-sm">Thread</p>
            <button onClick={() => setThreadRoot(null)} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {renderMessage(threadRoot, true)}
            <div className="border-t border-gray-100 pt-2" />
            {threadMessages.map(m => renderMessage(m, true))}
          </div>
          <p className="px-4 pb-2 text-[11px] text-gray-400">Replies post into this thread while it's open.</p>
        </aside>
      )}

      {/* New channel modal */}
      {showNewChannel && (
        <NewChannelModal
          onClose={() => setShowNewChannel(false)}
          onCreated={ch => {
            setChannels(prev => (prev.some(c => c.id === ch.id) ? prev : [ch, ...prev]));
            setShowNewChannel(false);
            openChannel(ch.id);
          }}
        />
      )}

      {/* New DM modal */}
      {showNewDm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowNewDm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <XMarkIcon className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold mb-4">New Direct Message</h3>
            <DmUserSearch onPick={u => startDmWith(u, false)} />
          </div>
        </div>
      )}

      {/* Parent contacts panel */}
      {showContacts && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowContacts(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <XMarkIcon className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold mb-4">Contact Staff</h3>
            {!contacts ? (
              <p className="text-sm text-gray-500">Loading contacts…</p>
            ) : (
              <div className="space-y-5">
                {contacts.childTeachers.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Your children's teachers</p>
                    {contacts.childTeachers.map(t => (
                      <button key={t.id} onClick={() => startDmWith(t, true)} className="w-full text-left p-2 rounded-md hover:bg-gray-100">
                        <p className="text-sm font-medium text-gray-900">{t.name}</p>
                        <p className="text-xs text-gray-500">
                          {t.teaches.map(x => `${x.subject?.name} (${x.student?.name})`).join(', ')}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                {contacts.hodsBySubject.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Heads of department</p>
                    {contacts.hodsBySubject.map((e, i) => (
                      <button key={`${e.hod.id}-${i}`} onClick={() => startDmWith(e.hod, true)} className="w-full text-left p-2 rounded-md hover:bg-gray-100">
                        <p className="text-sm font-medium text-gray-900">{e.hod.name}</p>
                        <p className="text-xs text-gray-500">{e.subject?.name} HOD</p>
                      </button>
                    ))}
                  </div>
                )}
                {contacts.fixedStaff.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-2">School staff</p>
                    {contacts.fixedStaff.map(s => (
                      <button key={s.id} onClick={() => startDmWith(s, true)} className="w-full text-left p-2 rounded-md hover:bg-gray-100">
                        <p className="text-sm font-medium text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-500">{(s.roles || []).join(', ')}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Channel info modal */}
      {showInfo && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowInfo(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <XMarkIcon className="w-5 h-5" />
            </button>
            {!infoChannel ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : (
              <ChannelInfo
                channel={infoChannel}
                myId={myId}
                onMembersChanged={() => openInfo()}
                onLeave={handleLeave}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Universal contact search (GET /chat/contacts): presence-aware, role-filtered
// server-side, and returns dm_channel_id so existing DMs are reused.
function DmUserSearch({ onPick }: { onPick: (u: ChatContact) => void }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<ChatContact[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Empty search returns the first 20 alphabetically — a handy default list
        setResults(await searchContacts(term, 20));
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [term]);

  return (
    <div>
      <input
        type="text"
        value={term}
        onChange={e => setTerm(e.target.value)}
        placeholder="Search by name, matricule or email…"
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        autoFocus
      />
      {isSearching && <p className="text-xs text-gray-400 mt-2">Searching…</p>}
      <div className="mt-2 max-h-72 overflow-y-auto divide-y divide-gray-100">
        {results.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c)}
            className="w-full text-left p-2.5 hover:bg-gray-50 flex items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                {c.name} <PresenceDot online={c.presence.online} />
              </p>
              <p className="text-xs text-gray-500 truncate">
                {(c.roles || []).join(', ')}
                {c.presence.online ? ' · Online' : c.presence.lastSeenAt ? ` · ${lastSeenLabel(c.presence.lastSeenAt)}` : ''}
              </p>
            </div>
            {c.dmChannelId && <span className="shrink-0 text-[10px] text-gray-400">existing chat</span>}
          </button>
        ))}
        {!isSearching && results.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">No contacts found.</p>
        )}
      </div>
    </div>
  );
}

function NewChannelModal({ onClose, onCreated }: { onClose: () => void; onCreated: (ch: ChatChannel) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [members, setMembers] = useState<ChatUserLite[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const ch = await createChannel({
        name: name.trim(),
        description: description.trim() || undefined,
        memberIds: members.map(m => m.id),
        isPrivate,
      });
      toast.success('Channel created.');
      onCreated(ch);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create channel.');
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
        <h3 className="text-lg font-semibold mb-4">New Channel</h3>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="e.g. Form 3A Homeroom" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="e.g. Class master group" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Members</label>
            <UserPicker selected={members} onChange={setMembers} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
            Private channel
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700">Cancel</button>
            <button type="submit" disabled={isSaving || !name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
              {isSaving ? 'Creating…' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChannelInfo({
  channel,
  myId,
  onMembersChanged,
  onLeave,
}: {
  channel: ChatChannel;
  myId?: number;
  onMembersChanged: () => void;
  onLeave: () => void;
}) {
  const [adding, setAdding] = useState<ChatUserLite[]>([]);
  const isAdmin = channel.myRole === 'ADMIN';
  const canManage = isAdmin && channel.type === 'CUSTOM' && !channel.isSystem;

  const addMembers = async () => {
    try {
      for (const u of adding) {
        await addChannelMember(channel.id, u.id);
      }
      toast.success('Member(s) added.');
      setAdding([]);
      onMembersChanged();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add member.');
    }
  };

  const removeMember = async (userId: number) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await removeChannelMember(channel.id, userId);
      toast.success('Member removed.');
      onMembersChanged();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove member.');
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-1">{channel.name}</h3>
      <p className="text-sm text-gray-500 mb-4">
        {channel.isSystem ? 'System channel — membership is managed automatically.' : channel.description || `${channel.type.toLowerCase()} channel`}
      </p>
      <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Members ({channel.members?.length || 0})</p>
      <ul className="divide-y divide-gray-100 mb-4 max-h-56 overflow-y-auto">
        {(channel.members || []).map(m => (
          <li key={m.userId} className="py-2 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900 flex items-center gap-2">
                {m.user?.name || `User #${m.userId}`}
                {m.userId === myId && <span className="text-gray-400">(you)</span>}
                <PresenceDot online={m.presence?.online} />
              </p>
              <p className="text-xs text-gray-400">
                {m.role === 'ADMIN' ? 'Admin' : (m.user?.roles || []).join(', ') || 'Member'}
                {m.presence && !m.presence.online && m.presence.lastSeenAt ? ` · ${lastSeenLabel(m.presence.lastSeenAt)}` : ''}
              </p>
            </div>
            {canManage && m.userId !== myId && (
              <button onClick={() => removeMember(m.userId)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
            )}
          </li>
        ))}
      </ul>
      {canManage && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Add members</p>
          <UserPicker selected={adding} onChange={setAdding} excludeIds={(channel.members || []).map(m => m.userId)} />
          {adding.length > 0 && (
            <button onClick={addMembers} className="mt-2 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
              Add {adding.length} member{adding.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}
      {!channel.isSystem && (
        <button onClick={onLeave} className="text-sm text-red-600 hover:text-red-800">Leave channel</button>
      )}
    </div>
  );
}
