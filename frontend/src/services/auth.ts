export type AuthUser = {
  id: string;
  name: string;
  email: string;
  picture?: string;
  provider: 'local' | 'google';
  role?: 'user' | 'admin';
  status?: 'active' | 'locked';
};

const LS_KEY = 'auth.user';
const LS_TOKEN = 'auth.token';

export function getAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuthUser(user: AuthUser | null) {
  if (!user) {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_TOKEN);
    return;
  }
  localStorage.setItem(LS_KEY, JSON.stringify(user));
}

export function signOut() {
  setAuthUser(null);
}

export function getAuthToken(): string | null {
  try { return localStorage.getItem(LS_TOKEN); } catch { return null; }
}

export function setAuthToken(token: string | null) {
  if (!token) { try { localStorage.removeItem(LS_TOKEN); } catch {} return; }
  try { localStorage.setItem(LS_TOKEN, token); } catch {}
}

// Decode Google ID token (JWT) payload without verification (for demo only)
function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function authUserFromGoogleCredential(credential: string): AuthUser | null {
  const payload = decodeJwtPayload(credential);
  if (!payload) return null;
  const user: AuthUser = {
    id: payload.sub ?? payload.email ?? crypto.randomUUID(),
    name: payload.name ?? payload.given_name ?? 'User',
    email: payload.email ?? 'unknown',
    picture: payload.picture,
    provider: 'google',
  };
  return user;
}
