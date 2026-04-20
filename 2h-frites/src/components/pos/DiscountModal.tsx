'use client';

import { useState } from 'react';

interface DiscountModalProps {
  type: 'percent' | 'euro';
  currentTotal: number;
  onApply: (amount: number, reason: string) => void;
  onClose: () => void;
}

export default function DiscountModal({ type, currentTotal, onApply, onClose }: DiscountModalProps) {
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');

  const numValue = parseFloat(value) || 0;
  const discountAmount = type === 'percent'
    ? (currentTotal * numValue / 100)
    : numValue;

  const handleApply = () => {
    if (numValue <= 0) return;
    onApply(discountAmount, reason || (type === 'percent' ? `Remise ${numValue}%` : `Remise ${numValue}€`));
    onClose();
  };

  const ic = 'w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-base placeholder-zinc-500 focus:outline-none focus:border-amber-500/50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-zinc-900 rounded-2xl border border-zinc-700 p-6 w-96 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white text-center">
          {type === 'percent' ? 'Remise en %' : 'Remise en €'}
        </h3>

        <div className="relative">
          <input
            className={ic}
            type="number"
            step={type === 'percent' ? '1' : '0.01'}
            min="0"
            max={type === 'percent' ? '100' : String(currentTotal)}
            placeholder={type === 'percent' ? 'Ex: 10' : 'Ex: 2.50'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">
            {type === 'percent' ? '%' : '€'}
          </span>
        </div>

        {numValue > 0 && (
          <p className="text-center text-sm text-amber-400">
            Remise de <span className="font-bold">{discountAmount.toFixed(2)} €</span> sur {currentTotal.toFixed(2)} €
          </p>
        )}

        <input
          className={ic}
          placeholder="Raison (optionnel)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <div className="flex gap-3">
          <button onClick={handleApply} disabled={numValue <= 0}
            className="flex-1 py-4 rounded-xl bg-amber-500 text-zinc-950 font-extrabold text-base active:scale-[0.97] disabled:opacity-30">
            Appliquer
          </button>
          <button onClick={onClose}
            className="flex-1 py-4 rounded-xl bg-zinc-800 text-zinc-400 font-medium text-base">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
