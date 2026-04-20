'use client';

import { useState, useEffect } from 'react';
import { menuStore } from '@/stores/menuStore';
import { useLanguage } from '@/i18n/LanguageContext';
import { MenuItem } from '@/types';
import { CartExtra } from '@/types/order';
import { formatPrice } from '@/utils/format';

type Step = 'sauce' | 'toppings' | 'summary';
const STEPS: Step[] = ['sauce', 'toppings', 'summary'];

interface Props {
  item: MenuItem;
  onClose: () => void;
  onAdd: (item: { menuItemId: string; name: string; price: number; categoryId: string; extras?: CartExtra[] }) => void;
}

export default function PainRondBuilder({ item, onClose, onAdd }: Props) {
  const { t, getItemName } = useLanguage();
  const [step, setStep] = useState<Step>('sauce');
  const [sauces, setSauces] = useState<MenuItem[]>([]);
  const [toppings, setToppings] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState(menuStore.getCategories());

  useEffect(() => {
    return menuStore.subscribe(() => setCategories(menuStore.getCategories()));
  }, []);

  const sauceItems = categories.find((c) => c.id === 'sauces')?.items.filter((i) => !i.unavailable) || [];
  const toppingItems = categories.find((c) => c.id === 'supplements')?.items.filter((i) => !i.unavailable) || [];

  const stepIndex = STEPS.indexOf(step);
  const basePrice = item.price || 0;

  const totalPrice = () => {
    let t = basePrice;
    sauces.forEach((s) => (t += s.price || 0));
    toppings.forEach((tp) => (t += tp.price || 0));
    return t;
  };

  const toggleSelection = (sel: MenuItem, list: MenuItem[], setList: (v: MenuItem[]) => void, max: number) => {
    const exists = list.find((i) => i.id === sel.id);
    if (exists) {
      setList(list.filter((i) => i.id !== sel.id));
    } else if (list.length < max) {
      setList([...list, sel]);
    }
  };

  const handleAddToCart = () => {
    const extras: CartExtra[] = [];
    sauces.forEach((s) => extras.push({ name: getItemName(s.id, s.name), price: s.price || 0 }));
    toppings.forEach((tp) => extras.push({ name: getItemName(tp.id, tp.name), price: tp.price || 0 }));

    onAdd({
      menuItemId: `${item.id}_${Date.now()}`,
      name: getItemName(item.id, item.name),
      price: totalPrice(),
      categoryId: 'pains_ronds',
      extras: extras.length > 0 ? extras : undefined,
    });
    onClose();
  };

  const handleAddSimple = () => {
    onAdd({
      menuItemId: item.id,
      name: getItemName(item.id, item.name),
      price: basePrice,
      categoryId: 'pains_ronds',
    });
    onClose();
  };

  const nextStep = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const prevStep = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const renderGrid = (items: MenuItem[], selected: MenuItem[], onToggle: (i: MenuItem) => void) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pb-4">
      {items.map((it) => {
        const isSelected = selected.some((s) => s.id === it.id);
        return (
          <button key={it.id} onClick={() => onToggle(it)}
            className={`p-3 rounded-xl border text-left transition-all active:scale-[0.97] ${
              isSelected
                ? 'bg-amber-500/15 border-amber-500/50 ring-1 ring-amber-500/30'
                : 'bg-white border-[#EDEBE7]/50 hover:border-[#EDEBE7]'
            }`}>
            <p className={`text-sm font-medium ${isSelected ? 'text-[#B45309]' : 'text-[#1A1A1A]'}`}>
              {getItemName(it.id, it.name)}
            </p>
            {it.price != null && (
              <p className="text-xs text-[#8A8A8A] mt-0.5">+{formatPrice(it.price)} €</p>
            )}
            {isSelected && <span className="text-[#B45309] text-xs mt-1 block">✓</span>}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#FAFAF8] flex flex-col">
      <header className="sticky top-0 bg-[#FAFAF8]/95 backdrop-blur-md border-b border-[#EDEBE7]/50 px-4 py-3 z-10">
        <div className="flex items-center justify-between max-w-lg lg:max-w-5xl mx-auto">
          <button onClick={onClose} className="text-[#6B6B6B] text-sm">← {t.ui.bld_back}</button>
          <h1 className="text-sm font-bold text-[#1A1A1A]">🍔 {getItemName(item.id, item.name)}</h1>
          <span className="text-xs text-[#B45309] font-bold">{formatPrice(totalPrice())} €</span>
        </div>
        <div className="flex gap-1 mt-2 max-w-lg lg:max-w-5xl mx-auto">
          {STEPS.map((s, i) => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${
              i <= stepIndex ? 'bg-amber-500' : 'bg-[#F5F3EF]'
            }`} />
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 max-w-lg lg:max-w-5xl mx-auto w-full">
        {/* Base info */}
        {step === 'sauce' && (
          <>
            <div className="p-3 rounded-xl bg-white border border-[#EDEBE7]/50 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🍔</span>
                <span className="text-[#1A1A1A] font-medium">{getItemName(item.id, item.name)}</span>
              </div>
              <span className="text-[#B45309] font-bold">{formatPrice(basePrice)} €</span>
            </div>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-1">{t.ui.bld_pr_sauce}</h2>
            <p className="text-xs text-[#8A8A8A] mb-3">{t.ui.bld_optional}{sauceItems[0]?.price ? ` — ${formatPrice(sauceItems[0].price)}€ ${t.ui.bld_perSauce}` : ''}</p>
            {renderGrid(sauceItems, sauces, (it) => toggleSelection(it, sauces, setSauces, 2))}
          </>
        )}

        {step === 'toppings' && (
          <>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-1">{t.ui.bld_pr_toppings}</h2>
            <p className="text-xs text-[#8A8A8A] mb-3">{t.ui.bld_optional}</p>
            {renderGrid(toppingItems, toppings, (it) => toggleSelection(it, toppings, setToppings, 10))}
          </>
        )}

        {step === 'summary' && (
          <div className="space-y-3 mt-2">
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-1">{t.ui.bld_summary}</h2>
            <div className="p-4 rounded-xl bg-white border border-[#EDEBE7]/50 space-y-2">
              <div className="flex justify-between">
                <span className="text-[#1A1A1A] font-medium">🍔 {getItemName(item.id, item.name)}</span>
                <span className="text-[#B45309]">{formatPrice(basePrice)} €</span>
              </div>
              {sauces.map((s) => (
                <div key={s.id} className="flex justify-between text-sm">
                  <span className="text-[#1A1A1A]">+ {getItemName(s.id, s.name)}</span>
                  <span className="text-[#6B6B6B]">+{formatPrice(s.price || 0)} €</span>
                </div>
              ))}
              {toppings.map((tp) => (
                <div key={tp.id} className="flex justify-between text-sm">
                  <span className="text-[#1A1A1A]">+ {getItemName(tp.id, tp.name)}</span>
                  <span className="text-[#6B6B6B]">+{formatPrice(tp.price || 0)} €</span>
                </div>
              ))}
              <div className="border-t border-[#EDEBE7] pt-2 mt-2 flex justify-between">
                <span className="text-[#1A1A1A] font-bold">{t.ui.bld_total}</span>
                <span className="text-[#B45309] font-bold text-lg">{formatPrice(totalPrice())} €</span>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 bg-[#FAFAF8]/95 backdrop-blur-md border-t border-[#EDEBE7]/50 px-4 py-3">
        <div className="flex gap-3 max-w-lg lg:max-w-5xl mx-auto">
          {step === 'sauce' && (
            <button onClick={handleAddSimple}
              className="px-4 py-3 rounded-xl bg-[#F5F3EF] text-[#1A1A1A] font-medium text-sm flex-1">
              {t.ui.bld_pr_noExtra}
            </button>
          )}
          {stepIndex > 0 && (
            <button onClick={prevStep}
              className="px-4 py-3 rounded-xl bg-[#F5F3EF] text-[#1A1A1A] font-medium text-sm flex-1">
              ← {t.ui.bld_previous}
            </button>
          )}
          {step === 'summary' ? (
            <button onClick={handleAddToCart}
              className="px-4 py-3 rounded-xl bg-[#1A1A1A] text-white font-bold text-sm flex-1 active:scale-[0.97]">
              {t.ui.bld_addToCart} — {formatPrice(totalPrice())} €
            </button>
          ) : (
            <button onClick={nextStep}
              className="px-4 py-3 rounded-xl bg-[#1A1A1A] text-white font-bold text-sm flex-1 active:scale-[0.97]">
              {step === 'sauce' ? `${t.ui.bld_pr_toppingsNext} →` : `${t.ui.bld_pr_recapNext} →`}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
