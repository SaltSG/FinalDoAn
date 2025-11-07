export type ChatMessageDto = {
  _id: string;
  room: string;
  userId: string;
  userName?: string;
  content: string;
  createdAt: string;
};

function resolveApiBase(): string {
  const env = (import.meta as any).env;
  const fromEnv = env && env.VITE_API_BASE;
  if (fromEnv) return String(fromEnv).replace(/\/$/, '');
  const isDev = typeof window !== 'undefined' && location.port === '5173';
  return isDev ? 'http://127.0.0.1:5000' : '';
}
const API_BASE = resolveApiBase();

import { getAuthToken } from './auth';

async function getJson(path: string) {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'same-origin', headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function postJson(path: string, body: any) {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchMessages(room = 'global', limit = 100): Promise<ChatMessageDto[]> {
  const rs = await getJson(`/api/chat/messages?room=${encodeURIComponent(room)}&limit=${limit}`);
  return (rs?.data as ChatMessageDto[]) || [];
}

export async function sendMessage(room: string, userId: string, userName: string | undefined, content: string): Promise<ChatMessageDto> {
  const rs = await postJson('/api/chat/send', { room, userId, userName, content });
  return rs.data as ChatMessageDto;
}

export type ChatEvent = { type: 'message'; data: ChatMessageDto };

export function subscribe(room: string, onEvent: (evt: ChatEvent) => void): () => void {
  const es = new EventSource(`${API_BASE}/api/chat/stream?room=${encodeURIComponent(room)}`);
  es.onmessage = (ev) => {
    try { const payload = JSON.parse(ev.data) as ChatEvent; onEvent(payload); } catch { /* ignore */ }
  };
  es.onerror = () => { /* silently */ };
  return () => es.close();
}

// Server-side unread helpers
export async function getUnreadCount(room: string): Promise<{ unread: number; lastReadAt: string }>
{
  const rs = await getJson(`/api/chat/unread?room=${encodeURIComponent(room)}`);
  const d = rs?.data || { unread: 0, lastReadAt: new Date(0).toISOString() };
  return { unread: Number(d.unread || 0), lastReadAt: new Date(d.lastReadAt || 0).toISOString() };
}

export async function markRead(room: string): Promise<void> {
  await postJson('/api/chat/read', { room });
}


