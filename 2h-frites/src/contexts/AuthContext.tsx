'use client';

import { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { UserRole } from '@/types/auth';
import { api } from '@/lib/api';
import { hasPermission as checkPermission } from '@/lib/permissions';

// Safe user type (no passwordHash)
interface SafeUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  active: boolean;
  avatarUrl?: string | null;
  permissionsJson?: string | null;
  driverId?: string | null;
  locationId?: string | null;
}

interface AuthContextType {
  user: SafeUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  loaded: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (data: { email: string; password: string; name: string; phone: string }) => Promise<string | null>;
  logout: () => void;
  updateProfile: (data: Partial<Pick<SafeUser, 'name' | 'phone' | 'email'>>) => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  hasRole: (...roles: UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);
const TOKEN_KEY = '2h-auth-token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Restore session on mount — try cookie (cross-subdomain) or localStorage token
  useEffect(() => {
    const restore = async () => {
      const hasToken = !!localStorage.getItem(TOKEN_KEY);

      if (!hasToken) {
        // No localStorage token — still try the API (cookie is HttpOnly, can't check client-side)
        // but use a short timeout to avoid blocking the page
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);
          const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ action: 'me' }),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (res.ok) {
            const data = await res.json();
            if (data.user) setUser(data.user);
          }
        } catch {
          // No cookie session either — that's fine
        }
        setLoaded(true);
        return;
      }

      try {
        const { user } = await api.post<{ user: SafeUser }>('/auth', { action: 'me' });
        setUser(user);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
      }
      setLoaded(true);
    };
    restore();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    try {
      const { token, user } = await api.post<{ token: string; user: SafeUser }>('/auth', { action: 'login', email, password });
      localStorage.setItem(TOKEN_KEY, token);
      setUser(user);
      return null;
    } catch (err: any) {
      return err?.error || 'auth_badCredentials';
    }
  }, []);

  const register = useCallback(async (data: { email: string; password: string; name: string; phone: string }): Promise<string | null> => {
    try {
      const { token, user } = await api.post<{ token: string; user: SafeUser }>('/auth', { action: 'register', ...data });
      localStorage.setItem(TOKEN_KEY, token);
      setUser(user);
      return null;
    } catch (err: any) {
      return err?.error || 'auth_emailTaken';
    }
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem(TOKEN_KEY);
    // Clear server-side session cookie
    try { await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) }); } catch {}
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data: Partial<Pick<SafeUser, 'name' | 'phone' | 'email'>>) => {
    try {
      await api.post('/auth', { action: 'updateProfile', ...data });
      if (user) setUser({ ...user, ...data });
    } catch {}
  }, [user]);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string): Promise<boolean> => {
    try {
      await api.post('/auth', { action: 'changePassword', oldPassword, newPassword });
      return true;
    } catch { return false; }
  }, []);

  const currentRole = user?.role || null;
  const hasRole = useCallback((...roles: UserRole[]) => {
    return currentRole ? roles.includes(currentRole) : false;
  }, [currentRole]);

  const hasPermissionFn = useCallback((permission: string) => {
    return checkPermission(user, permission);
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user, role: user?.role || null, isAuthenticated: !!user, loaded,
      login, register, logout, updateProfile, changePassword, hasRole,
      hasPermission: hasPermissionFn,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
