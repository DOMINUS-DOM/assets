'use client';

import { memo, useState } from 'react';
import { MenuItem } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/utils/format';
import FavoriteButton from './FavoriteButton';
import AddToCartButton from './cart/AddToCartButton';

interface FritesDisplayProps {
  items: MenuItem[];
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
}

export default memo(function FritesDisplay({ items, isFavorite, onToggleFavorite }: FritesDisplayProps) {
  const { getItemName, getSize } = useLanguage();
  const { addItem } = useCart();
  const [addedSize, setAddedSize] = useState<string | null>(null);

  const fritesItem = items.find((i) => i.sizes);
  const otherItems = items.filter((i) => !i.sizes);

  const handleAddSize = (sizeKey: string, price: number) => {
    addItem({ menuItemId: 'frites', name: `Frites (${getSize(sizeKey)})`, price, categoryId: 'frites', sizeKey });
    setAddedSize(sizeKey);
    setTimeout(() => setAddedSize(null), 800);
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {fritesItem && (
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">🍟 Frites</h3>
            <FavoriteButton isFavorite={isFavorite(fritesItem.id)} onToggle={() => onToggleFavorite(fritesItem.id)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {fritesItem.sizes!.map((size, i) => {
              const barHeights = ['h-10', 'h-14', 'h-20'];
              const isAdded = addedSize === size.sizeKey;
              return (
                <button
                  key={size.sizeKey}
                  onClick={() => handleAddSize(size.sizeKey, size.price)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all active:scale-95
                    ${isAdded ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-800/50 border-zinc-700/30 hover:border-amber-500/30'}`}
                >
                  <div className={`w-8 ${barHeights[i]} rounded-lg bg-gradient-to-t from-amber-600 to-amber-400`} />
                  <span className="text-xs font-medium text-zinc-300">{getSize(size.sizeKey)}</span>
                  <span className="text-lg font-bold text-amber-400">{formatPrice(size.price)} €</span>
                  <span className={`text-xs font-bold ${isAdded ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isAdded ? '✓ Ajouté' : '+ Ajouter'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {otherItems.map((item) => (
        <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <h3 className="text-sm font-semibold text-white">{getItemName(item.id, item.name)}</h3>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-amber-400">{formatPrice(item.price!)} {item.currency}</span>
            {item.price != null && (
              <AddToCartButton menuItemId={item.id} name={getItemName(item.id, item.name)} price={item.price} categoryId="frites" />
            )}
            <FavoriteButton isFavorite={isFavorite(item.id)} onToggle={() => onToggleFavorite(item.id)} />
          </div>
        </div>
      ))}
    </div>
  );
});
