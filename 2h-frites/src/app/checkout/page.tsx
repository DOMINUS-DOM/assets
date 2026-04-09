'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useApiData } from '@/hooks/useApiData';
import { formatPrice } from '@/utils/format';
import { OrderType, PaymentMethod } from '@/types/order';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: settings } = useApiData<any>('/settings', {});

  const [orderType, setOrderType] = useState<OrderType>('pickup');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [instructions, setInstructions] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [loyaltyRedeem, setLoyaltyRedeem] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('on_pickup');
  const [submitting, setSubmitting] = useState(false);

  if (items.length === 0) {
    return (
      <div className="min-h-screen max-w-lg mx-auto flex items-center justify-center bg-zinc-950 px-4">
        <div className="text-center">
          <span className="text-5xl block mb-4">🛒</span>
          <p className="text-zinc-400 mb-4">{t.ui.cart_empty}</p>
          <a href="/" className="text-amber-400 font-medium text-sm">{t.ui.checkout_backToMenu}</a>
        </div>
      </div>
    );
  }

  const deliveryFee = orderType === 'delivery' ? (settings.defaultDeliveryFee || 2.50) : 0;
  const grandTotal = total + deliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    if (orderType === 'delivery' && (!street || !city)) return;
    setSubmitting(true);
    try {
      const order = await api.post<any>('/orders', {
        action: 'create', type: orderType,
        customerName: name, customerPhone: phone, customerEmail: email || null,
        deliveryStreet: orderType === 'delivery' ? street : null,
        deliveryCity: orderType === 'delivery' ? city : null,
        deliveryPostal: orderType === 'delivery' ? postalCode : null,
        deliveryNotes: orderType === 'delivery' ? instructions : null,
        pickupTime: orderType === 'pickup' ? pickupTime : null,
        paymentMethod, paymentStatus: paymentMethod === 'online' ? 'paid' : 'pending',
        total: grandTotal, userId: user?.id || null,
        items: items.map((i) => ({ menuItemId: i.menuItemId, name: i.name, price: i.price, quantity: i.quantity, sizeKey: i.sizeKey || null, categoryId: i.categoryId })),
      });
      clearCart();
      router.push(`/order?id=${order.orderNumber}`);
    } catch { setSubmitting(false); }
  };

  const ic = 'w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500/50';

  return (
    <div className="min-h-screen max-w-lg mx-auto pb-20 bg-zinc-950">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50">
        <div className="flex items-center justify-between h-14 px-4">
          <a href="/cart" className="text-amber-400 font-medium text-sm">← {t.ui.cart_title}</a>
          <h1 className="text-sm font-bold text-white">{t.ui.checkout_title}</h1>
          <div className="w-16" />
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-4 pt-4 space-y-6">
        <section>
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{t.ui.checkout_orderType}</h2>
          <div className="grid grid-cols-2 gap-2">
            {(['pickup', 'delivery'] as OrderType[]).map((type) => (
              <button key={type} type="button"
                onClick={() => { setOrderType(type); setPaymentMethod(type === 'pickup' ? 'on_pickup' : 'on_delivery'); }}
                className={`py-3 rounded-xl text-sm font-semibold transition-colors ${orderType === type ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}`}>
                {type === 'pickup' ? t.ui.checkout_pickup : t.ui.checkout_delivery}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{t.ui.checkout_yourInfo}</h2>
          <div className="space-y-3">
            <input className={ic} placeholder={t.ui.checkout_name} value={name} onChange={(e) => setName(e.target.value)} required />
            <input className={ic} placeholder={t.ui.checkout_phone} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            <input className={ic} placeholder={t.ui.checkout_email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </section>

        {orderType === 'delivery' && (
          <section className="animate-fade-in">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{t.ui.checkout_deliveryAddr}</h2>
            <div className="space-y-3">
              <input className={ic} placeholder={t.ui.checkout_street} value={street} onChange={(e) => setStreet(e.target.value)} required />
              <div className="grid grid-cols-2 gap-2">
                <input className={ic} placeholder={t.ui.checkout_city} value={city} onChange={(e) => setCity(e.target.value)} required />
                <input className={ic} placeholder={t.ui.checkout_postal} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
              </div>
              <input className={ic} placeholder={t.ui.checkout_instructions} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
            </div>
          </section>
        )}

        {orderType === 'pickup' && (
          <section className="animate-fade-in">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{t.ui.checkout_pickupTime}</h2>
            <input className={ic} type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
          </section>
        )}

        {/* Scheduling */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t.ui.sched_title}</h2>
            <button type="button" onClick={() => setIsScheduled(!isScheduled)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${isScheduled ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500'}`}>
              {isScheduled ? t.ui.sched_later : t.ui.sched_now}
            </button>
          </div>
          {isScheduled && (
            <div className="grid grid-cols-2 gap-2 animate-fade-in">
              <input className={ic} type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} required />
              <input className={ic} type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} required />
            </div>
          )}
        </section>

        {/* Loyalty points */}
        {user && (
          <section className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-400">⭐ {t.ui.loyalty_title}</p>
                <p className="text-[10px] text-zinc-500">{t.ui.loyalty_earn}: {Math.floor(grandTotal)} pts</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setLoyaltyRedeem(Math.min(loyaltyRedeem + 10, 100))}
                  className="px-2 py-1 rounded-lg bg-zinc-800 text-amber-400 text-xs font-bold">+10 pts</button>
                {loyaltyRedeem > 0 && (
                  <span className="text-xs text-emerald-400 font-bold">-{formatPrice(loyaltyRedeem / 20)} €</span>
                )}
              </div>
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{t.ui.checkout_payment}</h2>
          <div className="space-y-2">
            {(orderType === 'pickup'
              ? [{ key: 'on_pickup' as PaymentMethod, label: t.ui.checkout_payOnPickup }, { key: 'online' as PaymentMethod, label: t.ui.checkout_payOnline }]
              : [{ key: 'on_delivery' as PaymentMethod, label: t.ui.checkout_payOnDelivery }, { key: 'online' as PaymentMethod, label: t.ui.checkout_payOnline }]
            ).map((opt) => (
              <label key={opt.key} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${paymentMethod === opt.key ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-zinc-900 border border-zinc-800'}`}>
                <input type="radio" name="payment" checked={paymentMethod === opt.key} onChange={() => setPaymentMethod(opt.key)} className="accent-amber-500" />
                <span className="text-sm text-white">{opt.label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">{t.ui.checkout_subtotal} ({items.length} {t.ui.checkout_items})</span>
            <span className="text-white">{formatPrice(total)} €</span>
          </div>
          {orderType === 'delivery' && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">{t.ui.checkout_deliveryFee}</span>
              <span className="text-white">{formatPrice(deliveryFee)} €</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-zinc-800">
            <span className="text-sm font-bold text-white">{t.ui.cart_total}</span>
            <span className="text-xl font-extrabold text-amber-400">{formatPrice(grandTotal)} €</span>
          </div>
        </section>

        <button type="submit" disabled={submitting}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-bold text-sm active:scale-[0.97] transition-transform shadow-lg shadow-amber-500/20 disabled:opacity-50">
          {submitting ? t.ui.checkout_sending : `${t.ui.checkout_confirm} (${formatPrice(grandTotal)} €)`}
        </button>
      </form>
    </div>
  );
}
