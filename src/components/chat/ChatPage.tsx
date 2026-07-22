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
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { getChatSocket } from '@/lib/chatSocket';
import {
  type ChatChannel,
  type ChatMessage,
  type ChatUserLite,
  type ParentContacts,
  PARENT_CONTACTABLE_ROLES,
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

  // Modals / panels
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [showNewDm, setShowNewDm] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [infoChannel, setInfoChannel] = useState<ChatChannel | null>(null);
  const [showContacts, setShowContacts] = useState(false);
  const [contacts, setContacts] = useState<ParentContacts | null>(null);

  // Typing indicator
  const [typingUsers, setTypingUsers] = useState<Record<number, number>>({}); // userId -> expiry ts
  const lastTypingEmit = useRef(0);

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
    } catch (error: any) {
      toast.error(error.message || 'Failed to load channels.');
    } finally {
      setIsLoadingChannels(false);
    }
  }, []);

  const openChannel = useCallback(async (channelId: number) => {
    setActiveId(channelId);
    setThreadRoot(null);
    setThreadMessages([]);
    setEditing(null);
    setIsLoadingMessages(true);
    try {
      const msgs = await listMessages(channelId, { limit: PAGE_SIZE });
      setMessages(msgs);
      setHasMore(msgs.length >= PAGE_SIZE);
      markChannelRead(channelId).catch(() => {});
      setChannels(prev => prev.map(c => (c.id === channelId ? { ...c, unreadCount: 0 } : c)));
      scrollToBottom();
    } catch (error: any) {
      toast.error(error.message || 'Failed to load messages.');
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
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
        if (msg.senderId !== myId) markChannelRead(msg.channelId, msg.id).catch(() => {});
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

    const onTyping = (p: any) => {
      const channelId = p?.channelId ?? p?.channel_id;
      const userId = p?.userId ?? p?.user_id;
      if (channelId !== activeIdRef.current || userId === myId) return;
      setTypingUsers(prev => ({ ...prev, [userId]: Date.now() + 3000 }));
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
    socket.on('typing', onTyping);
    socket.on('connect', onReconnect);

    return () => {
      socket.off('message.new', onMessageNew);
      socket.off('message.updated', onMessageUpdated);
      socket.off('message.deleted', onMessageDeleted);
      socket.off('reaction.added', onReactionAdded);
      socket.off('reaction.removed', onReactionRemoved);
      socket.off('channel.created', onChannelCreated);
      socket.off('typing', onTyping);
      socket.off('connect', onReconnect);
    };
  }, [myId, refreshChannels]);

  // Expire typing indicators
  useEffect(() => {
    const t = setInterval(() => {
      setTypingUsers(prev => {
        const now = Date.now();
        const next: Record<number, number> = {};
        Object.entries(prev).forEach(([k, v]) => { if (v > now) next[Number(k)] = v; });
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // --- Actions ---

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const content = draft.trim();
    if (!content || !activeId) return;
    setIsSending(true);
    try {
      if (editing) {
        const updated = await editMessage(editing.id, content);
        setMessages(prev => prev.map(m => (m.id === updated.id ? updated : m)));
        setThreadMessages(prev => prev.map(m => (m.id === updated.id ? updated : m)));
        setEditing(null);
      } else if (threadRoot) {
        const msg = await postMessage(activeId, { content, parentMessageId: threadRoot.id });
        setThreadMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));
        setMessages(prev => prev.map(m => (m.id === threadRoot.id ? { ...m, replyCount: m.replyCount + 1 } : m)));
      } else {
        const msg = await postMessage(activeId, { content });
        setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));
        scrollToBottom();
      }
      setDraft('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    // Throttled typing emit (~1s)
    const now = Date.now();
    if (activeId && now - lastTypingEmit.current > 1000) {
      lastTypingEmit.current = now;
      getChatSocket()?.emit('typing', { channelId: activeId });
    }
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

  const startDmWith = async (u: ChatUserLite, viaParentEndpoint: boolean) => {
    try {
      const ch = viaParentEndpoint ? await contactStaff(u.id) : await openDm([u.id]);
      setChannels(prev => (prev.some(c => c.id === ch.id) ? prev : [ch, ...prev]));
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
    const ids = Object.keys(typingUsers).map(Number);
    if (ids.length === 0) return '';
    const names = ids.map(id => activeChannel?.members?.find(m => m.userId === id)?.user?.name || 'Someone');
    return `${names.join(', ')} typing…`;
  }, [typingUsers, activeChannel]);

  const dmTitle = (c: ChatChannel) => {
    if (c.type !== 'DIRECT') return c.name;
    const others = (c.members || []).filter(m => m.userId !== myId).map(m => m.user?.name).filter(Boolean);
    return others.length > 0 ? others.join(', ') : c.name;
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
        <p className="text-sm font-medium truncate">{dmTitle(c)}</p>
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
              {m.attachments.map((a, i) => (
                <a
                  key={a.id ?? i}
                  href={a.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`block text-xs underline mt-1 ${mine ? 'text-blue-100' : 'text-blue-600'}`}
                >
                  📎 {a.fileName}
                </a>
              ))}
            </>
          )}
          <div className={`flex items-center gap-2 mt-1 text-[10px] ${mine ? 'text-blue-200' : 'text-gray-400'}`}>
            <span>{timeLabel(m.createdAt)}</span>
            {m.editedAt && !m.deletedAt && <span>(edited)</span>}
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
                <p className="font-semibold text-gray-900 truncate">{dmTitle(activeChannel)}</p>
                <p className="text-xs text-gray-500">
                  {activeChannel.isSystem ? 'System channel' : activeChannel.type === 'DIRECT' ? 'Direct message' : 'Custom channel'}
                  {activeChannel.memberCount ? ` · ${activeChannel.memberCount} members` : ''}
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draft}
                    onChange={e => handleDraftChange(e.target.value)}
                    placeholder={threadRoot ? 'Reply in thread…' : 'Type a message…'}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !draft.trim()}
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

function DmUserSearch({ onPick }: { onPick: (u: ChatUserLite) => void }) {
  const [selected, setSelected] = useState<ChatUserLite[]>([]);
  return (
    <div>
      <UserPicker selected={selected} onChange={users => {
        setSelected(users);
        if (users.length === 1) onPick(users[0]);
      }} />
      <p className="text-xs text-gray-400 mt-2">Pick a user to open (or resume) a direct conversation.</p>
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
              <p className="text-sm text-gray-900">
                {m.user?.name || `User #${m.userId}`}
                {m.userId === myId && <span className="text-gray-400"> (you)</span>}
              </p>
              <p className="text-xs text-gray-400">{m.role === 'ADMIN' ? 'Admin' : (m.user?.roles || []).join(', ') || 'Member'}</p>
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
