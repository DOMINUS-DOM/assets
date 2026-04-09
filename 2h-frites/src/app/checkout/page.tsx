'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { store } from '@/stores/store';
import { formatPrice } from '@/utils/format';
import { OrderType, PaymentMethod } from '@/types/order';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart } = useCart();

  const [orderType, setOrderType] = useState<OrderType>('pickup');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [instructions, setInstructions] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('on_pickup');
  const [submitting, setSubmitting] = useState(false);

  if (items.length === 0) {
    return (
      <div className="min-h-screen max-w-lg mx-auto flex items-center justify-center bg-zinc-950 px-4">
        <div className="text-center">
          <span className="text-5xl block mb-4">🛒</span>
          <p className="text-zinc-400 mb-4">Panier vide</p>
          <a href="/" className="text-amber-400 font-medium text-sm">← Retour au menu</a>
        </div>
      </div>
    );
  }

  const deliveryFee = orderType === 'delivery' ? 2.50 : 0;
  const grandTotal = total + deliveryFee;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    if (orderType === 'delivery' && (!street || !city)) return;

    setSubmitting(true);

    const order = store.createOrder({
      items,
      type: orderType,
      customer: { name, phone, email: email || undefined },
      deliveryAddress: orderType === 'delivery' ? { street, city, postalCode, instructions: instructions || undefined } : undefined,
      pickupTime: orderType === 'pickup' ? pickupTime || undefined : undefined,
      payment: { method: paymentMethod, status: paymentMethod === 'online' ? 'paid' : 'pending' },
      total: grandTotal,
    });

    clearCart();
    router.push(`/order?id=${order.id}`);
  };

  const inputClass = 'w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500/50';

  return (
    <div className="min-h-screen max-w-lg mx-auto pb-20 bg-zinc-950">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50">
        <div className="flex items-center justify-between h-14 px-4">
          <a href="/cart" className="text-amber-400 font-medium text-sm">← Panier</a>
          <h1 className="text-sm font-bold text-white">Commander</h1>
          <div className="w-16" />
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-4 pt-4 space-y-6">
        {/* Order Type */}
        <section>
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Mode de commande</h2>
          <div className="grid grid-cols-2 gap-2">
            {(['pickup', 'delivery'] as OrderType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setOrderType(type);
                  setPaymentMethod(type === 'pickup' ? 'on_pickup' : 'on_delivery');
                }}
                className={`py-3 rounded-xl text-sm font-semibold transition-colors ${
                  orderType === type
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                }`}
              >
                {type === 'pickup' ? '🏪 Retrait' : '🛵 Livraison'}
              </button>
            ))}
          </div>
        </section>

        {/* Customer Info */}
        <section>
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Vos coordonnées</h2>
          <div className="space-y-3">
            <input className={inputClass} placeholder="Nom *" value={name} onChange={(e) => setName(e.target.value)} required />
            <input className={inputClass} placeholder="Téléphone *" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            <input className={inputClass} placeholder="Email (optionnel)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </section>

        {/* Delivery Address */}
        {orderType === 'delivery' && (
          <section className="animate-fade-in">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Adresse de livraison</h2>
            <div className="space-y-3">
              <input className={inputClass} placeholder="Rue et numéro *" value={street} onChange={(e) => setStreet(e.target.value)} required />
              <div className="grid grid-cols-2 gap-2">
                <input className={inputClass} placeholder="Ville *" value={city} onChange={(e) => setCity(e.target.value)} required />
                <input className={inputClass} placeholder="Code postal" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
              </div>
              <input className={inputClass} placeholder="Instructions (étage, digicode...)" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
            </div>
          </section>
        )}

        {/* Pickup Time */}
        {orderType === 'pickup' && (
          <section className="animate-fade-in">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Heure de retrait souhaitée</h2>
            <input className={inputClass} type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
          </section>
        )}

        {/* Payment */}
        <section>
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Paiement</h2>
          <div className="space-y-2">
            {orderType === 'pickup' ? (
              <>
                <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${paymentMethod === 'on_pickup' ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-zinc-900 border border-zinc-800'}`}>
                  <input type="radio" name="payment" checked={paymentMethod === 'on_pickup'} onChange={() => setPaymentMethod('on_pickup')} className="accent-amber-500" />
                  <span className="text-sm text-white">💶 Paiement sur place</span>
                </label>
                <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${paymentMethod === 'online' ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-zinc-900 border border-zinc-800'}`}>
                  <input type="radio" name="payment" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} className="accent-amber-500" />
                  <span className="text-sm text-white">💳 Paiement en ligne</span>
                </label>
              </>
            ) : (
              <>
                <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${paymentMethod === 'on_delivery' ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-zinc-900 border border-zinc-800'}`}>
                  <input type="radio" name="payment" checked={paymentMethod === 'on_delivery'} onChange={() => setPaymentMethod('on_delivery')} className="accent-amber-500" />
                  <span className="text-sm text-white">💶 Paiement à la livraison</span>
                </label>
                <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${paymentMethod === 'online' ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-zinc-900 border border-zinc-800'}`}>
                  <input type="radio" name="payment" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} className="accent-amber-500" />
                  <span className="text-sm text-white">💳 Paiement en ligne</span>
                </label>
              </>
            )}
          </div>
        </section>

        {/* Summary */}
        <section className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Sous-total ({items.length} articles)</span>
            <span className="text-white">{formatPrice(total)} €</span>
          </div>
          {orderType === 'delivery' && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Frais de livraison</span>
              <span className="text-white">{formatPrice(deliveryFee)} €</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-zinc-800">
            <span className="text-sm font-bold text-white">Total</span>
            <span className="text-xl font-extrabold text-amber-400">{formatPrice(grandTotal)} €</span>
          </div>
        </section>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500
            text-zinc-950 font-bold text-sm active:scale-[0.97] transition-transform
            shadow-lg shadow-amber-500/20 disabled:opacity-50"
        >
          {submitting ? 'Envoi...' : `Confirmer (${formatPrice(grandTotal)} €)`}
        </button>
      </form>
    </div>
  );
}
