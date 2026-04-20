'use client';

import { useState } from 'react';
import { formatPrice } from '@/utils/format';

interface CheckoutModalProps {
  total: number;
  itemCount: number;
  onSubmit: (data: {
    orderType: 'dine_in' | 'pickup';
    customerName: string;
    payments: { method: 'cash' | 'card'; amount: number }[];
  }) => void;
  onClose: () => void;
  submitting: boolean;
  error: string | null;
}

export default function CheckoutModal({ total, itemCount, onSubmit, onClose, submitting, error }: CheckoutModalProps) {
  // Remember last choices between orders (sessionStorage = same shift, cleared on close)
  const [orderType, setOrderType] = useState<'dine_in' | 'pickup'>(() => {
    if (typeof window === 'undefined') return 'dine_in';
    return (sessionStorage.getItem('pos-last-orderType') as 'dine_in' | 'pickup') || 'dine_in';
  });
  const [customerName, setCustomerName] = useState('');

  // Payment state — remember last method
  const [payments, setPayments] = useState<{ method: 'cash' | 'card'; amount: number }[]>([]);
  const [activeMethod, setActiveMethod] = useState<'cash' | 'card'>(() => {
    if (typeof window === 'undefined') return 'cash';
    return (sessionStorage.getItem('pos-last-payMethod') as 'cash' | 'card') || 'cash';
  });
  const [cashReceived, setCashReceived] = useState('');

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = total - totalPaid;
  const cashAmount = parseFloat(cashReceived) || 0;
  const change = activeMethod === 'cash' && cashAmount > remaining ? cashAmount - remaining : 0;

  const addPayment = (method: 'cash' | 'card', amount: number) => {
    if (amount <= 0) return;
    const actualAmount = Math.min(amount, remaining);
    setPayments([...payments, { method, amount: actualAmount }]);
    setCashReceived('');
  };

  const handleSubmit = () => {
    // If split payments started, check all is paid
    if (payments.length > 0 && remaining > 0.01) return;
    // Save last choices for next order (same shift)
    sessionStorage.setItem('pos-last-orderType', orderType);
    sessionStorage.setItem('pos-last-payMethod', activeMethod);
    onSubmit({
      orderType,
      customerName: customerName || 'Client comptoir',
      payments: payments.length > 0 ? payments : [{ method: activeMethod, amount: total }],
    });
  };

  // Quick cash buttons
  const quickAmounts = [5, 10, 20, 50];

  const ic = 'w-full px-4 py-4 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-base placeholder-zinc-500 focus:outline-none focus:border-amber-500/50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-zinc-900 rounded-2xl border border-zinc-700 p-6 w-[32rem] max-h-[90vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-white text-center">
          Encaisser — {formatPrice(total)} €
        </h3>

        {/* Order type */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setOrderType('dine_in')}
            className={`py-4 rounded-xl text-base font-bold transition-all ${orderType === 'dine_in' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>
            🏪 Sur place
          </button>
          <button onClick={() => setOrderType('pickup')}
            className={`py-4 rounded-xl text-base font-bold transition-all ${orderType === 'pickup' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>
            🛍️ A emporter
          </button>
        </div>

        {/* Customer name */}
        <input
          className={ic}
          placeholder="Nom du client (optionnel)"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />

        {/* Payment method selection */}
        <div className="border-t border-zinc-800 pt-4">
          <p className="text-xs text-zinc-500 uppercase font-bold mb-3">Mode de paiement</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setActiveMethod('cash')}
              className={`py-3 rounded-xl text-base font-bold transition-all ${activeMethod === 'cash' ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
              💵 Espèces
            </button>
            <button onClick={() => setActiveMethod('card')}
              className={`py-3 rounded-xl text-base font-bold transition-all ${activeMethod === 'card' ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
              💳 Carte
            </button>
          </div>
        </div>

        {/* Cash payment: amount received + change */}
        {activeMethod === 'cash' && (
          <div className="space-y-3">
            <div className="relative">
              <input
                className={ic}
                type="number"
                step="0.01"
                placeholder={`Montant reçu (min ${formatPrice(remaining)} €)`}
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">€</span>
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2">
              {quickAmounts.map((amt) => (
                <button key={amt} onClick={() => setCashReceived(String(amt))}
                  className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-bold hover:bg-zinc-700 active:scale-95">
                  {amt}€
                </button>
              ))}
              <button onClick={() => setCashReceived(String(Math.ceil(remaining)))}
                className="flex-1 py-2 rounded-lg bg-amber-500/20 text-amber-400 text-sm font-bold hover:bg-amber-500/30 active:scale-95">
                {Math.ceil(remaining)}€
              </button>
            </div>

            {change > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-emerald-400 font-medium">Rendu monnaie</span>
                <span className="text-2xl font-extrabold text-emerald-400">{formatPrice(change)} €</span>
              </div>
            )}
          </div>
        )}

        {/* Split payment info */}
        {payments.length > 0 && (
          <div className="space-y-2 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <p className="text-xs text-zinc-500 uppercase font-bold">Paiements</p>
            {payments.map((p, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-zinc-300">{p.method === 'cash' ? '💵 Espèces' : '💳 Carte'}</span>
                <span className="text-white font-bold">{formatPrice(p.amount)} €</span>
              </div>
            ))}
            {remaining > 0.01 && (
              <div className="flex justify-between text-sm border-t border-zinc-700 pt-2">
                <span className="text-amber-400 font-medium">Reste à payer</span>
                <span className="text-amber-400 font-bold">{formatPrice(remaining)} €</span>
              </div>
            )}
          </div>
        )}

        {/* Split payment button */}
        {remaining > 0.01 && (
          <button
            onClick={() => {
              if (activeMethod === 'cash' && cashAmount > 0) {
                addPayment('cash', Math.min(cashAmount, remaining));
              } else if (activeMethod === 'card') {
                addPayment('card', remaining);
              }
            }}
            disabled={activeMethod === 'cash' && cashAmount <= 0}
            className="w-full py-3 rounded-xl bg-zinc-800 text-zinc-300 font-medium text-sm hover:bg-zinc-700 disabled:opacity-30">
            + Ajouter ce paiement ({activeMethod === 'cash' ? 'espèces' : 'carte'}) — paiement split
          </button>
        )}

        {/* Error */}
        {error && (
          <p className="text-base text-red-400 bg-red-500/10 rounded-lg px-4 py-3 text-center">{error}</p>
        )}

        {/* Submit */}
        <button onClick={handleSubmit} disabled={submitting || (payments.length > 0 && remaining > 0.01) || total <= 0}
          className="w-full py-5 rounded-xl bg-amber-500 text-zinc-950 font-extrabold text-xl active:scale-[0.97] transition-transform disabled:opacity-50">
          {submitting ? 'Envoi...' : payments.length > 0
            ? (remaining <= 0.01 ? `Valider — ${formatPrice(total)} €` : `Reste ${formatPrice(remaining)} €`)
            : `Encaisser — ${formatPrice(total)} €`
          }
        </button>

        <button onClick={onClose}
          className="w-full text-center text-zinc-500 text-base py-2 hover:text-zinc-300 transition-colors">
          Annuler
        </button>
      </div>
    </div>
  );
}
