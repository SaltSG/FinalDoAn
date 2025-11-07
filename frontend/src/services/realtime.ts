import { io, Socket } from 'socket.io-client';
import { getAuthToken, getAuthUser } from './auth';

type Handlers = {
  onMessage?: (payload: any) => void;
  onTyping?: (payload: { room: string; userId: string; userName?: string; typing: boolean }) => void;
  onRead?: (payload: { room: string; messageId: string; readerId: string }) => void;
  onPresence?: (payload: { userId: string; online: boolean }) => void;
};

let socketRef: Socket | null = null;
let currentToken: string | null = null;

function resolveBackendUrl(): string | undefined {
  // Allow override via VITE_API_BASE; otherwise default to dev backend
  const env = (import.meta as any).env;
  const fromEnv = env && env.VITE_API_BASE;
  if (fromEnv) return String(fromEnv).replace(/\/$/, '');
  const isDev = typeof window !== 'undefined' && location.port === '5173';
  if (isDev) return 'http://127.0.0.1:5000';
  return undefined; // same-origin in production
}

export function getSocket(): Socket | null {
  const token = getAuthToken();
  if (token !== currentToken && socketRef) {
    try { socketRef.disconnect(); } catch {}
    socketRef = null;
  }
  currentToken = token;
  if (socketRef && socketRef.connected) return socketRef;
  if (!token) return null;
  const base = resolveBackendUrl();
  const options: any = { path: '/socket.io', auth: { token }, reconnection: true };
  socketRef = base ? io(base, options) : io('/', options);
  return socketRef;
}

export function subscribeToRoom(room: string, handlers: Handlers = {}): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  const { onMessage, onTyping, onRead, onPresence } = handlers;
  const m = (p: any) => onMessage?.(p);
  const t = (p: any) => onTyping?.(p);
  const r = (p: any) => onRead?.(p);
  const pr = (p: any) => onPresence?.(p);

  socket.emit('chat:join', room);
  socket.on('chat:message', m);
  socket.on('chat:typing', t);
  socket.on('chat:read', r);
  socket.on('presence:state', pr);

  return () => {
    try { socket.emit('chat:leave', room); } catch {}
    socket.off('chat:message', m);
    socket.off('chat:typing', t);
    socket.off('chat:read', r);
    socket.off('presence:state', pr);
  };
}

export function sendChat(room: string, content: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = getSocket();
    if (!socket) return reject(new Error('socket_unavailable'));
    socket.emit('chat:send', { room, content }, (err?: string) => {
      if (err) reject(new Error(err)); else resolve();
    });
  });
}

export function sendTyping(room: string, typing: boolean) {
  const socket = getSocket();
  if (!socket) return;
  socket.emit('chat:typing', { room, typing });
}

export function sendRead(room: string, messageId: string) {
  const socket = getSocket();
  if (!socket) return;
  socket.emit('chat:read', { room, messageId });
}


