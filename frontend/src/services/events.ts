import { getAuthToken } from './auth';

function resolveApiBase(): string {
  const env = (import.meta as any).env;
  const fromEnv = env && env.VITE_API_BASE;
  if (fromEnv) return String(fromEnv).replace(/\/$/, '');
  const isDev = typeof window !== 'undefined' && location.port === '5173';
  return isDev ? 'http://127.0.0.1:5000' : '';
}
const API_BASE = resolveApiBase();

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

async function putJson(path: string, body: any) {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: 'PUT', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function delJson(path: string) {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export type CalendarEventDto = {
  _id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  description?: string;
  color?: string;
   seriesId?: string;
};

export async function fetchEvents(range?: { start: string; end: string }): Promise<CalendarEventDto[]> {
  const qs = range ? `?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}` : '';
  const rs = await getJson(`/api/events${qs}`);
  return (rs?.data as CalendarEventDto[]) || [];
}

export async function createEvent(payload: Partial<CalendarEventDto>): Promise<CalendarEventDto> {
  const rs = await postJson('/api/events', payload);
  return rs.data as CalendarEventDto;
}

export async function updateEvent(id: string, payload: Partial<CalendarEventDto>): Promise<CalendarEventDto> {
  const rs = await putJson(`/api/events/${encodeURIComponent(id)}`, payload);
  return rs.data as CalendarEventDto;
}

export async function deleteEvent(id: string): Promise<void> {
  await delJson(`/api/events/${encodeURIComponent(id)}`);
}


