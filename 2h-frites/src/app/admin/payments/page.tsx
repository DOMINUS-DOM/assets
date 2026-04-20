'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Order } from '@/types/order';
import { useLanguage } from '@/i18n/LanguageContext';
import { useLocation } from '@/contexts/LocationContext';
import { formatPrice } from '@/utils/format';

const METHOD_LABEL: Record<string, string> = { cash: '💶', card: '💳', online: '💳', bancontact: '🏦' };
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-400', completed: 'bg-emerald-500/15 text-emerald-400',
  failed: 'bg-red-500/15 text-red-400', refunded: 'bg-zinc-700/50 text-zinc-400',
};

type Tab = 'transactions' | 'report' | 'invoices';

type Period = 'today' | 'week' | 'month' | 'all';

function getStartDate(period: Period): string | null {
  const now = new Date();
  if (period === 'today') return now.toISOString().slice(0, 10);
  if (period === 'week') { now.setDate(now.getDate() - 7); return now.toISOString().slice(0, 10); }
  if (period === 'month') { now.setMonth(now.getMonth() - 1); return now.toISOString().slice(0, 10); }
  return null;
}

export default function PaymentsPage() {
  const { t } = useLanguage();
  const { locationId } = useLocation();
  const locParam = locationId ? `?locationId=${locationId}` : '';
  const [tab, setTab] = useState<Tab>('report');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const [reportDate, setReportDate] = useState(today);
  const [report, setReport] = useState<any>(null);
  const [period, setPeriod] = useState<Period>('today');

  const startDate = getStartDate(period);
  const filteredTransactions = startDate
    ? transactions.filter((txn: any) => txn.createdAt?.slice(0, 10) >= startDate)
    : transactions;
  const filteredOrders = startDate
    ? orders.filter((o: any) => o.createdAt?.slice(0, 10) >= startDate)
    : orders;

  const refresh = async () => {
    try { const o = await api.get<any[]>(`/orders${locParam}`); setOrders(o); } catch {}
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    // Compute basic report from orders
    const paid = filteredOrders.filter((o: any) => o.paymentStatus === 'paid');
    const total = paid.reduce((s: number, o: any) => s + o.total, 0);
    setReport({ totalRevenue: total, orderCount: paid.length, totalVat: Math.round(total * 0.06 * 100) / 100, cashTotal: 0, onlineTotal: total, refundTotal: 0, avgOrderValue: paid.length > 0 ? Math.round(total / paid.length * 100) / 100 : 0 });
  }, [reportDate, filteredOrders]);

  const ic = 'px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-amber-500/50';

  // The invoices tab is hidden until PDF generation + storage are implemented.
  // Current code exposed a "Générez..." placeholder + two `alert('TODO')` buttons.
  const TABS: { key: Tab; label: string }[] = [
    { key: 'report', label: t.ui.pmt_report },
    { key: 'transactions', label: t.ui.pmt_transactions },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">{t.ui.pmt_title}</h1>
        <div className="flex gap-1">
          {([['today', "Aujourd'hui"], ['week', '7 jours'], ['month', '30 jours'], ['all', 'Tout']] as [Period, string][]).map(([p, label]) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === p ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}>
              {label}
            </button>
          ))}
          <button onClick={() => {
            const rows = filteredTransactions.map((txn: any) => {
              const order = orders.find((o: any) => o.id === txn.orderId);
              return `${txn.orderId},${txn.createdAt?.slice(0, 10) || ''},${order?.customerName || ''},${txn.method},${txn.amount},${txn.status},${txn.reference || ''}`;
            });
            const csv = ['Commande,Date,Client,Methode,Montant,Statut,Reference', ...rows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `payments-${period}.csv`; a.click();
          }}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-medium hover:text-white transition-colors">
            ↓ CSV
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === tb.key ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500'}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* ─── REPORT TAB ─── */}
      {tab === 'report' && (
        <div className="space-y-4">
          <input className={ic} type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />

          {report && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
                  <p className="text-2xl font-extrabold text-amber-400">{formatPrice(report.totalRevenue)} €</p>
                  <p className="text-xs text-zinc-500">{t.ui.pmt_revenue}</p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
                  <p className="text-2xl font-extrabold text-white">{report.orderCount}</p>
                  <p className="text-xs text-zinc-500">{t.ui.pmt_orderCount}</p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
                  <p className="text-2xl font-extrabold text-orange-400">{formatPrice(report.totalVat)} €</p>
                  <p className="text-xs text-zinc-500">{t.ui.pmt_vatCollected}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">💶 {t.ui.pmt_cash}</span>
                  <span className="text-white font-medium">{formatPrice(report.cashTotal)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">💳 {t.ui.pmt_online}</span>
                  <span className="text-white font-medium">{formatPrice(report.onlineTotal)} €</span>
                </div>
                {report.refundTotal > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>↩️ {t.ui.pmt_refunds}</span>
                    <span>- {formatPrice(report.refundTotal)} €</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-zinc-800">
                  <span className="text-zinc-400">{t.ui.pmt_avgOrder}</span>
                  <span className="text-amber-400 font-bold">{formatPrice(report.avgOrderValue)} €</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── TRANSACTIONS TAB ─── */}
      {tab === 'transactions' && (
        <div className="space-y-2">
          {filteredTransactions.length === 0 && <p className="text-center text-zinc-500 py-8 text-sm">{t.ui.pmt_noTransactions}</p>}
          {filteredTransactions.map((txn) => {
            const order = orders.find((o) => o.id === txn.orderId);
            return (
              <div key={txn.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span>{METHOD_LABEL[txn.method] || '💰'}</span>
                    <span className="text-sm font-medium text-white">{txn.orderId}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[txn.status]}`}>
                      {t.ui[`pmt_status_${txn.status}`]}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{order?.customerName || '—'} — {new Date(txn.createdAt).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}</p>
                  {txn.reference && <p className="text-[10px] text-zinc-600">ref: {txn.reference}</p>}
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${txn.status === 'refunded' ? 'text-red-400 line-through' : 'text-amber-400'}`}>
                    {formatPrice(txn.amount)} €
                  </p>
                  {/* Refund button hidden until Stripe refund API is wired. A visible button that
                      fires alert('TODO') destroys trust — better to expose nothing. */}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── INVOICES TAB ─── */}
      {tab === 'invoices' && (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">{t.ui.pmt_invoicesHint}</p>
          {filteredOrders.filter((o) => o.paymentStatus === 'paid').map((order) => {
            const invoice: any = null; // TODO: fetch from API
            return (
              <div key={order.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-white">{order.orderNumber || order.id}</p>
                    <p className="text-xs text-zinc-500">{order.customerName || '—'} — {formatPrice(order.total)} €</p>
                  </div>
                  {invoice ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400">
                      {invoice.id}
                    </span>
                  ) : (
                    <button onClick={() => alert('Invoice generation — TODO: integrate with API')}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-medium active:scale-95">
                      {t.ui.pmt_generateInvoice}
                    </button>
                  )}
                </div>
                {invoice && (
                  <div className="text-xs space-y-1 pt-2 border-t border-zinc-800 text-zinc-400">
                    {(invoice.lines || []).map((l: any, i: number) => (
                      <div key={i} className="flex justify-between">
                        <span>{l.description} ×{l.quantity}</span>
                        <span>{formatPrice(l.total)} € <span className="text-zinc-600">(TVA {Math.round(l.vatRate * 100)}%: {formatPrice(l.vatAmount)} €)</span></span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-1 border-t border-zinc-800 text-white font-medium">
                      <span>{t.ui.cart_total}</span>
                      <span>{formatPrice(invoice.grandTotal)} € <span className="text-zinc-500 font-normal">(TVA: {formatPrice(invoice.totalVat)} €)</span></span>
                    </div>
                    <p className="text-zinc-600 pt-1">{invoice.businessName} — {invoice.vatNumber}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
