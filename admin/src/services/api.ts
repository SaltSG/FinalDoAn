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

const LS_TOKEN = 'admin.auth.token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(LS_TOKEN);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (!token) {
      localStorage.removeItem(LS_TOKEN);
    } else {
      localStorage.setItem(LS_TOKEN, token);
    }
  } catch {
    // ignore
  }
}

export async function adminLogin(email: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error('Đăng nhập thất bại');
  }
  const data = await res.json();
  const token = data.token as string | undefined;
  if (!token) throw new Error('Thiếu token từ server');
  setToken(token);
  return data.user as { id: string; email: string; name: string; role?: string };
}

async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

export async function fetchUsers(): Promise<AdminUser[]> {
  const res = await authFetch('/api/admin/users');
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (res.status === 403) throw new Error('FORBIDDEN');
  if (!res.ok) throw new Error('Không tải được danh sách người dùng');
  const data = await res.json();
  return (data.users ?? []) as AdminUser[];
}

export async function updateUser(id: string, payload: Partial<Pick<AdminUser, 'role' | 'status'>>) {
  const res = await authFetch(`/api/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Cập nhật người dùng thất bại');
  const data = await res.json();
  return data.user as AdminUser;
}


