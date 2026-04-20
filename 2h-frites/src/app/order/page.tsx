'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { OrderStatus } from '@/types/order';
import { useLanguage } from '@/i18n/LanguageContext';
import { useIsDemo } from '@/contexts/TenantContext';
import { api } from '@/lib/api';
import { formatPrice } from '@/utils/format';
import Link from 'next/link';

function statusKey(s: OrderStatus) { return `status_${s}` as const; }
const STATUS_EMOJI: Record<OrderStatus, string> = {
  received: '📋', preparing: '👨‍🍳', ready: '✅', delivering: '🛵', delivered: '📦', picked_up: '🤝', cancelled: '❌',
};
const STATUS_COLOR: Record<OrderStatus, string> = {
  received: 'text-blue-600', preparing: 'text-amber-700', ready: 'text-emerald-600', delivering: 'text-orange-600',
  delivered: 'text-emerald-600', picked_up: 'text-emerald-600', cancelled: 'text-red-600',
};

function OrderContent() {
  const isDemo = useIsDemo();
  const params = useSearchParams();
  const orderId = params.get('id');
  const { t } = useLanguage();
  const [order, setOrder] = useState<any>(undefined);

  useEffect(() => {
    if (!orderId) return;
    const fetchOrder = async () => {
      try {
        // Use single-order lookup (public endpoint, no auth required)
        const order = await api.get<any>(`/orders?orderNumber=${encodeURIComponent(orderId)}`);
        if (order && !order.error) setOrder(order);
      } catch {}
    };
    fetchOrder();
    const interval = setInterval(fetchOrder, 10000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (!orderId || !order) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] text-[#1A1A1A] flex items-center justify-center px-4">
        <div className="text-center">
          <span className="text-5xl block mb-4">🔍</span>
          <p className="text-[#6B6B6B] mb-4">{t.ui.order_notFound}</p>
          <Link href="/" className="text-[#1A1A1A] font-medium text-sm underline underline-offset-4 decoration-[#D4D0C8]">← Menu</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto pb-20 bg-[#FAFAF8] text-[#1A1A1A]">
      <header className="sticky top-0 z-40 bg-[#FAFAF8]/95 backdrop-blur-md border-b border-[#EDEBE7]">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/" className="text-[#1A1A1A] font-medium text-sm">← Menu</Link>
          <h1 className="text-sm font-bold text-[#1A1A1A]">{order.id}</h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="px-4 pt-6 space-y-6">
        <div className="text-center py-6">
          <span className="text-6xl block mb-3">{(STATUS_EMOJI as any)[order.status]}</span>
          <p className={`text-xl font-bold ${(STATUS_COLOR as any)[order.status] || ''}`}>{t.ui[statusKey(order.status)]}</p>
          <p className="text-xs text-[#8A8A8A] mt-1">
            {order.type === 'pickup' ? t.ui.order_pickupLabel : t.ui.order_deliveryLabel}
          </p>
        </div>

        {isDemo && (
          <div className="rounded-2xl border border-[#EDEBE7] bg-white px-4 py-4">
            <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#F59E0B] mb-1.5">Démo Brizo</p>
            <p className="text-[14px] text-[#1A1A1A] leading-snug mb-3">
              Vos clients pourraient déjà commander chez vous — comme vous venez de le faire ici.
            </p>
            <a
              href="https://brizoapp.com/signup"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1A1A1A] underline underline-offset-4 decoration-[#D4D0C8] hover:decoration-[#1A1A1A]"
            >
              Créer mon restaurant <span>→</span>
            </a>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-[11px] font-bold text-[#8A8A8A] uppercase tracking-[0.12em]">{t.ui.order_tracking}</h2>
          {(order.statusHistory || []).map((entry: any, i: number) => {
            const time = new Date(entry.at).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${i === order.statusHistory.length - 1 ? 'bg-[#F59E0B]/15' : 'bg-[#F5F3EF]'}`}>
                  {(STATUS_EMOJI as any)[entry.status]}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#1A1A1A] font-medium">{t.ui[statusKey(entry.status)]}</p>
                  <p className="text-xs text-[#8A8A8A]">{time}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <h2 className="text-[11px] font-bold text-[#8A8A8A] uppercase tracking-[0.12em]">{t.ui.order_articles}</h2>
          {(order.items || []).map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#EDEBE7]">
              <div>
                <p className="text-sm text-[#1A1A1A] font-medium">{item.name}</p>
                <p className="text-xs text-[#8A8A8A]">× {item.quantity}</p>
              </div>
              <span className="text-sm font-bold text-[#1A1A1A] tabular-nums">{formatPrice(item.price * item.quantity)} €</span>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#EDEBE7]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[#1A1A1A]">{t.ui.cart_total}</span>
            <span className="text-xl font-extrabold text-[#1A1A1A] tabular-nums">{formatPrice(order.total)} €</span>
          </div>
          <p className="text-xs text-[#8A8A8A] mt-1">
            {order.paymentMethod === 'online' ? t.ui.order_online : order.paymentMethod === 'on_delivery' ? t.ui.order_onDelivery : t.ui.order_onPickup}
            {' — '}{order.paymentStatus === 'paid' ? t.ui.order_paid : t.ui.order_pendingPay}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#EDEBE7] text-sm space-y-1">
          <p className="text-[#1A1A1A] font-medium">{order.customerName}</p>
          <p className="text-[#6B6B6B]">{order.customerPhone}</p>
          {order.deliveryStreet && (
            <p className="text-[#6B6B6B]">{order.deliveryStreet}, {order.deliveryCity} {order.deliveryPostal}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center"><span className="text-2xl animate-pulse text-[#6B6B6B]">·</span></div>}>
      <OrderContent />
    </Suspense>
  );
}
