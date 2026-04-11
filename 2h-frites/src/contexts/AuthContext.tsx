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

  // Restore session on mount
  useEffect(() => {
    const restore = async () => {
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
          const { user } = await api.post<{ user: SafeUser }>('/auth', { action: 'me' });
          setUser(user);
        }
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

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
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
