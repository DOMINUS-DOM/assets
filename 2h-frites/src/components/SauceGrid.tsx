'use client';

import { Category } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';
import Badge from './Badge';

interface SauceGridProps {
  category: Category;
}

import { formatPrice } from '@/utils/format';

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
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-sm text-zinc-200 truncate">{item.name}</span>
                {item.tags && item.tags.map((tag) => (
                  <span key={tag} className="text-[10px] shrink-0">
                    {tag === 'spicy' ? '🌶️' : tag === 'popular' ? '★' : ''}
                  </span>
                ))}
              </div>
              {item.allergens && item.allergens.length > 0 && (
                <span className="text-[10px] text-orange-400/60 font-medium">
                  {item.allergens.join('·')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
