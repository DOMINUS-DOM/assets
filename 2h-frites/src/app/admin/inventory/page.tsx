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
  const [showAddIng, setShowAddIng] = useState(false);
  const [showAddSup, setShowAddSup] = useState(false);
  const [ingForm, setIngForm] = useState({ name: '', unit: 'kg', currentStock: '', minStock: '', costPerUnit: '', category: 'autre', supplierId: '', expiryDate: '' });
  const [supForm, setSupForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [editIngId, setEditIngId] = useState<string | null>(null);
  const [editSupId, setEditSupId] = useState<string | null>(null);
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
        <div className="space-y-3">
          <button onClick={() => { setShowAddIng(!showAddIng); if (showAddIng) { setEditIngId(null); setIngForm({ name: '', unit: 'kg', currentStock: '', minStock: '', costPerUnit: '', category: 'autre', supplierId: '', expiryDate: '' }); } }}
            className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 font-bold text-sm">
            {showAddIng ? 'Fermer' : '+ Ingr\u00e9dient'}
          </button>

          {showAddIng && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              const data = { name: ingForm.name, unit: ingForm.unit, currentStock: +ingForm.currentStock || 0, minStock: +ingForm.minStock || 0, costPerUnit: +ingForm.costPerUnit || 0, category: ingForm.category, supplierId: ingForm.supplierId || null, expiryDate: ingForm.expiryDate || null, locationId: locationId || null };
              if (editIngId) {
                await api.post('/inventory', { action: 'updateIngredient', data: { id: editIngId, ...data } });
              } else {
                await api.post('/inventory', { action: 'addIngredient', data });
              }
              setIngForm({ name: '', unit: 'kg', currentStock: '', minStock: '', costPerUnit: '', category: 'autre', supplierId: '', expiryDate: '' });
              setShowAddIng(false); setEditIngId(null); refresh();
            }} className="p-4 rounded-xl bg-zinc-900 border border-amber-500/30 space-y-2">
              <h3 className="text-sm font-bold text-white">{editIngId ? 'Modifier' : 'Ajouter'} un ingr\u00e9dient</h3>
              <div className="grid grid-cols-2 gap-2">
                <input className={ic} placeholder="Nom" value={ingForm.name} onChange={(e) => setIngForm({ ...ingForm, name: e.target.value })} required />
                <select className={ic} value={ingForm.category} onChange={(e) => setIngForm({ ...ingForm, category: e.target.value })}>
                  {Object.entries(CAT_EMOJI).map(([k, v]) => <option key={k} value={k}>{v} {k}</option>)}
                </select>
                <input className={ic} placeholder="Unit\u00e9 (kg, L, pcs)" value={ingForm.unit} onChange={(e) => setIngForm({ ...ingForm, unit: e.target.value })} />
                <input className={ic} type="number" step="0.01" placeholder="Stock actuel" value={ingForm.currentStock} onChange={(e) => setIngForm({ ...ingForm, currentStock: e.target.value })} />
                <input className={ic} type="number" step="0.01" placeholder="Stock min" value={ingForm.minStock} onChange={(e) => setIngForm({ ...ingForm, minStock: e.target.value })} />
                <input className={ic} type="number" step="0.01" placeholder="Co\u00fbt/unit\u00e9 (\u20ac)" value={ingForm.costPerUnit} onChange={(e) => setIngForm({ ...ingForm, costPerUnit: e.target.value })} />
                <select className={ic} value={ingForm.supplierId} onChange={(e) => setIngForm({ ...ingForm, supplierId: e.target.value })}>
                  <option value="">Fournisseur (optionnel)</option>
                  {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input className={ic} type="date" placeholder="Expiration" value={ingForm.expiryDate} onChange={(e) => setIngForm({ ...ingForm, expiryDate: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowAddIng(false); setEditIngId(null); }} className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm">Annuler</button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-amber-500 text-zinc-950 font-bold text-sm">{editIngId ? 'Enregistrer' : 'Ajouter'}</button>
              </div>
            </form>
          )}

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
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${isLow ? 'text-red-400' : 'text-white'}`}>
                      {ing.currentStock} {ing.unit}
                    </span>
                    <button onClick={() => { setEditIngId(ing.id); setIngForm({ name: ing.name, unit: ing.unit, currentStock: String(ing.currentStock), minStock: String(ing.minStock), costPerUnit: String(ing.costPerUnit), category: ing.category, supplierId: ing.supplierId || '', expiryDate: ing.expiryDate || '' }); setShowAddIng(true); }}
                      className="text-zinc-600 hover:text-amber-400 text-xs p-1">&#9998;</button>
                    <button onClick={() => { if (confirm('Supprimer ?')) api.post('/inventory', { action: 'deleteIngredient', id: ing.id }).then(refresh); }}
                      className="text-zinc-600 hover:text-red-400 text-xs p-1">&#10005;</button>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800">
                  <div className={`h-1.5 rounded-full transition-all ${isLow ? 'bg-red-500' : pct > 60 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-zinc-500">
                  <span>min: {ing.minStock}</span>
                  <span>{formatPrice(ing.costPerUnit)} \u20ac/{ing.unit}</span>
                </div>
              </div>
            );
          })}
          {ingredients.length === 0 && <p className="text-zinc-500 text-sm text-center py-6">Aucun ingr\u00e9dient</p>}
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
          <button onClick={() => { setShowAddSup(!showAddSup); if (showAddSup) { setEditSupId(null); setSupForm({ name: '', phone: '', email: '', notes: '' }); } }}
            className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 font-bold text-sm">
            {showAddSup ? 'Fermer' : '+ Fournisseur'}
          </button>

          {showAddSup && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (editSupId) {
                await api.post('/inventory', { action: 'updateSupplier', data: { id: editSupId, ...supForm } });
              } else {
                await api.post('/inventory', { action: 'addSupplier', data: supForm });
              }
              setSupForm({ name: '', phone: '', email: '', notes: '' });
              setShowAddSup(false); setEditSupId(null); refresh();
            }} className="p-4 rounded-xl bg-zinc-900 border border-amber-500/30 space-y-2">
              <h3 className="text-sm font-bold text-white">{editSupId ? 'Modifier' : 'Ajouter'} un fournisseur</h3>
              <div className="grid grid-cols-2 gap-2">
                <input className={ic} placeholder="Nom" value={supForm.name} onChange={(e) => setSupForm({ ...supForm, name: e.target.value })} required />
                <input className={ic} placeholder="T\u00e9l\u00e9phone" value={supForm.phone} onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })} />
                <input className={ic} placeholder="Email" value={supForm.email} onChange={(e) => setSupForm({ ...supForm, email: e.target.value })} />
                <input className={ic} placeholder="Notes" value={supForm.notes} onChange={(e) => setSupForm({ ...supForm, notes: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowAddSup(false); setEditSupId(null); }} className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm">Annuler</button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-amber-500 text-zinc-950 font-bold text-sm">{editSupId ? 'Enregistrer' : 'Ajouter'}</button>
              </div>
            </form>
          )}

          {suppliers.map((sup) => (
            <div key={sup.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{sup.name}</p>
                  <p className="text-xs text-zinc-400">{sup.phone} &mdash; {sup.email}</p>
                  {sup.notes && <p className="text-xs text-zinc-500 mt-1 italic">{sup.notes}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditSupId(sup.id); setSupForm({ name: sup.name, phone: sup.phone, email: sup.email, notes: sup.notes }); setShowAddSup(true); }}
                    className="text-zinc-600 hover:text-amber-400 text-xs p-1">&#9998;</button>
                  <button onClick={() => { if (confirm('Supprimer ?')) api.post('/inventory', { action: 'deleteSupplier', id: sup.id }).then(refresh); }}
                    className="text-zinc-600 hover:text-red-400 text-xs p-1">&#10005;</button>
                </div>
              </div>
            </div>
          ))}
          {suppliers.length === 0 && <p className="text-zinc-500 text-sm text-center py-6">Aucun fournisseur</p>}
        </div>
      )}
    </div>
  );
}
