'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';
import { useLocation } from '@/contexts/LocationContext';
import { formatPrice } from '@/utils/format';

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function ForecastPage() {
  const { t } = useLanguage();
  const { locationId } = useLocation();
  const locParam = locationId ? `?locationId=${locationId}` : '';
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => { api.get<any[]>(`/orders${locParam}`).then(setOrders).catch(() => {}); }, [locParam]);

  // Build daily patterns from order history
  const patterns = useMemo(() => {
    const dayStats: Record<number, { count: number; revenue: number; days: number }> = {};
    const hourStats: Record<number, { count: number }> = {};

    for (let d = 0; d < 7; d++) dayStats[d] = { count: 0, revenue: 0, days: 1 };
    for (let h = 10; h < 24; h++) hourStats[h] = { count: 0 };

    orders.forEach((o: any) => {
      const date = new Date(o.createdAt);
      const day = date.getDay();
      const hour = date.getHours();
      dayStats[day].count++;
      dayStats[day].revenue += o.total;
      if (hourStats[hour]) hourStats[hour].count++;
    });

    return { dayStats, hourStats };
  }, [orders]);

  // Simple forecast: tomorrow = average of same weekday
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDay = tomorrow.getDay();
  const forecast = patterns.dayStats[tomorrowDay];
  const avgOrder = forecast.count > 0 ? forecast.revenue / forecast.count : 0;

  // Top items prediction
  const topItems = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {};
    orders.forEach((o: any) => (o.items || []).forEach((item: any) => {
      if (!counts[item.menuItemId]) counts[item.menuItemId] = { name: item.name, count: 0 };
      counts[item.menuItemId].count += item.quantity;
    }));
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [orders]);

  const maxDayCount = Math.max(...Object.values(patterns.dayStats).map((s) => s.count), 1);
  const maxHourCount = Math.max(...Object.values(patterns.hourStats).map((s) => s.count), 1);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">{t.ui.fc_title}</h1>

      {/* Tomorrow forecast */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/20">
        <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">
          📊 {t.ui.fc_tomorrow} — {DAYS[tomorrowDay]} {tomorrow.toLocaleDateString('fr-BE')}
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-3xl font-extrabold text-white">{forecast.count}</p>
            <p className="text-xs text-zinc-500">{t.ui.fc_expectedOrders}</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-amber-400">{formatPrice(forecast.revenue)} €</p>
            <p className="text-xs text-zinc-500">{t.ui.fc_expectedRevenue}</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-emerald-400">{formatPrice(avgOrder)} €</p>
            <p className="text-xs text-zinc-500">{t.ui.fc_avgTicket}</p>
          </div>
        </div>
      </div>

      {/* Day of week patterns */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{t.ui.fc_weekPattern}</h2>
        <div className="flex items-end gap-2 h-20">
          {DAYS.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t bg-amber-500/80"
                style={{ height: `${Math.max((patterns.dayStats[i].count / maxDayCount) * 100, 4)}%` }} />
              <span className={`text-[10px] ${i === tomorrowDay ? 'text-amber-400 font-bold' : 'text-zinc-500'}`}>{day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Peak hours */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{t.ui.fc_peakHours}</h2>
        <div className="flex items-end gap-1 h-16">
          {Object.entries(patterns.hourStats).map(([hour, { count }]) => (
            <div key={hour} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t bg-emerald-500/80"
                style={{ height: `${Math.max((count / maxHourCount) * 100, 4)}%` }} />
              <span className="text-[9px] text-zinc-500">{hour}h</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top items to prepare */}
      <div>
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{t.ui.fc_topItems}</h2>
        <div className="space-y-2">
          {topItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <span className="text-sm text-white">{item.name}</span>
              </div>
              <span className="text-sm font-bold text-amber-400">{item.count}×</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
