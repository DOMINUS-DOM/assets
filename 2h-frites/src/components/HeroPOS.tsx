'use client';

import { useState, useEffect, useCallback } from 'react';

interface OrderLine {
  name: string;
  price: string;
}

const LINES: OrderLine[] = [
  { name: 'Frites moyen', price: '3,80' },
  { name: 'Coca-Cola', price: '2,50' },
  { name: 'Hamburger', price: '4,00' },
];

const TOTAL = '10,30';
const CYCLE_MS = 9000;

export default function HeroPOS() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [showTotal, setShowTotal] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [fading, setFading] = useState(false);

  const runCycle = useCallback(() => {
    // Reset
    setVisibleLines(0);
    setShowTotal(false);
    setShowButton(false);
    setShowSuccess(false);
    setFading(false);

    // Line 1
    setTimeout(() => setVisibleLines(1), 400);
    // Line 2
    setTimeout(() => setVisibleLines(2), 1200);
    // Line 3
    setTimeout(() => setVisibleLines(3), 2000);
    // Total
    setTimeout(() => setShowTotal(true), 2800);
    // Button activates
    setTimeout(() => setShowButton(true), 3800);
    // Success
    setTimeout(() => setShowSuccess(true), 5000);
    // Fade out
    setTimeout(() => setFading(true), 7500);
  }, []);

  useEffect(() => {
    runCycle();
    const interval = setInterval(runCycle, CYCLE_MS);
    return () => clearInterval(interval);
  }, [runCycle]);

  return (
    <div className={`transition-opacity duration-700 ${fading ? 'opacity-0' : 'opacity-100'}`}>
      <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-[#E8E6E1] overflow-hidden">

        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#FAFAF8] border-b border-[#EDEBE7]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#D4D0C8]" />
            <span className="text-[13px] font-semibold text-[#1A1A1A] tracking-tight">Caisse POS</span>
          </div>
          <span className="text-[11px] text-[#B0ADA6] font-mono">#042</span>
        </div>

        {/* Order lines */}
        <div className="px-5 py-5 space-y-0 min-h-[140px]">
          {LINES.map((line, i) => (
            <div
              key={i}
              className={`flex items-center justify-between py-2.5 border-b border-[#F5F3EF] transition-all duration-500 ${
                i < visibleLines
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-2'
              }`}
            >
              <span className="text-[14px] text-[#3A3A3A]">{line.name}</span>
              <span className="text-[14px] font-medium text-[#1A1A1A] tabular-nums">{line.price} &euro;</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className={`px-5 pb-4 transition-all duration-500 ${showTotal ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center justify-between pt-2 border-t border-[#E8E6E1]">
            <span className="text-[13px] text-[#8A8A8A] uppercase tracking-wider">Total</span>
            <span className="text-[22px] font-bold text-[#1A1A1A] tabular-nums">{TOTAL} &euro;</span>
          </div>
        </div>

        {/* Button */}
        <div className="px-5 pb-5">
          <div className={`transition-all duration-700 ${showButton ? 'opacity-100' : 'opacity-0'}`}>
            {!showSuccess ? (
              <div className={`w-full py-3 rounded-xl text-center text-[14px] font-semibold transition-all duration-500 ${
                showButton ? 'bg-[#1A1A1A] text-white' : 'bg-[#E8E6E1] text-[#B0ADA6]'
              }`}>
                Encaisser
              </div>
            ) : (
              <div className="w-full py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center text-[14px] font-semibold text-emerald-700 transition-all duration-300">
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Commande validee en quelques secondes
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
