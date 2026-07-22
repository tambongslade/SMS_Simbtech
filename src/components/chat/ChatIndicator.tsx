'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { listChannels } from '@/lib/chatApi';
import { getChatSocket } from '@/lib/chatSocket';
import { useAuth } from '@/components/context/AuthContext';

// Navbar chat icon with a live unread-messages badge. Cold count comes from
// GET /chat/channels; socket events keep it fresh between polls.
export default function ChatIndicator({ className = '' }: { className?: string }) {
  const [unread, setUnread] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const channels = await listChannels();
      setUnread(channels.reduce((n, c) => n + (c.unreadCount || 0), 0));
    } catch {
      // Chat backend unavailable — keep the last known badge.
    }
  }, []);

  // Coalesce bursts of socket events into one refetch.
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) return;
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      refresh();
    }, 1500);
  }, [refresh]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000);

    const socket = getChatSocket();
    const onMessageNew = (msg: any) => {
      const senderId = msg?.sender_id ?? msg?.senderId ?? msg?.sender?.id;
      if (senderId !== user?.id) scheduleRefresh();
    };
    const onReadUpdated = (p: any) => {
      if ((p?.user_id ?? p?.userId) === user?.id) scheduleRefresh();
    };
    const onChannelCreated = () => scheduleRefresh();
    const onReconnect = () => refresh();

    socket?.on('message.new', onMessageNew);
    socket?.on('read.updated', onReadUpdated);
    socket?.on('channel.created', onChannelCreated);
    socket?.on('connect', onReconnect);

    return () => {
      clearInterval(interval);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      socket?.off('message.new', onMessageNew);
      socket?.off('read.updated', onReadUpdated);
      socket?.off('channel.created', onChannelCreated);
      socket?.off('connect', onReconnect);
    };
  }, [refresh, scheduleRefresh, user?.id]);

  const openChat = () => {
    // /dashboard/<role>/... — reuse the current role segment for the chat route
    const role = pathname?.split('/')[2];
    if (role) router.push(`/dashboard/${role}/chat`);
  };

  return (
    <button
      onClick={openChat}
      className={`relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors ${className}`}
      title="Chat"
      aria-label={`Chat${unread > 0 ? `, ${unread} unread messages` : ''}`}
    >
      <ChatBubbleLeftRightIcon className="h-6 w-6" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
}
