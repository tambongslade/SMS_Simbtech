// Socket.IO singleton for chat real-time events.
//
// The server auto-joins user:<id> and every channel:<id> room at handshake, so
// consumers only need to attach listeners. The JWT is only validated at
// handshake time — call reconnectChatSocket() after a token refresh.

import { io, Socket } from 'socket.io-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

const socketHost = (): string => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  }
};

let socket: Socket | null = null;
let socketToken: string | null = null;

export function getChatSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('token');
  if (!token) return null;

  if (socket && socketToken === token) return socket;

  // Token changed (login/refresh) — drop the old handshake.
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socketToken = token;
  socket = io(socketHost(), {
    path: '/socket.io',
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
  });

  socket.on('connect_error', (err: Error) => {
    if (err.message?.startsWith('unauthorized')) {
      // Token invalid/blacklisted — stop hammering the server; a fresh
      // getChatSocket() after re-login will rebuild the connection.
      socket?.disconnect();
    }
  });

  return socket;
}

export function reconnectChatSocket(): Socket | null {
  socket?.disconnect();
  socket = null;
  socketToken = null;
  return getChatSocket();
}

export function disconnectChatSocket(): void {
  socket?.disconnect();
  socket = null;
  socketToken = null;
}
