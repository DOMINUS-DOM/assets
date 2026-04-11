'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { useLocation } from '@/contexts/LocationContext';
import { formatPrice } from '@/utils/format';

type Period = 'today' | 'week' | 'month' | 'custom';

function getDateRange(period: Period, customStart?: string, customEnd?: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  if (period === 'today') return { start: end, end };
  if (period === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); return { start: d.toISOString().slice(0, 10), end }; }
  if (period === 'month') { const d = new Date(now); d.setMonth(d.getMonth() - 1); return { start: d.toISOString().slice(0, 10), end }; }
  return { start: customStart || end, end: customEnd || end };
}

export default function ReportsPage() {
  const { locationId } = useLocation();
  const [period, setPeriod] = useState<Period>('week');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);

  const { start, end } = getDateRange(period, customStart, customEnd);

  useEffect(() => {
    const locParam = locationId ? `?locationId=${locationId}` : '';
    Promise.all([
      api.get<any[]>(`/orders${locParam}`).catch(() => []),
      api.get<{ payslips?: any[] }>('/payroll').catch(() => ({ payslips: [] })),
      api.get<{ ingredients?: any[] }>(`/inventory${locParam}`).catch(() => ({ ingredients: [] })),
    ]).then(([o, p, i]) => {
      setOrders(o);
      setPayslips(p.payslips || []);
      setIngredients(i.ingredients || []);
    });
  }, [locationId]);

  const report = useMemo(() => {
    const filtered = orders.filter((o: any) => {
      const d = o.createdAt?.slice(0, 10);
      return d >= start && d <= end;
    });

    const revenue = filtered.reduce((s: number, o: any) => s + (o.total || 0), 0);
    const orderCount = filtered.length;
    const avgTicket = orderCount > 0 ? revenue / orderCount : 0;

    // Revenue by channel
    const byChannel: Record<string, { count: number; revenue: number }> = {};
    filtered.forEach((o: any) => {
      const ch = o.channel || 'website';
      if (!byChannel[ch]) byChannel[ch] = { count: 0, revenue: 0 };
      byChannel[ch].count++;
      byChannel[ch].revenue += o.total || 0;
    });

    // Revenue by type
    const byType: Record<string, { count: number; revenue: number }> = {};
    filtered.forEach((o: any) => {
      const tp = o.type || 'pickup';
      if (!byType[tp]) byType[tp] = { count: 0, revenue: 0 };
      byType[tp].count++;
      byType[tp].revenue += o.total || 0;
    });

    // Revenue by payment method
    const byPayment: Record<string, { count: number; revenue: number }> = {};
    filtered.forEach((o: any) => {
      const pm = o.paymentMethod || 'unknown';
      if (!byPayment[pm]) byPayment[pm] = { count: 0, revenue: 0 };
      byPayment[pm].count++;
      byPayment[pm].revenue += o.total || 0;
    });

    // Revenue by day
    const byDay: Record<string, number> = {};
    filtered.forEach((o: any) => {
      const d = o.createdAt?.slice(0, 10) || '';
      byDay[d] = (byDay[d] || 0) + (o.total || 0);
    });

    // Top sellers
    const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    filtered.forEach((o: any) => {
      (o.items || []).forEach((item: any) => {
        if (!itemMap[item.name]) itemMap[item.name] = { name: item.name, qty: 0, revenue: 0 };
        itemMap[item.name].qty += item.quantity;
        itemMap[item.name].revenue += item.price * item.quantity;
      });
    });
    const topSellers = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // VAT estimate (6% food Belgium)
    const vatRate = 0.06;
    const vatAmount = revenue * vatRate / (1 + vatRate);
    const revenueHT = revenue - vatAmount;

    // Labor cost (from payslips in period)
    const laborCost = payslips
      .filter((p: any) => p.status !== 'draft')
      .reduce((s: number, p: any) => s + (p.grossTotal || 0), 0);

    // Inventory value
    const inventoryValue = ingredients.reduce((s: number, i: any) => s + (i.currentStock || 0) * (i.costPerUnit || 0), 0);

    // Estimated COGS (30% of revenue — industry standard for fast food)
    const estimatedCOGS = revenue * 0.30;

    const grossProfit = revenueHT - estimatedCOGS;
    const netProfit = grossProfit - laborCost;
    const marginPct = revenueHT > 0 ? (netProfit / revenueHT) * 100 : 0;

    return { revenue, orderCount, avgTicket, byChannel, byType, byPayment, byDay, topSellers, vatAmount, revenueHT, laborCost, inventoryValue, estimatedCOGS, grossProfit, netProfit, marginPct };
  }, [orders, payslips, ingredients, start, end]);

  const CHANNEL_LABELS: Record<string, string> = { website: 'Site web', kiosk: 'Borne', phone: 'T\u00e9l\u00e9phone', uber_eats: 'Uber Eats', deliveroo: 'Deliveroo' };
  const TYPE_LABELS: Record<string, string> = { pickup: '\u00c0 emporter', dine_in: 'Sur place', delivery: 'Livraison' };
  const PM_LABELS: Record<string, string> = { on_pickup: 'Esp\u00e8ces', card: 'Carte', online: 'En ligne' };

  const exportCSV = () => {
    const rows = [['Date', 'CA HT', 'TVA', 'CA TTC']];
    Object.entries(report.byDay).sort().forEach(([d, rev]) => {
      const vat = rev * 0.06 / 1.06;
      rows.push([d, (rev - vat).toFixed(2), vat.toFixed(2), rev.toFixed(2)]);
    });
    rows.push(['', '', '', '']);
    rows.push(['TOTAL', report.revenueHT.toFixed(2), report.vatAmount.toFixed(2), report.revenue.toFixed(2)]);
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `rapport-${start}-${end}.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Rapport P&amp;L</h1>
        <button onClick={exportCSV} className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700">
          Exporter CSV
        </button>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['today', 'week', 'month', 'custom'] as Period[]).map((p) => {
          const labels: Record<string, string> = { today: "Aujourd'hui", week: '7 jours', month: '30 jours', custom: 'Personnalis\u00e9' };
          return (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${period === p ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500'}`}>
              {labels[p]}
            </button>
          );
        })}
        {period === 'custom' && (
          <>
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
              className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white" />
            <span className="text-zinc-600">\u2192</span>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white" />
          </>
        )}
      </div>

      {/* P&L Summary */}
      <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-3">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Compte de r\u00e9sultat</h2>
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-white">Chiffre d&apos;affaires TTC</span>
            <span className="text-white font-bold">{formatPrice(report.revenue)} &euro;</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400 pl-4">- TVA (6%)</span>
            <span className="text-zinc-400">-{formatPrice(report.vatAmount)} &euro;</span>
          </div>
          <div className="flex justify-between text-sm border-t border-zinc-800 pt-1">
            <span className="text-white font-medium">CA Hors Taxes</span>
            <span className="text-white font-bold">{formatPrice(report.revenueHT)} &euro;</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400 pl-4">- Co\u00fbt mati\u00e8res (~30%)</span>
            <span className="text-red-400">-{formatPrice(report.estimatedCOGS)} &euro;</span>
          </div>
          <div className="flex justify-between text-sm border-t border-zinc-800 pt-1">
            <span className="text-white font-medium">Marge brute</span>
            <span className="text-emerald-400 font-bold">{formatPrice(report.grossProfit)} &euro;</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400 pl-4">- Masse salariale</span>
            <span className="text-red-400">-{formatPrice(report.laborCost)} &euro;</span>
          </div>
          <div className="flex justify-between text-sm border-t border-zinc-700 pt-2">
            <span className="text-white font-bold">R\u00e9sultat net estim\u00e9</span>
            <span className={`font-extrabold text-lg ${report.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatPrice(report.netProfit)} &euro;
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Marge nette</span>
            <span className={`font-bold ${report.marginPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {report.marginPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 text-center">
          <p className="text-2xl font-extrabold text-amber-400">{report.orderCount}</p>
          <p className="text-xs text-zinc-500">Commandes</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 text-center">
          <p className="text-2xl font-extrabold text-white">{formatPrice(report.avgTicket)} &euro;</p>
          <p className="text-xs text-zinc-500">Panier moyen</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 text-center">
          <p className="text-2xl font-extrabold text-emerald-400">{formatPrice(report.revenue)} &euro;</p>
          <p className="text-xs text-zinc-500">CA Total</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 text-center">
          <p className="text-2xl font-extrabold text-cyan-400">{formatPrice(report.inventoryValue)} &euro;</p>
          <p className="text-xs text-zinc-500">Valeur stock</p>
        </div>
      </div>

      {/* Revenue by channel / type / payment */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <h3 className="text-xs font-bold text-zinc-400 uppercase mb-3">Par canal</h3>
          {Object.entries(report.byChannel).map(([ch, data]) => (
            <div key={ch} className="flex justify-between text-sm py-1">
              <span className="text-zinc-300">{CHANNEL_LABELS[ch] || ch}</span>
              <span className="text-amber-400 font-bold">{formatPrice(data.revenue)} &euro; <span className="text-zinc-600 text-xs">({data.count})</span></span>
            </div>
          ))}
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <h3 className="text-xs font-bold text-zinc-400 uppercase mb-3">Par type</h3>
          {Object.entries(report.byType).map(([tp, data]) => (
            <div key={tp} className="flex justify-between text-sm py-1">
              <span className="text-zinc-300">{TYPE_LABELS[tp] || tp}</span>
              <span className="text-amber-400 font-bold">{formatPrice(data.revenue)} &euro; <span className="text-zinc-600 text-xs">({data.count})</span></span>
            </div>
          ))}
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <h3 className="text-xs font-bold text-zinc-400 uppercase mb-3">Par paiement</h3>
          {Object.entries(report.byPayment).map(([pm, data]) => (
            <div key={pm} className="flex justify-between text-sm py-1">
              <span className="text-zinc-300">{PM_LABELS[pm] || pm}</span>
              <span className="text-amber-400 font-bold">{formatPrice(data.revenue)} &euro; <span className="text-zinc-600 text-xs">({data.count})</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Top sellers */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
        <h3 className="text-xs font-bold text-zinc-400 uppercase mb-3">Top 10 produits</h3>
        {report.topSellers.map((item, i) => (
          <div key={item.name} className="flex items-center justify-between py-1.5 border-b border-zinc-800/30 last:border-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-600 w-5">{i + 1}.</span>
              <span className="text-sm text-white">{item.name}</span>
              <span className="text-xs text-zinc-500">&times;{item.qty}</span>
            </div>
            <span className="text-sm text-amber-400 font-bold">{formatPrice(item.revenue)} &euro;</span>
          </div>
        ))}
      </div>

      {/* Daily revenue */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
        <h3 className="text-xs font-bold text-zinc-400 uppercase mb-3">CA par jour</h3>
        {Object.entries(report.byDay).sort().map(([day, rev]) => {
          const maxRev = Math.max(...Object.values(report.byDay));
          const pct = maxRev > 0 ? (rev / maxRev) * 100 : 0;
          return (
            <div key={day} className="flex items-center gap-3 py-1">
              <span className="text-xs text-zinc-500 w-20 shrink-0">{day}</span>
              <div className="flex-1 h-4 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500/50 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-amber-400 font-bold w-20 text-right">{formatPrice(rev)} &euro;</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
