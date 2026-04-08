'use client';

import { Category } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';
import Badge from './Badge';

interface SauceGridProps {
  category: Category;
}

function formatPrice(price: number): string {
  return price.toFixed(2).replace('.', ',');
}

export default function SauceGrid({ category }: SauceGridProps) {
  const { t } = useLanguage();

  return (
    <div className="animate-slide-up">
      {category.flatPrice && (
        <div className="flex items-center justify-between p-4 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <span className="text-sm font-semibold text-amber-400">
            {t.ui.allSaucesPrice}
          </span>
          <span className="text-lg font-bold text-amber-400">
            {formatPrice(category.flatPrice.price)}&nbsp;€
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {category.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800/50
              hover:border-zinc-700 transition-colors"
          >
            <span className="text-sm text-zinc-200 truncate pr-2">{item.name}</span>
            {item.tags && item.tags.length > 0 && (
              <div className="flex gap-0.5 shrink-0">
                {item.tags.map((tag) => (
                  <span key={tag} className="text-[10px]">
                    {tag === 'spicy' ? '🌶️' : tag === 'popular' ? '★' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
