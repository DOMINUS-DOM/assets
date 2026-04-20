'use client';

interface NumPadProps {
  value: string;
  onChange: (value: string) => void;
  onQuantity: () => void;
  onFreePrice: () => void;
  onDiscountPct: () => void;
  onDiscountEur: () => void;
}

export default function NumPad({ value, onChange, onQuantity, onFreePrice, onDiscountPct, onDiscountEur }: NumPadProps) {
  const append = (char: string) => {
    if (char === '.' && value.includes('.')) return;
    if (char === '00' && value === '0') return;
    onChange(value === '0' && char !== '.' && char !== '00' ? char : value + char);
  };

  const backspace = () => onChange(value.length > 1 ? value.slice(0, -1) : '0');
  const clear = () => onChange('0');

  const k = 'flex items-center justify-center rounded font-bold active:scale-90 transition-transform';

  return (
    <div className="space-y-1">
      {/* Display */}
      <div className="flex items-center justify-between px-2 py-1 rounded bg-zinc-800 border border-zinc-700">
        <span className="text-[9px] text-zinc-500 uppercase">Saisie</span>
        <span className="text-base font-mono font-bold text-amber-400">{value}</span>
      </div>

      {/* Pave 4x4 classique */}
      <div className="grid grid-cols-4 gap-1">
        <button onClick={() => append('7')} className={`${k} h-9 bg-zinc-800 text-white text-sm`}>7</button>
        <button onClick={() => append('8')} className={`${k} h-9 bg-zinc-800 text-white text-sm`}>8</button>
        <button onClick={() => append('9')} className={`${k} h-9 bg-zinc-800 text-white text-sm`}>9</button>
        <button onClick={backspace} className={`${k} h-9 bg-zinc-700 text-amber-400 text-sm`}>←</button>

        <button onClick={() => append('4')} className={`${k} h-9 bg-zinc-800 text-white text-sm`}>4</button>
        <button onClick={() => append('5')} className={`${k} h-9 bg-zinc-800 text-white text-sm`}>5</button>
        <button onClick={() => append('6')} className={`${k} h-9 bg-zinc-800 text-white text-sm`}>6</button>
        <button onClick={clear} className={`${k} h-9 bg-zinc-700 text-red-400 text-sm`}>C</button>

        <button onClick={() => append('1')} className={`${k} h-9 bg-zinc-800 text-white text-sm`}>1</button>
        <button onClick={() => append('2')} className={`${k} h-9 bg-zinc-800 text-white text-sm`}>2</button>
        <button onClick={() => append('3')} className={`${k} h-9 bg-zinc-800 text-white text-sm`}>3</button>
        <button onClick={() => append('.')} className={`${k} h-9 bg-zinc-700 text-white text-sm`}>.</button>

        <button onClick={() => append('0')} className={`${k} h-9 bg-zinc-800 text-white text-sm`}>0</button>
        <button onClick={() => append('00')} className={`${k} h-9 bg-zinc-800 text-white text-sm`}>00</button>
        <button onClick={onQuantity} className={`${k} h-9 bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px]`}>Qty</button>
        <button onClick={onFreePrice} className={`${k} h-9 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]`}>€</button>
      </div>

      {/* Remises */}
      <div className="grid grid-cols-2 gap-1">
        <button onClick={onDiscountPct} className={`${k} h-8 bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[10px]`}>% Remise</button>
        <button onClick={onDiscountEur} className={`${k} h-8 bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[10px]`}>€ Remise</button>
      </div>
    </div>
  );
}
