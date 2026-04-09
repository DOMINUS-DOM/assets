'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types/auth';
import { authStore, parseToken } from '@/stores/authStore';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  loaded: boolean;
  login: (email: string, password: string) => string | null; // returns error key or null
  register: (data: { email: string; password: string; name: string; phone: string }) => string | null;
  logout: () => void;
  updateProfile: (data: Partial<Pick<User, 'name' | 'phone' | 'email'>>) => void;
  changePassword: (oldPassword: string, newPassword: string) => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);
const TOKEN_KEY = '2h-auth-token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Restore session on mount
  useEffect(() => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        const payload = parseToken(token);
        if (payload) {
          const u = authStore.getUserById(payload.userId);
          if (u && u.active) setUser(u);
          else localStorage.removeItem(TOKEN_KEY);
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
      }
    } catch {}
    setLoaded(true);
  }, []);

  const login = useCallback((email: string, password: string): string | null => {
    const result = authStore.login(email, password);
    if (!result) return 'auth_badCredentials';
    try { localStorage.setItem(TOKEN_KEY, result.token); } catch {}
    setUser(result.user);
    return null;
  }, []);

  const register = useCallback((data: { email: string; password: string; name: string; phone: string }): string | null => {
    const result = authStore.register(data);
    if (!result) return 'auth_emailTaken';
    try { localStorage.setItem(TOKEN_KEY, result.token); } catch {}
    setUser(result.user);
    return null;
  }, []);

  const logout = useCallback(() => {
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
    setUser(null);
  }, []);

  const updateProfile = useCallback((data: Partial<Pick<User, 'name' | 'phone' | 'email'>>) => {
    if (!user) return;
    const updated = authStore.updateUser(user.id, data);
    if (updated) setUser(updated);
  }, [user]);

  const changePassword = useCallback((oldPassword: string, newPassword: string): boolean => {
    if (!user) return false;
    return authStore.changePassword(user.id, oldPassword, newPassword);
  }, [user]);

  const hasRole = useCallback((...roles: UserRole[]) => {
    return user ? roles.includes(user.role) : false;
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user, role: user?.role || null, isAuthenticated: !!user, loaded,
      login, register, logout, updateProfile, changePassword, hasRole,
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
