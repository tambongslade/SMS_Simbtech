// HTTP client for the chat & real-time messaging API.
//
// Casing quirk: request bodies are camelCase (middleware converts), but chat
// responses and socket payloads keep snake_case field names (chatService
// bypasses the reverse converter). normalizeChannel/normalizeMessage accept
// both and produce camelCase objects for the UI.

import apiService from './apiService';

export type ChannelType = 'DEPARTMENT' | 'SUBJECT' | 'CUSTOM' | 'DIRECT';
export type MemberRole = 'MEMBER' | 'ADMIN';

export const PARENT_CONTACTABLE_ROLES = [
  'TEACHER', 'HOD', 'BURSAR', 'VICE_PRINCIPAL', 'DEAN_OF_STUDIES', 'GUIDANCE_COUNSELOR', 'PRINCIPAL',
];

export interface ChatUserLite {
  id: number;
  name: string;
  matricule?: string;
  photo?: string | null;
  roles?: string[];
}

export interface ChatMember {
  userId: number;
  role: MemberRole;
  user?: ChatUserLite;
}

export interface ChatAttachment {
  id?: number;
  fileUrl: string;
  fileName: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
}

export interface ChatReaction {
  id?: number;
  emoji: string;
  userId: number;
  user?: { id: number; name: string };
}

export interface ChatMessage {
  id: number;
  channelId: number;
  content: string;
  parentMessageId: number | null;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt?: string;
  sender?: ChatUserLite;
  senderId?: number;
  attachments: ChatAttachment[];
  reactions: ChatReaction[];
  replyCount: number;
}

export interface ChatChannel {
  id: number;
  name: string;
  type: ChannelType;
  department?: string | null;
  subject?: string | null;
  description?: string | null;
  isPrivate: boolean;
  isSystem: boolean;
  myRole: MemberRole;
  muted: boolean;
  lastReadAt: string | null;
  unreadCount: number;
  lastMessage: { id: number; content: string; senderId?: number; senderName?: string; createdAt?: string } | null;
  memberCount?: number;
  members?: ChatMember[];
  updatedAt?: string;
}

const pick = (obj: any, camel: string, snake: string) => obj?.[camel] ?? obj?.[snake];

export const normalizeUser = (u: any): ChatUserLite | undefined => {
  if (!u) return undefined;
  const roles = (pick(u, 'userRoles', 'user_roles') || []).map((r: any) => r.role).filter(Boolean);
  return { id: u.id, name: u.name, matricule: u.matricule, photo: u.photo, roles };
};

export const normalizeMessage = (m: any): ChatMessage => ({
  id: m.id,
  channelId: pick(m, 'channelId', 'channel_id'),
  content: m.content ?? '',
  parentMessageId: pick(m, 'parentMessageId', 'parent_message_id') ?? null,
  editedAt: pick(m, 'editedAt', 'edited_at') ?? null,
  deletedAt: pick(m, 'deletedAt', 'deleted_at') ?? null,
  createdAt: pick(m, 'createdAt', 'created_at'),
  updatedAt: pick(m, 'updatedAt', 'updated_at'),
  sender: normalizeUser(m.sender),
  senderId: pick(m, 'senderId', 'sender_id') ?? m.sender?.id,
  attachments: (m.attachments || []).map((a: any) => ({
    id: a.id,
    fileUrl: pick(a, 'fileUrl', 'file_url'),
    fileName: pick(a, 'fileName', 'file_name'),
    mimeType: pick(a, 'mimeType', 'mime_type'),
    sizeBytes: pick(a, 'sizeBytes', 'size_bytes'),
  })),
  reactions: (m.reactions || []).map((r: any) => ({
    id: r.id,
    emoji: r.emoji,
    userId: pick(r, 'userId', 'user_id'),
    user: r.user ? { id: r.user.id, name: r.user.name } : undefined,
  })),
  replyCount: m._count?.replies ?? 0,
});

export const normalizeChannel = (c: any): ChatChannel => {
  const lastMessage = pick(c, 'lastMessage', 'last_message');
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    department: c.department ?? null,
    subject: c.subject ?? null,
    description: c.description ?? null,
    isPrivate: !!pick(c, 'isPrivate', 'is_private'),
    isSystem: !!pick(c, 'isSystem', 'is_system'),
    myRole: pick(c, 'myRole', 'my_role') ?? 'MEMBER',
    muted: !!c.muted,
    lastReadAt: pick(c, 'lastReadAt', 'last_read_at') ?? null,
    unreadCount: pick(c, 'unreadCount', 'unread_count') ?? 0,
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          content: lastMessage.content ?? '',
          senderId: pick(lastMessage, 'senderId', 'sender_id'),
          senderName: lastMessage.sender?.name,
          createdAt: pick(lastMessage, 'createdAt', 'created_at'),
        }
      : null,
    memberCount: pick(c, 'memberCount', 'member_count'),
    members: (c.members || []).map((mm: any) => ({
      userId: pick(mm, 'userId', 'user_id'),
      role: mm.role,
      user: normalizeUser(mm.user),
    })),
    updatedAt: pick(c, 'updatedAt', 'updated_at'),
  };
};

// --- Channels ---

