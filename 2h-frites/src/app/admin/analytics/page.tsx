'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { menuStore } from '@/stores/menuStore';
import { useLanguage } from '@/i18n/LanguageContext';
import { useLocation } from '@/contexts/LocationContext';
import { formatPrice } from '@/utils/format';

type Period = 'today' | 'week' | 'month' | 'all';

function getStartDate(period: Period): string | null {
  const now = new Date();
  if (period === 'today') return now.toISOString().slice(0, 10);
  if (period === 'week') { now.setDate(now.getDate() - 7); return now.toISOString().slice(0, 10); }
  if (period === 'month') { now.setMonth(now.getMonth() - 1); return now.toISOString().slice(0, 10); }
  return null;
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('fr-BE', { weekday: 'short', day: 'numeric' });
}

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const { locationId } = useLocation();
  const locParam = locationId ? `?locationId=${locationId}` : '';
  const [orders, setOrders] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>('today');

  useEffect(() => { api.get<any[]>(`/orders${locParam}`).then(setOrders).catch(() => {}); }, [locParam]);

  const startDate = getStartDate(period);
  const filteredOrders = startDate
    ? orders.filter((o) => o.createdAt?.slice(0, 10) >= startDate)
    : orders;

  // FIX: count all non-cancelled orders (POS orders stay in 'received' status)
  const completed = filteredOrders.filter((o) => o.status !== 'cancelled');
  const totalRevenue = completed.reduce((sum, o) => sum + o.total, 0);
  const avgOrder = completed.length > 0 ? totalRevenue / completed.length : 0;

  // FIX: add dine_in count
  const dineInCount = completed.filter((o) => o.type === 'dine_in').length;
  const pickupCount = completed.filter((o) => o.type === 'pickup').length;
  const deliveryCount = completed.filter((o) => o.type === 'delivery').length;

  // Best sellers
  const bestSellers = useMemo(() => {
    const counts: Record<string, { name: string; count: number; revenue: number }> = {};
    completed.forEach((o: any) => (o.items || []).forEach((item: any) => {
      const key = item.menuItemId;
      if (!counts[key]) counts[key] = { name: item.name, count: 0, revenue: 0 };
      counts[key].count += item.quantity;
      counts[key].revenue += item.price * item.quantity;
    }));
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [completed]);

  // Best categories
  const bestCategories = useMemo(() => {
    const counts: Record<string, { name: string; count: number; revenue: number }> = {};
    const cats = menuStore.getCategories();
    completed.forEach((o: any) => (o.items || []).forEach((item: any) => {
      const cat = cats.find((c) => c.id === item.categoryId);
      const key = item.categoryId;
      if (!counts[key]) counts[key] = { name: cat?.icon + ' ' + (cat?.nameKey || key), count: 0, revenue: 0 };
      counts[key].count += item.quantity;
      counts[key].revenue += item.price * item.quantity;
    }));
    return Object.values(counts).sort((a, b) => b.revenue - a.revenue);
  }, [completed]);

  // Peak hours
  const peakHours = useMemo(() => {
    const hours = new Array(24).fill(0);
    completed.forEach((o) => {
      const h = new Date(o.createdAt).getHours();
      hours[h]++;
    });
    const max = Math.max(...hours, 1);
    return hours.map((count, hour) => ({ hour, count, pct: Math.round((count / max) * 100) }));
  }, [completed]);

  // FIX: Payment split — cash vs card (not on_pickup vs online)
  const paymentSplit = useMemo(() => {
    const cash = completed.filter((o) => ['on_delivery', 'on_pickup', 'cash'].includes(o.paymentMethod)).reduce((s, o) => s + o.total, 0);
    const card = completed.filter((o) => ['card', 'online', 'bancontact'].includes(o.paymentMethod)).reduce((s, o) => s + o.total, 0);
    return { cash, card };
  }, [completed]);

  // NEW: 7-day revenue chart
  const last7Days = useMemo(() => {
    const days: { date: string; label: string; revenue: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayOrders = orders.filter((o) => o.createdAt?.slice(0, 10) === dateStr && o.status !== 'cancelled');
      days.push({
        date: dateStr,
        label: getDayLabel(dateStr),
        revenue: dayOrders.reduce((s, o) => s + o.total, 0),
        count: dayOrders.length,
      });
    }
    return days;
  }, [orders]);

  const maxDayRevenue = Math.max(...last7Days.map((d) => d.revenue), 1);

  // Empty state — brand new tenant with no orders at all. Period filtering is useless here.
  if (orders.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-white">{t.ui.ana_title}</h1>
        <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl bg-zinc-900 border border-zinc-800/50 space-y-4">
          <p className="text-5xl">📊</p>
          <h2 className="text-lg font-bold text-white">Aucune commande pour l&apos;instant</h2>
          <p className="text-sm text-zinc-400 max-w-sm leading-relaxed">
            Vos ventes, paniers moyens et heures de pointe apparaîtront ici dès que vos premières commandes seront passées.
          </p>
          <a
            href="/pos"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm hover:bg-amber-400 transition-colors active:scale-[0.98]"
          >
            Ouvrir la caisse et faire une première commande
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">{t.ui.ana_title}</h1>
        <div className="flex gap-1">
          {([['today', "Aujourd'hui"], ['week', '7 jours'], ['month', '30 jours'], ['all', 'Tout']] as [Period, string][]).map(([p, label]) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === p ? 'bg-brand/15 text-brand-light' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}>
              {label}
            </button>
          ))}
          <button onClick={() => {
            const csv = ['N°,Date,Heure,Client,Type,Total,Statut,Paiement,Articles',
              ...completed.map((o) => {
                const time = o.createdAt ? new Date(o.createdAt).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' }) : '';
                const items = (o.items || []).map((item: any) => {
                  let detail = `${item.quantity}x ${item.name}`;
                  try {
                    const extras = typeof item.extras === 'string' ? JSON.parse(item.extras) : item.extras;
                    if (Array.isArray(extras) && extras.length > 0) {
                      detail += ' (' + extras.map((e: any) => e.name || e).join('+') + ')';
                    }
                  } catch {}
                  return detail;
                }).join(' | ');
                return `${o.orderNumber || o.id},${o.createdAt?.slice(0, 10) || ''},${time},${(o.customerName || '').replace(/,/g, '')},${o.type},${o.total},${o.status},${o.paymentMethod},"${items}"`;
              })
            ].join('\n');
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `ventes-${period}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
          }}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-medium hover:text-white transition-colors">
            ↓ CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <p className="text-2xl font-extrabold text-brand-light">{formatPrice(totalRevenue)} €</p>
          <p className="text-xs text-zinc-500">{t.ui.ana_totalRevenue || 'Chiffre d\'affaires'}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <p className="text-2xl font-extrabold text-white">{completed.length}</p>
          <p className="text-xs text-zinc-500">{t.ui.ana_completedOrders || 'Commandes'}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <p className="text-2xl font-extrabold text-emerald-400">{formatPrice(avgOrder)} €</p>
          <p className="text-xs text-zinc-500">{t.ui.ana_avgOrder || 'Panier moyen'}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <div className="flex items-center gap-2 text-sm">
            {dineInCount > 0 && <span className="text-white font-bold">{dineInCount} <span className="text-xs text-zinc-500 font-normal">SP</span></span>}
            <span className="text-white font-bold">{pickupCount} <span className="text-xs text-zinc-500 font-normal">EMP</span></span>
            {deliveryCount > 0 && <span className="text-white font-bold">{deliveryCount} <span className="text-xs text-zinc-500 font-normal">LIV</span></span>}
          </div>
          <p className="text-xs text-zinc-500 mt-1">{t.ui.ana_pickupDelivery || 'Répartition'}</p>
        </div>
      </div>

      {/* 7-day chart */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">7 derniers jours</h2>
        <div className="flex items-end gap-2 h-28">
          {last7Days.map((day) => {
            const isToday = day.date === new Date().toISOString().slice(0, 10);
            const pct = maxDayRevenue > 0 ? (day.revenue / maxDayRevenue) * 100 : 0;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-zinc-500 font-medium">{day.revenue > 0 ? formatPrice(day.revenue) : ''}</span>
                <div className={`w-full rounded-t transition-all ${isToday ? 'bg-brand' : 'bg-brand/50'}`}
                  style={{ height: `${Math.max(pct, 3)}%` }} />
                <span className={`text-[10px] ${isToday ? 'text-brand-light font-bold' : 'text-zinc-500'}`}>{day.label}</span>
                <span className="text-[9px] text-zinc-600">{day.count > 0 ? `${day.count} cmd` : ''}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment split */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{t.ui.ana_paymentSplit || 'Répartition paiements'}</h2>
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-400">💶 Espèces</span>
              <span className="text-sm font-bold text-white">{formatPrice(paymentSplit.cash)} €</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800">
              <div className="h-2 rounded-full bg-brand" style={{ width: `${totalRevenue > 0 ? (paymentSplit.cash / totalRevenue * 100) : 0}%` }} />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-400">💳 Carte</span>
              <span className="text-sm font-bold text-white">{formatPrice(paymentSplit.card)} €</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800">
              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${totalRevenue > 0 ? (paymentSplit.card / totalRevenue * 100) : 0}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Peak hours */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{t.ui.ana_peakHours || 'Heures de pointe'}</h2>
        <div className="flex items-end gap-1 h-24">
          {peakHours.filter((h) => h.hour >= 10 && h.hour <= 23).map((h) => (
            <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t bg-brand/80 transition-all"
                style={{ height: `${Math.max(h.pct, 4)}%` }} />
              <span className="text-[9px] text-zinc-500">{h.hour}h</span>
            </div>
          ))}
        </div>
      </div>

      {/* Best sellers */}
      <div>
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{t.ui.ana_bestSellers || 'Meilleures ventes'}</h2>
        <div className="space-y-2">
          {bestSellers.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-brand/20 text-brand-light text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-sm text-white font-medium">{item.name}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-brand-light">{item.count}×</p>
                <p className="text-[10px] text-zinc-500">{formatPrice(item.revenue)} €</p>
              </div>
            </div>
          ))}
          {bestSellers.length === 0 && <p className="text-zinc-500 text-sm text-center py-4">{t.ui.ana_noData || 'Aucune donnée'}</p>}
        </div>
      </div>

      {/* Best categories */}
      <div>
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{t.ui.ana_bestCategories || 'Catégories'}</h2>
        <div className="space-y-2">
          {bestCategories.map((cat, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <span className="text-sm text-white">{cat.name}</span>
              <div className="text-right">
                <p className="text-sm font-bold text-brand-light">{formatPrice(cat.revenue)} €</p>
                <p className="text-[10px] text-zinc-500">{cat.count} {t.ui.checkout_items || 'articles'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
