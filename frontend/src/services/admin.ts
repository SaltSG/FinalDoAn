const API_BASE = '';

async function getJson(path: string) {
  const token = localStorage.getItem('auth.token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { headers, credentials: 'same-origin' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function putJson(path: string, body: any) {
  const token = localStorage.getItem('auth.token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
    credentials: 'same-origin',
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function deleteJson(path: string) {
  const token = localStorage.getItem('auth.token');
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers,
    credentials: 'same-origin',
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function postJson(path: string, body: any) {
  const token = localStorage.getItem('auth.token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    credentials: 'same-origin',
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export type AdminStats = {
  users: {
    total: number;
    admins: number;
    students: number;
    local: number;
    google: number;
    recent: number;
  };
  deadlines: {
    total: number;
    completed: number;
    ongoing: number;
    overdue: number;
  };
  curriculum: {
    dev: {
      exists: boolean;
      students: number;
    };
    design: {
      exists: boolean;
      students: number;
    };
  };
  chat: {
    totalMessages: number;
  };
  results: {
    total: number;
  };
};

export type User = {
  _id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  provider: 'local' | 'google';
  picture?: string;
  createdAt: string;
  updatedAt: string;
};

export type UserWithStats = {
  user: User;
  stats: {
    hasResults: boolean;
    deadlinesCount: number;
    messagesCount: number;
    specialization?: 'dev' | 'design';
  };
};

export type Deadline = {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  title: string;
  startAt?: string;
  endAt?: string;
  note?: string;
  status: 'upcoming' | 'ongoing' | 'overdue' | 'completed';
  createdAt: string;
  updatedAt: string;
};

export async function getAdminStats(): Promise<AdminStats> {
  return getJson('/api/admin/stats');
}

export async function listUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'user' | 'admin';
}): Promise<{
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  if (params?.role) query.set('role', params.role);
  return getJson(`/api/admin/users?${query.toString()}`);
}

export async function getUser(id: string): Promise<UserWithStats> {
  return getJson(`/api/admin/users/${id}`);
}

export async function updateUser(id: string, data: {
  name?: string;
  role?: 'user' | 'admin';
  email?: string;
}): Promise<{ ok: boolean; user: User }> {
  return putJson(`/api/admin/users/${id}`, data);
}

export async function deleteUser(id: string): Promise<{ ok: boolean }> {
  return deleteJson(`/api/admin/users/${id}`);
}

export async function getAllDeadlines(params?: {
  page?: number;
  limit?: number;
  status?: 'upcoming' | 'ongoing' | 'overdue' | 'completed';
}): Promise<{
  data: Deadline[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.status) query.set('status', params.status);
  return getJson(`/api/admin/deadlines?${query.toString()}`);
}

export async function getChatStats(): Promise<{
  total: number;
  withAttachments: number;
  rooms: Array<{
    _id: string;
    count: number;
    withAttachments: number;
  }>;
  recent: Array<any>;
}> {
  return getJson('/api/admin/chat/stats');
}

