'use client';

import { useState, useEffect } from 'react';
import { menuStore } from '@/stores/menuStore';
import { useCart } from '@/contexts/CartContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { MenuItem } from '@/types';
import { CartExtra } from '@/types/order';
import { formatPrice } from '@/utils/format';

const BASE_PRICE = 5.00; // Pain + frites inclus

type Step = 'frites' | 'meat' | 'sauce' | 'toppings' | 'summary';
const STEPS: Step[] = ['frites', 'meat', 'sauce', 'toppings', 'summary'];
const STEP_LABELS: Record<Step, string> = {
  frites: 'Vos frites',
  meat: 'Viande (max 2)',
  sauce: 'Sauce (max 2)',
  toppings: 'Garnitures',
  summary: 'Récapitulatif',
};

interface Props {
  onClose: () => void;
}

export default function PainFritesBuilder({ onClose }: Props) {
  const { addItem } = useCart();
  const { getItemName } = useLanguage();
  const [step, setStep] = useState<Step>('frites');
  const [withSalt, setWithSalt] = useState(true);
  const [withSpice, setWithSpice] = useState(false);
  const [meats, setMeats] = useState<MenuItem[]>([]);
  const [sauces, setSauces] = useState<MenuItem[]>([]);
  const [toppings, setToppings] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState(menuStore.getCategories());

  useEffect(() => {
    return menuStore.subscribe(() => setCategories(menuStore.getCategories()));
  }, []);

  const meatItems = categories.find((c) => c.id === 'viandes')?.items.filter((i) => !i.unavailable) || [];
  const sauceItems = categories.find((c) => c.id === 'sauces')?.items.filter((i) => !i.unavailable) || [];
  const toppingItems = categories.find((c) => c.id === 'supplements')?.items.filter((i) => !i.unavailable) || [];

  const stepIndex = STEPS.indexOf(step);

  const totalPrice = () => {
    let t = BASE_PRICE;
    meats.forEach((m) => (t += m.price || 0));
    sauces.forEach((s) => (t += s.price || 0));
    toppings.forEach((tp) => (t += tp.price || 0));
    return t;
  };

  const toggleSelection = (item: MenuItem, list: MenuItem[], setList: (v: MenuItem[]) => void, max: number) => {
    const exists = list.find((i) => i.id === item.id);
    if (exists) {
      setList(list.filter((i) => i.id !== item.id));
    } else if (list.length < max) {
      setList([...list, item]);
    }
  };

  const handleAddToCart = () => {
    const extras: CartExtra[] = [];
    const fritesNote = `Frites ${withSalt ? 'avec sel' : 'sans sel'}${withSpice ? ', épicées' : ''}`;
    extras.push({ name: fritesNote, price: 0 });
    meats.forEach((m) => extras.push({ name: getItemName(m.id, m.name), price: m.price || 0 }));
    sauces.forEach((s) => extras.push({ name: getItemName(s.id, s.name), price: s.price || 0 }));
    toppings.forEach((tp) => extras.push({ name: getItemName(tp.id, tp.name), price: tp.price || 0 }));

    addItem({
      menuItemId: `pain_frites_${Date.now()}`,
      name: 'Pain-frites',
      price: totalPrice(),
      categoryId: 'pain_frites',
      extras,
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

  const renderItemGrid = (items: MenuItem[], selected: MenuItem[], onToggle: (item: MenuItem) => void) => (
    <div className="grid grid-cols-2 gap-2 pb-4">
      {items.map((item) => {
        const isSelected = selected.some((s) => s.id === item.id);
        return (
          <button key={item.id} onClick={() => onToggle(item)}
            className={`p-3 rounded-xl border text-left transition-all active:scale-[0.97] ${
              isSelected
                ? 'bg-amber-500/15 border-amber-500/50 ring-1 ring-amber-500/30'
                : 'bg-zinc-900 border-zinc-800/50 hover:border-zinc-700'
            }`}>
            <p className={`text-sm font-medium ${isSelected ? 'text-amber-400' : 'text-white'}`}>
              {getItemName(item.id, item.name)}
            </p>
            {item.price != null && (
              <p className="text-xs text-zinc-500 mt-0.5">+{formatPrice(item.price)} €</p>
            )}
            {isSelected && <span className="text-amber-400 text-xs mt-1 block">✓</span>}
          </button>
        );
      })}
    </div>
  );

  const ToggleButton = ({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) => (
    <button onClick={onToggle}
      className={`flex-1 p-4 rounded-xl border text-center transition-all active:scale-[0.97] ${
        active
          ? 'bg-amber-500/15 border-amber-500/50 text-amber-400 font-bold'
          : 'bg-zinc-900 border-zinc-800/50 text-zinc-400'
      }`}>
      <span className="text-2xl block mb-1">{active ? '✓' : '✗'}</span>
      <span className="text-sm">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50 px-4 py-3 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={onClose} className="text-zinc-400 text-sm">← Retour</button>
          <h1 className="text-sm font-bold text-white">🥖 Composer mon pain-frites</h1>
          <span className="text-xs text-amber-400 font-bold">{formatPrice(totalPrice())} €</span>
        </div>
        <div className="flex gap-1 mt-2 max-w-lg mx-auto">
          {STEPS.map((s, i) => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${
              i <= stepIndex ? 'bg-amber-500' : 'bg-zinc-800'
            }`} />
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full">
        <h2 className="text-lg font-bold text-white mb-1">
          {stepIndex + 1}. {STEP_LABELS[step]}
        </h2>

        {/* STEP 1: Frites options */}
        {step === 'frites' && (
          <div className="space-y-4 mt-2">
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🥖🍟</span>
                <div>
                  <p className="text-white font-bold">Pain + Frites</p>
                  <p className="text-amber-400 font-bold text-lg">{formatPrice(BASE_PRICE)} €</p>
                </div>
              </div>
              <p className="text-xs text-zinc-500">Prix de base incluant le pain et les frites. Les viandes, sauces et garnitures sont en supplément.</p>
            </div>

            <p className="text-xs text-zinc-400 uppercase tracking-wider font-bold">Options frites</p>
            <div className="flex gap-3">
              <ToggleButton label="Avec sel" active={withSalt} onToggle={() => setWithSalt(!withSalt)} />
              <ToggleButton label="Épicées" active={withSpice} onToggle={() => setWithSpice(!withSpice)} />
            </div>
          </div>
        )}

        {/* STEP 2: Meats */}
        {step === 'meat' && (
          <>
            <p className="text-xs text-zinc-500 mb-3">Choisissez jusqu&apos;à 2 viandes (optionnel)</p>
            {renderItemGrid(meatItems, meats, (item) => toggleSelection(item, meats, setMeats, 2))}
          </>
        )}

        {/* STEP 3: Sauces */}
        {step === 'sauce' && (
          <>
            <p className="text-xs text-zinc-500 mb-3">Choisissez jusqu&apos;à 2 sauces (optionnel)</p>
            {renderItemGrid(sauceItems, sauces, (item) => toggleSelection(item, sauces, setSauces, 2))}
          </>
        )}

        {/* STEP 4: Toppings */}
        {step === 'toppings' && (
          <>
            <p className="text-xs text-zinc-500 mb-3">Ajoutez des garnitures (optionnel)</p>
            {renderItemGrid(toppingItems, toppings, (item) => toggleSelection(item, toppings, setToppings, 10))}
          </>
        )}

        {/* STEP 5: Summary */}
        {step === 'summary' && (
          <div className="space-y-3 mt-2">
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-2">
              <div className="flex justify-between">
                <span className="text-white font-medium">🥖🍟 Pain + Frites</span>
                <span className="text-amber-400">{formatPrice(BASE_PRICE)} €</span>
              </div>
              <p className="text-xs text-zinc-500 ml-6">
                {withSalt ? 'Avec sel' : 'Sans sel'}{withSpice ? ', épicées' : ''}
              </p>
              {meats.length > 0 && <div className="border-t border-zinc-800/50 pt-1 mt-1" />}
              {meats.map((m) => (
                <div key={m.id} className="flex justify-between text-sm">
                  <span className="text-zinc-300">+ {getItemName(m.id, m.name)}</span>
                  <span className="text-zinc-400">+{formatPrice(m.price || 0)} €</span>
                </div>
              ))}
              {sauces.length > 0 && <div className="border-t border-zinc-800/50 pt-1 mt-1" />}
              {sauces.map((s) => (
                <div key={s.id} className="flex justify-between text-sm">
                  <span className="text-zinc-300">+ {getItemName(s.id, s.name)}</span>
                  <span className="text-zinc-400">+{formatPrice(s.price || 0)} €</span>
                </div>
              ))}
              {toppings.length > 0 && <div className="border-t border-zinc-800/50 pt-1 mt-1" />}
              {toppings.map((tp) => (
                <div key={tp.id} className="flex justify-between text-sm">
                  <span className="text-zinc-300">+ {getItemName(tp.id, tp.name)}</span>
                  <span className="text-zinc-400">+{formatPrice(tp.price || 0)} €</span>
                </div>
              ))}
              <div className="border-t border-zinc-700 pt-2 mt-2 flex justify-between">
                <span className="text-white font-bold">Total</span>
                <span className="text-amber-400 font-bold text-lg">{formatPrice(totalPrice())} €</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="sticky bottom-0 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/50 px-4 py-3">
        <div className="flex gap-3 max-w-lg mx-auto">
          {stepIndex > 0 && (
            <button onClick={prevStep}
              className="px-4 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-medium text-sm flex-1">
              ← Précédent
            </button>
          )}
          {step === 'summary' ? (
            <button onClick={handleAddToCart}
              className="px-4 py-3 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm flex-1 active:scale-[0.97]">
              Ajouter au panier — {formatPrice(totalPrice())} €
            </button>
          ) : (
            <button onClick={nextStep}
              className="px-4 py-3 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm flex-1 active:scale-[0.97]">
              {step === 'frites' ? 'Choisir les viandes →' : step === 'meat' ? 'Choisir les sauces →' : step === 'sauce' ? 'Ajouter des garnitures →' : 'Voir le récapitulatif →'}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
