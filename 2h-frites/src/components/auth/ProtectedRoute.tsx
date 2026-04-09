'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { UserRole } from '@/types/auth';

interface Props {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: Props) {
  const { user, isAuthenticated, loaded } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (loaded && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loaded, isAuthenticated, router]);

  if (!loaded) return null;

  if (!isAuthenticated) return null;

  if (!allowedRoles.includes(user!.role)) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
        <div className="text-center">
          <span className="text-5xl block mb-4">🔒</span>
          <h1 className="text-xl font-bold text-white mb-2">{t.ui.auth_accessDenied}</h1>
          <button onClick={() => router.back()} className="text-amber-400 text-sm font-medium mt-4">
            ← {t.ui.back}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
