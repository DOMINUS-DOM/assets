'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';
import { useLocation } from '@/contexts/LocationContext';
import { formatPrice } from '@/utils/format';

const CAT_EMOJI: Record<string, string> = { frites: '🍟', viandes: '🥩', sauces: '🫙', pains: '🥖', boissons: '🥤', legumes: '🥬', autre: '📦' };

type Tab = 'stock' | 'alerts' | 'suppliers' | 'movements';

export default function InventoryPage() {
  const { t } = useLanguage();
  const { locationId } = useLocation();
  const [tab, setTab] = useState<Tab>('stock');
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [mvForm, setMvForm] = useState({ ingredientId: '', type: 'in' as const, quantity: '', note: '' });
  const [movements, setMovements] = useState<any[]>([]);

  const refresh = async () => {
    try {
      const locParam = locationId ? `?locationId=${locationId}` : '';
      const data = await api.get<{ ingredients: any[]; suppliers: any[]; movements: any[] }>(`/inventory${locParam}`);
      setIngredients(data.ingredients); setSuppliers(data.suppliers); setMovements(data.movements);
    } catch {}
  };

  useEffect(() => {
    refresh();
    return;
  }, []);

  const lowStock = ingredients.filter((i: any) => i.currentStock <= i.minStock);
  const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const expiring = ingredients.filter((i: any) => i.expiryDate && i.expiryDate <= in3Days);
  const totalValue = ingredients.reduce((sum, i) => sum + i.currentStock * i.costPerUnit, 0);
  const getName = (id: string) => ingredients.find((i) => i.id === id)?.name || '?';

  const ic = 'w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-amber-500/50';

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: 'stock', label: t.ui.inv_stock },
    { key: 'alerts', label: t.ui.inv_alerts, badge: lowStock.length + expiring.length },
    { key: 'movements', label: t.ui.inv_movements },
    { key: 'suppliers', label: t.ui.inv_suppliers },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">{t.ui.inv_title}</h1>
        <span className="text-sm text-zinc-500">{t.ui.inv_totalValue}: <span className="text-amber-400 font-bold">{formatPrice(totalValue)} €</span></span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors relative ${tab === tb.key ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500'}`}>
            {tb.label}
            {tb.badge != null && tb.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{tb.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── STOCK ─── */}
      {tab === 'stock' && (
        <div className="space-y-2">
          {ingredients.map((ing) => {
            const pct = ing.minStock > 0 ? Math.min(100, (ing.currentStock / (ing.minStock * 2)) * 100) : 100;
            const isLow = ing.currentStock <= ing.minStock;
            return (
              <div key={ing.id} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/50">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{CAT_EMOJI[ing.category]}</span>
                    <span className="text-sm font-medium text-white">{ing.name}</span>
                  </div>
                  <span className={`text-sm font-bold ${isLow ? 'text-red-400' : 'text-white'}`}>
                    {ing.currentStock} {ing.unit}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800">
                  <div className={`h-1.5 rounded-full transition-all ${isLow ? 'bg-red-500' : pct > 60 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-zinc-500">
                  <span>min: {ing.minStock}</span>
                  <span>{formatPrice(ing.costPerUnit)} €/{ing.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── ALERTS ─── */}
      {tab === 'alerts' && (
        <div className="space-y-4">
          {lowStock.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">⚠️ {t.ui.inv_lowStock}</h2>
              {lowStock.map((ing) => (
                <div key={ing.id} className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/20 mb-2">
                  <span className="text-sm text-white">{CAT_EMOJI[ing.category]} {ing.name}</span>
                  <span className="text-sm font-bold text-red-400">{ing.currentStock} / {ing.minStock} {ing.unit}</span>
                </div>
              ))}
            </div>
          )}
          {expiring.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">📅 {t.ui.inv_expiring}</h2>
              {expiring.map((ing) => (
                <div key={ing.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 mb-2">
                  <span className="text-sm text-white">{ing.name}</span>
                  <span className="text-sm font-bold text-amber-400">{ing.expiryDate}</span>
                </div>
              ))}
            </div>
          )}
          {lowStock.length === 0 && expiring.length === 0 && (
            <p className="text-center text-emerald-400 py-8">✅ {t.ui.inv_allGood}</p>
          )}
        </div>
      )}

      {/* ─── MOVEMENTS ─── */}
      {tab === 'movements' && (
        <div className="space-y-3">
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!mvForm.ingredientId || !mvForm.quantity) return;
            api.post('/inventory', { action: 'addMovement', ingredientId: mvForm.ingredientId, type: mvForm.type, quantity: +mvForm.quantity, note: mvForm.note, date: new Date().toISOString().slice(0, 10) }).then(refresh);
            setMvForm({ ingredientId: '', type: 'in', quantity: '', note: '' });
          }} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <select className={ic} value={mvForm.ingredientId} onChange={(e) => setMvForm({ ...mvForm, ingredientId: e.target.value })} required>
                <option value="">{t.ui.inv_selectIngredient}</option>
                {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
              <select className={ic} value={mvForm.type} onChange={(e) => setMvForm({ ...mvForm, type: e.target.value as any })}>
                <option value="in">📥 {t.ui.inv_in}</option>
                <option value="out">📤 {t.ui.inv_out}</option>
                <option value="waste">🗑 {t.ui.inv_waste}</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className={ic} type="number" placeholder={t.ui.inv_qty} value={mvForm.quantity} onChange={(e) => setMvForm({ ...mvForm, quantity: e.target.value })} required />
              <input className={ic} placeholder="Note" value={mvForm.note} onChange={(e) => setMvForm({ ...mvForm, note: e.target.value })} />
            </div>
            <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm">{t.ui.admin_add}</button>
          </form>
          <div className="space-y-2">
            {movements.slice(0, 20).map((mv) => {
              const emoji = mv.type === 'in' ? '📥' : mv.type === 'waste' ? '🗑' : '📤';
              const color = mv.type === 'in' ? 'text-emerald-400' : 'text-red-400';
              return (
                <div key={mv.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50 text-sm">
                  <div>
                    <span className="text-white">{emoji} {getName(mv.ingredientId)}</span>
                    {mv.note && <p className="text-xs text-zinc-500">{mv.note}</p>}
                  </div>
                  <span className={`font-bold ${color}`}>{mv.type === 'in' ? '+' : '-'}{mv.quantity}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── SUPPLIERS ─── */}
      {tab === 'suppliers' && (
        <div className="space-y-3">
          {suppliers.map((sup) => (
            <div key={sup.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <p className="text-sm font-bold text-white">{sup.name}</p>
              <p className="text-xs text-zinc-400">{sup.phone} — {sup.email}</p>
              {sup.notes && <p className="text-xs text-zinc-500 mt-1 italic">{sup.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
