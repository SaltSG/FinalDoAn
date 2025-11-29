import { getAuthToken } from './auth';

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  provider: 'local' | 'google';
  picture?: string;
  role?: 'user' | 'admin';
  status?: 'active' | 'locked';
  createdAt?: string;
  updatedAt?: string;
};

export type AdminUserStatsPoint = {
  date: string;       // yyyy-MM-dd
  newUsers: number;
  totalUsers: number;
};

export type AdminUserStats = {
  totalUsers: number;
  activeLast7Days: number;
  daily: AdminUserStatsPoint[];
};

async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const res = await authFetch('/api/admin/users');
  if (!res.ok) throw new Error('Không tải được danh sách người dùng');
  const data = await res.json();
  return (data.users ?? []) as AdminUser[];
}

export async function fetchAdminUserStats(): Promise<AdminUserStats> {
  const res = await authFetch('/api/admin/stats/users');
  if (!res.ok) throw new Error('Không tải được thống kê người dùng');
  const data = await res.json();
  return {
    totalUsers: data.totalUsers ?? 0,
    activeLast7Days: data.activeLast7Days ?? 0,
    daily: Array.isArray(data.daily)
      ? (data.daily as any[]).map((d) => ({
          date: String(d.date),
          newUsers: Number(d.newUsers ?? 0),
          totalUsers: Number(d.totalUsers ?? 0),
        }))
      : [],
  };
}

export async function updateAdminUser(
  id: string,
  payload: Partial<Pick<AdminUser, 'role' | 'status'>>
): Promise<AdminUser> {
  const res = await authFetch(`/api/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // ignore
  }
  if (!res.ok) {
    const code = data?.message;
    if (code === 'cannot_lock_self') {
      throw new Error('Không thể khóa tài khoản của chính bạn.');
    }
    if (code === 'user_not_found') {
      throw new Error('Không tìm thấy người dùng.');
    }
    throw new Error('Cập nhật người dùng thất bại');
  }
  return (data?.user ?? null) as AdminUser;
}


