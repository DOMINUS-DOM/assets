'use client';

import { useState, useEffect } from 'react';
import { menuStore } from '@/stores/menuStore';
import { Category, MenuItem, Tag } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice } from '@/utils/format';

const TAG_OPTIONS: Tag[] = ['popular', 'vegetarian', 'spicy', 'new'];

export default function MenuCMSPage() {
  const { t, getCategory, getItemName } = useLanguage();
  const { hasRole } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemForm, setItemForm] = useState({ name: '', price: '', tags: [] as Tag[], allergens: '' });

  useEffect(() => {
    setCategories(menuStore.getCategories());
    return menuStore.subscribe(() => setCategories(menuStore.getCategories()));
  }, []);

  const activeCat = activeCatId ? categories.find((c) => c.id === activeCatId) : null;
  const canEdit = hasRole('patron', 'manager');

  const ic = 'w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500/50';

  const resetForm = () => {
    setItemForm({ name: '', price: '', tags: [], allergens: '' });
    setEditingItem(null);
    setShowAddItem(false);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCatId || !itemForm.name) return;
    const allergenIds = itemForm.allergens ? itemForm.allergens.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n)) : undefined;
    const data = {
      name: itemForm.name,
      price: itemForm.price ? parseFloat(itemForm.price) : undefined,
      currency: '€',
      tags: itemForm.tags.length > 0 ? itemForm.tags : undefined,
      allergens: allergenIds && allergenIds.length > 0 ? allergenIds : undefined,
    };

    if (editingItem) {
      menuStore.updateItem(activeCatId, editingItem.id, data);
    } else {
      menuStore.addItem(activeCatId, { ...data, currency: '€' } as any);
    }
    resetForm();
  };

  const startEdit = (item: MenuItem) => {
    setEditingItem(item);
    setShowAddItem(true);
    setItemForm({
      name: item.name,
      price: item.price != null ? String(item.price) : '',
      tags: item.tags || [],
      allergens: item.allergens ? item.allergens.join(', ') : '',
    });
  };

  // ─── Category list view ───
  if (!activeCat) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">{t.ui.cms_title}</h1>
        </div>
        <p className="text-xs text-zinc-500">{t.ui.cms_hint}</p>
        <div className="space-y-2">
          {categories.map((cat) => {
            const available = cat.items.filter((i) => !i.unavailable).length;
            const total = cat.items.length;
            return (
              <button key={cat.id} onClick={() => setActiveCatId(cat.id)}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800/50
                  hover:border-zinc-700 transition-colors text-left active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{getCategory(cat.nameKey)}</p>
                    <p className="text-xs text-zinc-500">{available}/{total} {t.ui.cms_available}</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Items view for selected category ───
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => { setActiveCatId(null); resetForm(); }} className="text-amber-400 text-sm font-medium">← {t.ui.back}</button>
          <h1 className="text-lg font-bold text-white">{activeCat.icon} {getCategory(activeCat.nameKey)}</h1>
        </div>
        {canEdit && (
          <button onClick={() => { resetForm(); setShowAddItem(true); }}
            className="px-3 py-1.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs active:scale-95">
            {t.ui.cms_addItem}
          </button>
        )}
      </div>

      {/* Add/Edit form */}
      {showAddItem && canEdit && (
        <form onSubmit={handleSaveItem} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-3 animate-slide-up">
          <input className={ic} placeholder={t.ui.cms_itemName} value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <input className={ic} placeholder={t.ui.cms_price} type="number" step="0.01" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} />
            <input className={ic} placeholder={t.ui.cms_allergens} value={itemForm.allergens} onChange={(e) => setItemForm({ ...itemForm, allergens: e.target.value })} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {TAG_OPTIONS.map((tag) => (
              <button key={tag} type="button"
                onClick={() => setItemForm({ ...itemForm, tags: itemForm.tags.includes(tag) ? itemForm.tags.filter((t) => t !== tag) : [...itemForm.tags, tag] })}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${itemForm.tags.includes(tag) ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-500'}`}>
                {t.ui[tag]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm">
              {editingItem ? t.ui.cms_save : t.ui.cms_addItem}
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-400 text-sm">
              {t.ui.admin_cancel}
            </button>
          </div>
        </form>
      )}

      {/* Items list */}
      <div className="space-y-2">
        {activeCat.items.map((item) => (
          <div key={item.id}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
              item.unavailable ? 'bg-zinc-900/50 border-zinc-800/30 opacity-50' : 'bg-zinc-900 border-zinc-800/50'
            }`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-medium ${item.unavailable ? 'text-zinc-500 line-through' : 'text-white'}`}>
                  {getItemName(item.id, item.name)}
                </p>
                {item.tags?.map((tag) => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{t.ui[tag]}</span>
                ))}
              </div>
              {item.allergens && item.allergens.length > 0 && (
                <p className="text-[10px] text-orange-400/60">{item.allergens.join('·')}</p>
              )}
            </div>
            <span className="text-sm font-bold text-amber-400 shrink-0">
              {item.price != null ? `${formatPrice(item.price)} €` : '—'}
            </span>
            {canEdit && (
              <div className="flex gap-1 shrink-0">
                <button onClick={() => menuStore.toggleItemAvailability(activeCatId!, item.id)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-colors ${
                    item.unavailable ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'
                  }`}>
                  {item.unavailable ? '✗' : '✓'}
                </button>
                <button onClick={() => startEdit(item)}
                  className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs hover:text-white">
                  ✎
                </button>
                <button onClick={() => menuStore.deleteItem(activeCatId!, item.id)}
                  className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs hover:text-red-400">
                  🗑
                </button>
              </div>
            )}
          </div>
        ))}
        {activeCat.items.length === 0 && (
          <p className="text-center text-zinc-500 py-8 text-sm">{t.ui.cms_noItems}</p>
        )}
      </div>
    </div>
  );
}
