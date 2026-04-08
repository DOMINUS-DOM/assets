'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Locale } from '@/types';
import { translations, Translations } from './translations';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
  getItemName: (itemId: string, fallback: string) => string;
  getDescription: (key: string) => string;
  getSize: (key: string) => string;
  getCategory: (key: string) => string;
  getSubcategory: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const VALID_LOCALES: Locale[] = ['fr', 'en', 'es', 'nl'];

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr');

  // Read stored locale after mount (avoids SSR/hydration mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('2h-locale') as Locale | null;
      if (stored && VALID_LOCALES.includes(stored)) {
        setLocaleState(stored);
      }
    } catch {}
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem('2h-locale', newLocale);
    } catch {}
  }, []);

  const t = translations[locale];

  const getItemName = useCallback(
    (itemId: string, fallback: string) => t.items[itemId] || fallback,
    [t]
  );

  const getDescription = useCallback(
    (key: string) => t.descriptions[key] || '',
    [t]
  );

  const getSize = useCallback(
    (key: string) => t.sizes[key] || key,
    [t]
  );

  const getCategory = useCallback(
    (key: string) => t.categories[key] || key,
    [t]
  );

  const getSubcategory = useCallback(
    (key: string) => t.subcategories[key] || key,
    [t]
  );

  return (
    <LanguageContext.Provider
      value={{ locale, setLocale, t, getItemName, getDescription, getSize, getCategory, getSubcategory }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
