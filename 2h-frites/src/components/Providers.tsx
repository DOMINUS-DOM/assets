'use client';

import { useEffect } from 'react';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { LocationProvider } from '@/contexts/LocationContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TenantProvider } from '@/contexts/TenantContext';
import { TenantThemeProvider } from '@/contexts/TenantThemeProvider';
import { registerServiceWorker } from '@/lib/registerSW';
import '@/lib/sentry';

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => { registerServiceWorker(); }, []);

  return (
    <TenantProvider>
      <TenantThemeProvider>
        <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <LocationProvider>
              <CartProvider>{children}</CartProvider>
            </LocationProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
      </TenantThemeProvider>
    </TenantProvider>
  );
}
