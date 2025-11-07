export type DeadlineStatus = 'upcoming' | 'ongoing' | 'overdue' | 'completed';

export type DeadlineDto = {
  _id: string;
  title: string;
  startAt?: string | null;
  endAt?: string | null;
  note?: string;
  status: DeadlineStatus;
  createdAt: string;
  updatedAt: string;
};

async function getJson(path: string) {
  const res = await fetch(path, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function postJson(path: string, body: any) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function putJson(path: string, body: any) {
  const res = await fetch(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function del(path: string) {
  const res = await fetch(path, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export type DeadlineFilter = 'upcoming' | 'ongoing' | 'overdue' | 'completed' | 'incomplete';

export async function fetchDeadlines(userId: string, status?: DeadlineFilter): Promise<DeadlineDto[]> {
  const query = new URLSearchParams({ userId });
  if (status) query.set('status', status);
  const rs = await getJson(`/api/deadlines?${query.toString()}`);
  return (rs?.data as DeadlineDto[]) || [];
}

export async function createDeadline(userId: string, payload: Partial<DeadlineDto>): Promise<DeadlineDto> {
  const rs = await postJson('/api/deadlines', { userId, ...payload });
  return rs.data as DeadlineDto;
}

export async function updateDeadline(userId: string, id: string, payload: Partial<DeadlineDto>): Promise<DeadlineDto> {
  const rs = await putJson(`/api/deadlines/${encodeURIComponent(id)}`, { userId, ...payload });
  return rs.data as DeadlineDto;
}

export async function deleteDeadline(userId: string, id: string): Promise<void> {
  await del(`/api/deadlines/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`);
}


