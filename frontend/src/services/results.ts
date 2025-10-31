export type CourseOverride = {
  grade?: number;
  status?: 'passed' | 'failed' | 'in-progress';
  name?: string;
  credit?: number;
};

export type OverrideData = Record<string, Record<string, CourseOverride>>;

async function getJson(path: string) {
  const res = await fetch(path, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function putJson(path: string, body: any) {
  const res = await fetch(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchResults(userId: string): Promise<OverrideData> {
  const rs = await getJson(`/api/results?userId=${encodeURIComponent(userId)}`);
  return (rs?.data as OverrideData) || {};
}

export async function saveResults(userId: string, data: OverrideData): Promise<void> {
  await putJson(`/api/results`, { userId, data });
}

export async function saveSpecialization(userId: string, specialization: 'dev' | 'design'): Promise<void> {
  await putJson(`/api/results`, { userId, specialization });
}

export async function fetchResultsMeta(userId: string): Promise<{ data: OverrideData; specialization?: 'dev' | 'design'; stats?: any }>{
  const rs = await getJson(`/api/results?userId=${encodeURIComponent(userId)}`);
  return { data: (rs?.data as OverrideData) || {}, specialization: rs?.specialization as any, stats: rs?.stats };
}


