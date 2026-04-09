'use client';

import { useMemo } from 'react';
import { menuStore } from '@/stores/menuStore';
import { translations } from '@/i18n/translations';
import { Locale, SearchResult } from '@/types';

export function useSearch(query: string, locale: Locale): SearchResult[] {
  return useMemo(() => {
    const q = query.toLowerCase().trim();
    if (q.length < 2) return [];

    const t = translations[locale];
    const results: SearchResult[] = [];
    const categories = menuStore.getCategories();

    for (const category of categories) {
      for (const item of category.items) {
        if (item.unavailable) continue;
        const itemName = (t.items[item.id] || item.name).toLowerCase();
        const desc = item.descriptionKey
          ? (t.descriptions[item.descriptionKey] || '').toLowerCase()
          : '';
        const catName = (t.categories[category.nameKey] || '').toLowerCase();

        if (itemName.includes(q) || desc.includes(q) || catName.includes(q)) {
          results.push({ item, category });
        }
      }
    }

    return results;
  }, [query, locale]);
}
