'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
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

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('2h-locale') as Locale | null;
      if (stored && ['fr', 'en', 'es', 'nl'].includes(stored)) return stored;
    }
    return 'fr';
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('2h-locale', newLocale);
    }
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
