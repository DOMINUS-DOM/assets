'use client';

import { Category } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/utils/format';
import { useState } from 'react';

export default function SauceGrid({ category }: { category: Category }) {
  const { t } = useLanguage();
  const { addItem } = useCart();
  const [addedId, setAddedId] = useState<string | null>(null);

  const handleAdd = (item: typeof category.items[0]) => {
    if (item.price == null) return;
    addItem({ menuItemId: item.id, name: item.name, price: item.price, categoryId: category.id });
    setAddedId(item.id);
    setTimeout(() => setAddedId(null), 600);
  };

  return (
    <div className="animate-slide-up">
      {category.flatPrice && (
        <div className="flex items-center justify-between p-4 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <span className="text-sm font-semibold text-amber-400">{t.ui.allSaucesPrice}</span>
          <span className="text-lg font-bold text-amber-400">{formatPrice(category.flatPrice.price)} €</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {category.items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleAdd(item)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all active:scale-[0.97]
              ${addedId === item.id
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-zinc-900 border-zinc-800/50 hover:border-zinc-700'}`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-sm text-zinc-200 truncate">{item.name}</span>
                {item.tags?.map((tag) => (
                  <span key={tag} className="text-[10px] shrink-0">
                    {tag === 'spicy' ? '🌶️' : tag === 'popular' ? '★' : ''}
                  </span>
                ))}
              </div>
              {item.allergens && item.allergens.length > 0 && (
                <span className="text-[10px] text-orange-400/60 font-medium">{item.allergens.join('·')}</span>
              )}
            </div>
            <span className={`text-xs font-bold shrink-0 transition-colors ${addedId === item.id ? 'text-emerald-400' : 'text-amber-400'}`}>
              {addedId === item.id ? '✓' : '+'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
