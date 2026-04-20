'use client';

import { memo, useState, useCallback } from 'react';
import { MenuItem, SizeVariant } from '@/types';
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

// ─── Extracted SizeRow component (stable identity, preserves local state) ───
function FritesSizeRow({ size, barHeight, onAdd, isAdded }: {
  size: SizeVariant;
  barHeight: string;
  onAdd: (sizeKey: string, price: number, opts: { sel: boolean; epice: boolean }) => void;
  isAdded: boolean;
}) {
  const { t, getSize } = useLanguage();
  const [sel, setSel] = useState(true);
  const [epice, setEpice] = useState(false);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/30">
      <div className="flex flex-col items-center w-16 shrink-0">
        <div className={`w-5 ${barHeight} rounded-lg bg-gradient-to-t from-brand-dark to-brand-light mb-1`} />
        <span className="text-xs font-medium text-zinc-300">{getSize(size.sizeKey)}</span>
      </div>
      <div className="flex-1 flex gap-2">
        <button onClick={() => setSel(!sel)}
          className={`flex-1 py-2.5 rounded-lg border text-center text-xs font-bold active:scale-95 transition-colors ${
            sel ? 'bg-brand/15 text-brand-light border-brand/30' : 'bg-zinc-800 text-zinc-500 border-zinc-700'
          }`}>
          🧂 {sel ? (t.ui.bld_withSalt || 'Avec sel') : (t.ui.bld_noSalt || 'Sans sel')}
        </button>
        <button onClick={() => setEpice(!epice)}
          className={`flex-1 py-2.5 rounded-lg border text-center text-xs font-bold active:scale-95 transition-colors ${
            epice ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-zinc-800 text-zinc-500 border-zinc-700'
          }`}>
          🌶️ {epice ? (t.ui.bld_spicy || 'Épicées') : (t.ui.bld_notSpicy || 'Non épicées')}
        </button>
      </div>
      <button
        onClick={() => onAdd(size.sizeKey, size.price, { sel, epice })}
        className={`px-4 py-2.5 rounded-lg font-bold text-sm shrink-0 active:scale-95 transition-colors ${
          isAdded ? 'bg-emerald-500/15 text-emerald-400' : 'bg-brand text-zinc-950'
        }`}>
        {isAdded ? '✓' : `${formatPrice(size.price)} €`}
      </button>
    </div>
  );
}

export default memo(function FritesDisplay({ items, isFavorite, onToggleFavorite }: FritesDisplayProps) {
  const { t, getItemName, getSize } = useLanguage();
  const { addItem } = useCart();
  const [addedKey, setAddedKey] = useState<string | null>(null);

  const fritesItem = items.find((i) => i.sizes);
  const otherItems = items.filter((i) => !i.sizes);

  const handleAddFrites = useCallback((sizeKey: string, price: number, opts: { sel: boolean; epice: boolean }) => {
    const labels: string[] = [];
    const extras: { name: string; price: number }[] = [];
    if (opts.sel) { labels.push(t.ui.bld_withSalt || 'Avec sel'); extras.push({ name: t.ui.bld_withSalt || 'Avec sel', price: 0 }); }
    if (opts.epice) { labels.push(t.ui.bld_spicy || 'Épicées'); extras.push({ name: t.ui.bld_spicy || 'Épicées', price: 0 }); }
    const labelStr = labels.length > 0 ? labels.join(' + ') : 'Nature';
    addItem({
      menuItemId: 'frites',
      name: `Frites (${getSize(sizeKey)}) ${labelStr}`,
      price,
      categoryId: 'frites',
      sizeKey,
      extras,
    });
    const key = `frites__${sizeKey}__${labelStr}`;
    setAddedKey(key);
    setTimeout(() => setAddedKey(null), 800);
  }, [t, getSize, addItem]);

  const barHeights = ['h-8', 'h-12', 'h-16'];

  return (
    <div className="space-y-4 animate-slide-up">
      {fritesItem && (
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">🍟 Frites</h3>
            <FavoriteButton isFavorite={isFavorite(fritesItem.id)} onToggle={() => onToggleFavorite(fritesItem.id)} />
          </div>

          {fritesItem.sizes!.map((size, i) => (
            <FritesSizeRow
              key={size.sizeKey}
              size={size}
              barHeight={barHeights[i]}
              onAdd={handleAddFrites}
              isAdded={addedKey?.startsWith(`frites__${size.sizeKey}`) ?? false}
            />
          ))}
        </div>
      )}

      {otherItems.map((item) => (
        <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <h3 className="text-sm font-semibold text-white">{getItemName(item.id, item.name)}</h3>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-brand-light">{formatPrice(item.price!)} {item.currency}</span>
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