export const listChannels = async (): Promise<ChatChannel[]> => {
  const res = await apiService.get<{ data: any[] }>('/chat/channels');
  return (res.data || []).map(normalizeChannel);
};

export const createChannel = async (body: {
  name: string;
  description?: string;
  memberIds: number[];
  isPrivate?: boolean;
}): Promise<ChatChannel> => {
  const res = await apiService.post<{ data: any }>('/chat/channels', body);
  return normalizeChannel(res.data);
};

export const getChannel = async (id: number): Promise<ChatChannel> => {
  const res = await apiService.get<{ data: any }>(`/chat/channels/${id}`);
  return normalizeChannel(res.data);
};

export const addChannelMember = async (channelId: number, userId: number): Promise<void> => {
  await apiService.post(`/chat/channels/${channelId}/members`, { userId });
};

export const removeChannelMember = async (channelId: number, userId: number): Promise<void> => {
  await apiService.delete(`/chat/channels/${channelId}/members/${userId}`);
};

// --- Messages ---

export const listMessages = async (
  channelId: number,
  opts: { limit?: number; before?: string; threadOf?: number } = {}
): Promise<ChatMessage[]> => {
  const params = new URLSearchParams();
  params.set('limit', String(opts.limit ?? 50));
  if (opts.before) params.set('before', opts.before);
  if (opts.threadOf) params.set('threadOf', String(opts.threadOf));
  const res = await apiService.get<{ data: any[] }>(`/chat/channels/${channelId}/messages?${params.toString()}`);
  return (res.data || []).map(normalizeMessage);
};

export const postMessage = async (
  channelId: number,
  body: { content?: string; parentMessageId?: number | null; attachments?: ChatAttachment[] }
): Promise<ChatMessage> => {
  const res = await apiService.post<{ data: any }>(`/chat/channels/${channelId}/messages`, {
    content: body.content ?? '',
    parentMessageId: body.parentMessageId ?? null,
    attachments: (body.attachments || []).map(a => ({
      fileUrl: a.fileUrl,
      fileName: a.fileName,
      mimeType: a.mimeType ?? undefined,
      sizeBytes: a.sizeBytes ?? undefined,
    })),
  });
  return normalizeMessage(res.data);
};

export const editMessage = async (messageId: number, content: string): Promise<ChatMessage> => {
  const res = await apiService.patch<{ data: any }>(`/chat/messages/${messageId}`, { content });
  return normalizeMessage(res.data);
};

export const deleteMessage = async (messageId: number): Promise<void> => {
  await apiService.delete(`/chat/messages/${messageId}`);
};

// --- Reactions ---

export const addReaction = async (messageId: number, emoji: string): Promise<ChatReaction> => {
  const res = await apiService.post<{ data: any }>(`/chat/messages/${messageId}/reactions`, { emoji });
  const r = res.data || {};
  return { id: r.id, emoji: r.emoji ?? emoji, userId: r.user_id ?? r.userId, user: r.user };
};

export const removeReaction = async (messageId: number, emoji: string): Promise<void> => {
  await apiService.delete(`/chat/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
};

// --- Read state ---

export const markChannelRead = async (channelId: number, upToMessageId?: number): Promise<string | null> => {
  const res = await apiService.post<{ data: any }>(`/chat/channels/${channelId}/read`, {
    upToMessageId: upToMessageId ?? undefined,
  });
  // Nested envelope: res.data = { success, last_read_at }
  return res.data?.last_read_at ?? res.data?.lastReadAt ?? null;
};

// --- Direct messages ---

export const openDm = async (userIds: number[]): Promise<ChatChannel> => {
  const res = await apiService.post<{ data: any }>('/chat/dm', { userIds });
  return normalizeChannel(res.data);
};

// --- Parent contact directory ---

export interface ParentContacts {
  fixedStaff: ChatUserLite[];
  childTeachers: Array<ChatUserLite & {
    teaches: Array<{ student: { id: number; name: string }; subject: { id: number; name: string }; subClass: { id: number; name: string } }>;
  }>;
  hodsBySubject: Array<{ subject: { id: number; name: string }; hod: ChatUserLite }>;
}

export const listParentContacts = async (): Promise<ParentContacts> => {
  const res = await apiService.get<{ data: any }>('/parents/me/contacts');
  const d = res.data || {};
  return {
    fixedStaff: (d.fixedStaff || []).map((u: any) => normalizeUser(u)!),
    childTeachers: (d.childTeachers || []).map((u: any) => ({ ...normalizeUser(u)!, teaches: u.teaches || [] })),
    hodsBySubject: (d.hodsBySubject || []).map((e: any) => ({ subject: e.subject, hod: normalizeUser(e.hod)! })),
  };
};

export const contactStaff = async (userId: number): Promise<ChatChannel> => {
  const res = await apiService.post<{ data: any }>(`/parents/me/contact/${userId}`, {});
  return normalizeChannel(res.data);
};

// --- User search (channel creation / DM picker) ---

export const searchUsers = async (search: string, limit = 20): Promise<ChatUserLite[]> => {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (search) qs.append('search', search);
  const res = await apiService.get<{ data: any[] }>(`/users?${qs.toString()}`);
  return (res.data || []).map((u: any) => normalizeUser(u)!);
};
