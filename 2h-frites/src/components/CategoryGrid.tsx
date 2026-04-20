'use client';

import { useState, useEffect } from 'react';
import { menuStore } from '@/stores/menuStore';
import { useLanguage } from '@/i18n/LanguageContext';

interface CategoryGridProps {
  onSelect: (slug: string) => void;
}

export default function CategoryGrid({ onSelect }: CategoryGridProps) {
  const { t, getCategory } = useLanguage();
  const [categories, setCategories] = useState(menuStore.getCategories());
  useEffect(() => menuStore.subscribe(() => setCategories(menuStore.getCategories())), []);

  return (
    <section className="px-4 pb-8">
      <h2 className="text-lg font-bold text-white mb-4">{t.ui.allCategories}</h2>
      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat, i) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.slug)}
            className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-zinc-900 border border-zinc-800/50
              hover:border-brand/30 hover:bg-zinc-800/80 transition-all active:scale-[0.97]
              animate-slide-up"
            style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'backwards' }}
          >
            <span className="text-3xl">{cat.icon}</span>
            <span className="text-sm font-semibold text-white text-center leading-tight">
              {getCategory(cat.nameKey)}
            </span>
            <span className="text-xs text-zinc-500">
              {cat.items.length} {t.ui.items}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
