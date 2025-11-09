export type ChatMessageDto = {
  _id: string;
  room: string;
  userId: string;
  userName?: string;
  content: string;
  attachment?: {
    url: string;
    name: string;
    size: number;
    mimeType?: string;
    width?: number;
    height?: number;
  };
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

export async function sendMessage(room: string, content: string): Promise<ChatMessageDto> {
  const rs = await postJson('/api/chat/send', { room, content });
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

export type UploadedFile = { url: string; name: string; size: number; mimeType?: string };

export async function uploadChatFile(file: File, onProgress?: (percent: number) => void): Promise<UploadedFile> {
  const token = getAuthToken();
  const url = `${API_BASE}/api/chat/upload`;
  return new Promise<UploadedFile>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.onload = () => {
      try {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          resolve(data?.file as UploadedFile);
        } else {
          reject(new Error(xhr.responseText || 'upload_failed'));
        }
      } catch (e: any) {
        reject(e);
      }
    };
    xhr.onerror = () => reject(new Error('network_error'));
    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable) return;
        const p = Math.round((evt.loaded / evt.total) * 100);
        onProgress(p);
      };
    }
    const fd = new FormData();
    fd.append('file', file);
    xhr.send(fd);
  });
}

export function resolveFileUrl(url: string): string {
  if (!url) return url;
  const abs = url.startsWith('http://') || url.startsWith('https://');
  if (abs) return url;
  // In dev, prefer proxy via the same origin for assets like /uploads to avoid odd cross-origin issues
  if (url.startsWith('/uploads')) return url;
  return `${API_BASE}${url}`;
}


