const BASE = '/api';

// ─── Auth expiry event ───
// Components can listen for this to prompt re-login
let onAuthExpired: (() => void) | null = null;
export function setOnAuthExpired(handler: (() => void) | null) {
  onAuthExpired = handler;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('2h-auth-token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    headers,
    credentials: 'include', // Send session cookie cross-subdomain
    ...options,
  });
  if (!res.ok) {
    // Detect token expiry (401) and notify
    if (res.status === 401 && onAuthExpired) {
      onAuthExpired();
    }
    const error = await res.json().catch(() => ({ error: 'unknown', status: res.status }));
    error._status = res.status;
    throw error;
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
};
