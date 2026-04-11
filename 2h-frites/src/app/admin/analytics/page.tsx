'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { menuStore } from '@/stores/menuStore';
import { Order } from '@/types/order';
import { useLanguage } from '@/i18n/LanguageContext';
import { useLocation } from '@/contexts/LocationContext';
import { formatPrice } from '@/utils/format';

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const { locationId } = useLocation();
  const locParam = locationId ? `?locationId=${locationId}` : '';
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => { api.get<any[]>(`/orders${locParam}`).then(setOrders).catch(() => {}); }, [locParam]);

  const completed = orders.filter((o) => ['delivered', 'picked_up'].includes(o.status));
  const totalRevenue = completed.reduce((sum, o) => sum + o.total, 0);
  const avgOrder = completed.length > 0 ? totalRevenue / completed.length : 0;
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
    orders.forEach((o) => {
      const h = new Date(o.createdAt).getHours();
      hours[h]++;
    });
    const max = Math.max(...hours, 1);
    return hours.map((count, hour) => ({ hour, count, pct: Math.round((count / max) * 100) }));
  }, [orders]);

  // Payment method split
  const paymentSplit = useMemo(() => {
    const cash = completed.filter((o) => ['on_delivery', 'on_pickup'].includes(o.paymentMethod)).reduce((s, o) => s + o.total, 0);
    const online = completed.filter((o) => o.paymentMethod === 'online').reduce((s, o) => s + o.total, 0);
    return { cash, online };
  }, [completed]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">{t.ui.ana_title}</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <p className="text-2xl font-extrabold text-amber-400">{formatPrice(totalRevenue)} €</p>
          <p className="text-xs text-zinc-500">{t.ui.ana_totalRevenue}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <p className="text-2xl font-extrabold text-white">{completed.length}</p>
          <p className="text-xs text-zinc-500">{t.ui.ana_completedOrders}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <p className="text-2xl font-extrabold text-emerald-400">{formatPrice(avgOrder)} €</p>
          <p className="text-xs text-zinc-500">{t.ui.ana_avgOrder}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <p className="text-lg font-extrabold text-white">{pickupCount} / {deliveryCount}</p>
          <p className="text-xs text-zinc-500">{t.ui.ana_pickupDelivery}</p>
        </div>
      </div>

      {/* Payment split */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{t.ui.ana_paymentSplit}</h2>
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-400">💶 {t.ui.pmt_cash}</span>
              <span className="text-sm font-bold text-white">{formatPrice(paymentSplit.cash)} €</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800">
              <div className="h-2 rounded-full bg-amber-500" style={{ width: `${totalRevenue > 0 ? (paymentSplit.cash / totalRevenue * 100) : 0}%` }} />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-400">💳 {t.ui.pmt_online}</span>
              <span className="text-sm font-bold text-white">{formatPrice(paymentSplit.online)} €</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800">
              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${totalRevenue > 0 ? (paymentSplit.online / totalRevenue * 100) : 0}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Peak hours */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{t.ui.ana_peakHours}</h2>
        <div className="flex items-end gap-1 h-24">
          {peakHours.filter((h) => h.hour >= 10 && h.hour <= 23).map((h) => (
            <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t bg-amber-500/80 transition-all"
                style={{ height: `${Math.max(h.pct, 4)}%` }} />
              <span className="text-[9px] text-zinc-500">{h.hour}h</span>
            </div>
          ))}
        </div>
      </div>

      {/* Best sellers */}
      <div>
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{t.ui.ana_bestSellers}</h2>
        <div className="space-y-2">
          {bestSellers.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-sm text-white font-medium">{item.name}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-amber-400">{item.count}×</p>
                <p className="text-[10px] text-zinc-500">{formatPrice(item.revenue)} €</p>
              </div>
            </div>
          ))}
          {bestSellers.length === 0 && <p className="text-zinc-500 text-sm text-center py-4">{t.ui.ana_noData}</p>}
        </div>
      </div>

      {/* Best categories */}
      <div>
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{t.ui.ana_bestCategories}</h2>
        <div className="space-y-2">
          {bestCategories.map((cat, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <span className="text-sm text-white">{cat.name}</span>
              <div className="text-right">
                <p className="text-sm font-bold text-amber-400">{formatPrice(cat.revenue)} €</p>
                <p className="text-[10px] text-zinc-500">{cat.count} {t.ui.checkout_items}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
