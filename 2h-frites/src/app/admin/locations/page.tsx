'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatPrice } from '@/utils/format';

export default function LocationsPage() {
  const { t } = useLanguage();
  const [locations, setLocations] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', address: '', city: '', postalCode: '', phone: '', email: '' });

  const refresh = async () => {
    try { const data = await api.post<any[]>('/locations', { action: 'getStats' }); setLocations(data); } catch {}
  };

  useEffect(() => { refresh(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/locations', { action: 'create', data: { ...form, settingsJson: '{}' } });
    setForm({ name: '', slug: '', address: '', city: '', postalCode: '', phone: '', email: '' });
    setShowAdd(false);
    refresh();
  };

  const ic = 'w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-amber-500/50';
  const totalRevenue = locations.reduce((s, l) => s + (l.revenue || 0), 0);
  const totalOrders = locations.reduce((s, l) => s + (l.orderCount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">{t.ui.loc_title}</h1>
        <button onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm active:scale-95">
          {showAdd ? t.ui.admin_cancel : t.ui.loc_add}
        </button>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 text-center">
          <p className="text-2xl font-extrabold text-amber-400">{locations.length}</p>
          <p className="text-xs text-zinc-500">{t.ui.loc_sites}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 text-center">
          <p className="text-2xl font-extrabold text-emerald-400">{formatPrice(totalRevenue)} €</p>
          <p className="text-xs text-zinc-500">{t.ui.loc_totalRevenue}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 text-center">
          <p className="text-2xl font-extrabold text-white">{totalOrders}</p>
          <p className="text-xs text-zinc-500">{t.ui.loc_totalOrders}</p>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-3 animate-slide-up">
          <div className="grid grid-cols-2 gap-3">
            <input className={ic} placeholder={t.ui.loc_name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className={ic} placeholder="Slug (url)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
            <input className={ic} placeholder={t.ui.set_address} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
            <input className={ic} placeholder={t.ui.checkout_city} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
            <input className={ic} placeholder={t.ui.checkout_postal} value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
            <input className={ic} placeholder={t.ui.set_phone} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <input className={ic} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm">{t.ui.loc_add}</button>
        </form>
      )}

      {/* Location cards */}
      <div className="space-y-3">
        {locations.map((loc) => (
          <div key={loc.id} className={`p-4 rounded-xl border ${loc.active ? 'bg-zinc-900 border-zinc-800/50' : 'bg-zinc-900/50 border-zinc-800/30 opacity-60'}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${loc.active ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                  <h3 className="text-sm font-bold text-white">{loc.name}</h3>
                </div>
                <p className="text-xs text-zinc-400">📍 {loc.address}, {loc.city} {loc.postalCode}</p>
                <p className="text-xs text-zinc-500">{loc.phone} — {loc.email}</p>
              </div>
              <button onClick={() => api.post('/locations', { action: 'toggleActive', id: loc.id }).then(refresh)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${loc.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                {loc.active ? t.ui.admin_active : t.ui.admin_inactive}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-zinc-800">
              <div className="text-center">
                <p className="text-lg font-bold text-amber-400">{formatPrice(loc.revenue || 0)} €</p>
                <p className="text-[10px] text-zinc-500">CA</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">{loc.orderCount || 0}</p>
                <p className="text-[10px] text-zinc-500">{t.ui.pmt_orderCount}</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">{loc.staffCount || 0}</p>
                <p className="text-[10px] text-zinc-500">{t.ui.staff_employees}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
