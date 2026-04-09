'use client';

import { LanguageProvider } from '@/i18n/LanguageContext';
import { CartProvider } from '@/contexts/CartContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <CartProvider>{children}</CartProvider>
    </LanguageProvider>
  );
}
