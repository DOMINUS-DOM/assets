'use client';

import { useState, useEffect } from 'react';
import { paymentStore } from '@/stores/paymentStore';
import { store as orderStore } from '@/stores/store';
import { Transaction, DailyReport } from '@/types/payment';
import { Order } from '@/types/order';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatPrice } from '@/utils/format';

const METHOD_LABEL: Record<string, string> = { cash: '💶', card: '💳', online: '💳', bancontact: '🏦' };
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-400', completed: 'bg-emerald-500/15 text-emerald-400',
  failed: 'bg-red-500/15 text-red-400', refunded: 'bg-zinc-700/50 text-zinc-400',
};

type Tab = 'transactions' | 'report' | 'invoices';

export default function PaymentsPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>('report');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const [reportDate, setReportDate] = useState(today);
  const [report, setReport] = useState<DailyReport | null>(null);

  useEffect(() => {
    const refresh = () => {
      setTransactions(paymentStore.getTransactions());
      setOrders(orderStore.getOrders());
    };
    refresh();
    const u1 = paymentStore.subscribe(refresh);
    const u2 = orderStore.subscribe(refresh);
    return () => { u1(); u2(); };
  }, []);

  useEffect(() => {
    setReport(paymentStore.getDailyReport(reportDate));
  }, [reportDate, transactions]);

  const ic = 'px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-amber-500/50';

  const TABS: { key: Tab; label: string }[] = [
    { key: 'report', label: t.ui.pmt_report },
    { key: 'transactions', label: t.ui.pmt_transactions },
    { key: 'invoices', label: t.ui.pmt_invoices },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">{t.ui.pmt_title}</h1>

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
          {transactions.length === 0 && <p className="text-center text-zinc-500 py-8 text-sm">{t.ui.pmt_noTransactions}</p>}
          {transactions.map((txn) => {
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
                  <p className="text-xs text-zinc-500 mt-0.5">{order?.customer.name || '—'} — {new Date(txn.createdAt).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}</p>
                  {txn.reference && <p className="text-[10px] text-zinc-600">ref: {txn.reference}</p>}
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${txn.status === 'refunded' ? 'text-red-400 line-through' : 'text-amber-400'}`}>
                    {formatPrice(txn.amount)} €
                  </p>
                  {txn.status === 'completed' && (
                    <button onClick={() => paymentStore.refundTransaction(txn.id)}
                      className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors mt-1">
                      {t.ui.pmt_refund}
                    </button>
                  )}
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
          {orders.filter((o) => o.payment.status === 'paid').map((order) => {
            const invoice = paymentStore.getInvoiceByOrder(order.id);
            return (
              <div key={order.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-white">{order.id}</p>
                    <p className="text-xs text-zinc-500">{order.customer.name} — {formatPrice(order.total)} €</p>
                  </div>
                  {invoice ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400">
                      {invoice.id}
                    </span>
                  ) : (
                    <button onClick={() => paymentStore.generateInvoice(order.id)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-medium active:scale-95">
                      {t.ui.pmt_generateInvoice}
                    </button>
                  )}
                </div>
                {invoice && (
                  <div className="text-xs space-y-1 pt-2 border-t border-zinc-800 text-zinc-400">
                    {invoice.lines.map((l, i) => (
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
