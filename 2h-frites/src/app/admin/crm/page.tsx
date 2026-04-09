'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { CustomerProfile, LoyaltyReward } from '@/types/crm';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatPrice } from '@/utils/format';

const SEG_COLORS: Record<string, string> = { new: 'bg-blue-500/15 text-blue-400', regular: 'bg-amber-500/15 text-amber-400', vip: 'bg-purple-500/15 text-purple-400', inactive: 'bg-zinc-700/50 text-zinc-400' };

type Tab = 'customers' | 'loyalty' | 'segments';

export default function CRMPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>('customers');
  const [customers, setCustomers] = useState<any[]>([]);
  const [rewards] = useState([
    { id: 'rw-1', name: 'Frites gratuites', pointsCost: 50, description: 'Un cornet de frites moyen offert', active: true },
    { id: 'rw-2', name: 'Sauce offerte', pointsCost: 20, description: 'Une sauce au choix', active: true },
    { id: 'rw-3', name: '-5€ sur la commande', pointsCost: 100, description: 'Réduction de 5€', active: true },
  ]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const fetchCRM = async () => { try { const d = await api.get<{ customers: any[] }>('/crm'); setCustomers(d.customers); } catch {} };
    fetchCRM();
  }, []);

  const segments = { total: customers.length, new: customers.filter((c: any) => c.segment === 'new').length, regular: customers.filter((c: any) => c.segment === 'regular').length, vip: customers.filter((c: any) => c.segment === 'vip').length };
  const filtered = filter === 'all' ? customers : customers.filter((c) => c.segment === filter);
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'customers', label: t.ui.crm_customers },
    { key: 'segments', label: t.ui.crm_segments },
    { key: 'loyalty', label: t.ui.crm_loyalty },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">{t.ui.crm_title}</h1>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === tb.key ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500'}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* ─── CUSTOMERS ─── */}
      {tab === 'customers' && (
        <div className="space-y-3">
          <div className="flex gap-1.5 overflow-x-auto">
            {['all', 'vip', 'regular', 'new'].map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${filter === s ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500'}`}>
                {s === 'all' ? t.ui.admin_all : t.ui[`crm_seg_${s}`]} ({s === 'all' ? customers.length : customers.filter((c) => c.segment === s).length})
              </button>
            ))}
          </div>
          {filtered.map((c) => (
            <div key={c.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white">{c.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${SEG_COLORS[c.segment]}`}>{t.ui[`crm_seg_${c.segment}`]}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{c.phone}{c.email ? ` — ${c.email}` : ''}</p>
                  {c.address && <p className="text-xs text-zinc-500">📍 {c.address}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-amber-400">{formatPrice(c.totalSpent)} €</p>
                  <p className="text-[10px] text-zinc-500">{c.totalOrders} {t.ui.crm_orders} — {c.loyaltyPoints} pts</p>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">{t.ui.crm_noCustomers}</p>}
        </div>
      )}

      {/* ─── SEGMENTS ─── */}
      {tab === 'segments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 text-center">
              <p className="text-2xl font-extrabold text-white">{segments.total}</p>
              <p className="text-xs text-zinc-500">{t.ui.crm_totalClients}</p>
            </div>
            <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 text-center">
              <p className="text-2xl font-extrabold text-purple-400">{segments.vip}</p>
              <p className="text-xs text-zinc-500">VIP (5+ {t.ui.crm_orders})</p>
            </div>
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center">
              <p className="text-2xl font-extrabold text-amber-400">{segments.regular}</p>
              <p className="text-xs text-zinc-500">{t.ui.crm_seg_regular}</p>
            </div>
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center">
              <p className="text-2xl font-extrabold text-blue-400">{segments.new}</p>
              <p className="text-xs text-zinc-500">{t.ui.crm_seg_new}</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
            <p className="text-xs text-zinc-400 mb-1">{t.ui.crm_totalRevenue}</p>
            <p className="text-2xl font-extrabold text-amber-400">{formatPrice(totalRevenue)} €</p>
          </div>
        </div>
      )}

      {/* ─── LOYALTY ─── */}
      {tab === 'loyalty' && (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">{t.ui.crm_loyaltyHint}</p>
          {rewards.map((rw) => (
            <div key={rw.id} className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <div>
                <p className="text-sm font-bold text-white">{rw.name}</p>
                <p className="text-xs text-zinc-400">{rw.description}</p>
              </div>
              <span className="text-sm font-bold text-amber-400">{rw.pointsCost} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
