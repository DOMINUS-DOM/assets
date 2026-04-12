'use client';

import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { MenuItem } from '@/types';
import { CartExtra } from '@/types/order';
import { formatPrice } from '@/utils/format';
import { menuStore } from '@/stores/menuStore';

type MagicStep = 'snack' | 'frites' | 'sauce' | 'boisson' | 'jouet' | 'summary';

const MAGIC_BOX_STEPS: MagicStep[] = ['snack', 'frites', 'sauce', 'boisson', 'jouet', 'summary'];
// Options loaded inside component to access i18n
function getMagicBoxOptions(t: any) {
  return {
    snacks: [
      { id: 'fricadelle', name: t?.ui?.mb_fricadelle || 'Fricadelle', emoji: '🌭' },
      { id: 'hamburger', name: t?.ui?.mb_hamburger || 'Hamburger', emoji: '🍔' },
    ],
    boissons: [
      { id: 'capri_sun', name: t?.ui?.mb_capriSun || 'Capri-Sun', emoji: '🧃' },
      { id: 'eau_plate', name: t?.ui?.mb_eauPlate || 'Eau plate', emoji: '💧' },
    ],
    jouets: [
      { id: 'fille', name: t?.ui?.mb_toyGirl || 'Jouet fille', emoji: '👧' },
      { id: 'garcon', name: t?.ui?.mb_toyBoy || 'Jouet gar\u00e7on', emoji: '👦' },
    ],
  };
}

interface Props {
  item: MenuItem;
  isExtra: boolean;
  onClose: () => void;
  onAdd: (item: { menuItemId: string; name: string; price: number; categoryId: string; extras?: CartExtra[] }) => void;
}

export default function MagicBoxBuilder({ item, isExtra, onClose, onAdd }: Props) {
  const { t, getItemName } = useLanguage();
  const { snacks: MAGIC_BOX_SNACKS, boissons: BOISSONS, jouets: JOUETS } = getMagicBoxOptions(t);

  const [step, setStep] = useState<MagicStep>('snack');
  const [snack, setSnack] = useState<string | null>(null);
  const [withSalt, setWithSalt] = useState(true);
  const [withSpice, setWithSpice] = useState(false);
  const [sauce, setSauce] = useState<MenuItem | null>(null);
  const [boisson, setBoisson] = useState<string | null>(null);
  const [jouet, setJouet] = useState<string | null>(null);

  // For Extra: show full viandes list
  const meatItems = menuStore.getCategories().find((c) => c.id === 'viandes')?.items.filter((i) => !i.unavailable) || [];
  const sauceItems = menuStore.getCategories().find((c) => c.id === 'sauces')?.items.filter((i) => !i.unavailable) || [];

  const stepIndex = MAGIC_BOX_STEPS.indexOf(step);
  const basePrice = item.price || 0;

  const snackChoices = isExtra ? meatItems : MAGIC_BOX_SNACKS;

  const nextStep = () => {
    const idx = MAGIC_BOX_STEPS.indexOf(step);
    if (idx < MAGIC_BOX_STEPS.length - 1) setStep(MAGIC_BOX_STEPS[idx + 1]);
  };
  const prevStep = () => {
    const idx = MAGIC_BOX_STEPS.indexOf(step);
    if (idx > 0) setStep(MAGIC_BOX_STEPS[idx - 1]);
  };

  const canNext = () => {
    if (step === 'snack') return !!snack;
    if (step === 'sauce') return !!sauce;
    if (step === 'boisson') return !!boisson;
    if (step === 'jouet') return !!jouet;
    return true;
  };

  const handleAddToCart = () => {
    const extras: CartExtra[] = [];
    const snackName = isExtra
      ? (meatItems.find((m) => m.id === snack)?.name || snack || '')
      : (MAGIC_BOX_SNACKS.find((s) => s.id === snack)?.name || '');
    extras.push({ name: snackName, price: 0 });
    extras.push({ name: `Frites ${withSalt ? (t.ui.bld_withSalt || 'avec sel') : (t.ui.bld_noSalt || 'sans sel')}${withSpice ? `, ${t.ui.bld_spicy || '\u00e9pic\u00e9es'}` : ''}`, price: 0 });
    if (sauce) extras.push({ name: getItemName(sauce.id, sauce.name), price: 0 });
    const boissonName = BOISSONS.find((b) => b.id === boisson)?.name || '';
    extras.push({ name: boissonName, price: 0 });
    const jouetName = JOUETS.find((j) => j.id === jouet)?.name || '';
    extras.push({ name: jouetName, price: 0 });

    onAdd({
      menuItemId: `${item.id}_${Date.now()}`,
      name: getItemName(item.id, item.name),
      price: basePrice,
      categoryId: 'magic_box',
      extras,
    });
    onClose();
  };

  const ToggleBtn = ({ label, active, onToggle, emoji }: { label: string; active: boolean; onToggle: () => void; emoji?: string }) => (
    <button onClick={onToggle}
      className={`flex-1 p-4 rounded-xl border text-center transition-all active:scale-[0.97] ${
        active ? 'bg-amber-500/15 border-amber-500/50 text-amber-400 font-bold' : 'bg-zinc-900 border-zinc-800/50 text-zinc-400'
      }`}>
      {emoji && <span className="text-2xl block mb-1">{emoji}</span>}
      <span className="text-sm">{label}</span>
      {active && <span className="block text-xs mt-0.5">✓</span>}
    </button>
  );

  const STEP_LABELS: Record<MagicStep, string> = {
    snack: t.ui.bld_mb_snack || 'Choisis ton snack',
    frites: t.ui.bld_mb_frites || 'Tes frites',
    sauce: t.ui.bld_mb_sauce || 'Ta sauce',
    boisson: t.ui.bld_mb_drink || 'Ta boisson',
    jouet: t.ui.bld_mb_toy || 'Ton jouet',
    summary: t.ui.bld_summary || 'R\u00e9capitulatif',
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50 px-4 py-3 z-10">
        <div className="flex items-center justify-between max-w-lg lg:max-w-2xl mx-auto">
          <button onClick={onClose} className="text-zinc-400 text-sm">\u2190 {t.ui.bld_back}</button>
          <h1 className="text-sm font-bold text-white">🎁 {getItemName(item.id, item.name)}</h1>
          <span className="text-xs text-amber-400 font-bold">{formatPrice(basePrice)} €</span>
        </div>
        <div className="flex gap-1 mt-2 max-w-lg lg:max-w-2xl mx-auto">
          {MAGIC_BOX_STEPS.map((s, i) => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${
              i <= stepIndex ? 'bg-amber-500' : 'bg-zinc-800'
            }`} />
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 max-w-lg lg:max-w-2xl mx-auto w-full">
        <h2 className="text-lg font-bold text-white mb-1">
          {stepIndex + 1}. {STEP_LABELS[step]}
        </h2>

        {/* STEP 1: Snack */}
        {step === 'snack' && !isExtra && (
          <div className="flex gap-3 mt-3">
            {MAGIC_BOX_SNACKS.map((s) => (
              <ToggleBtn key={s.id} label={s.name} emoji={s.emoji}
                active={snack === s.id} onToggle={() => setSnack(s.id)} />
            ))}
          </div>
        )}

        {step === 'snack' && isExtra && (
          <>
            <p className="text-xs text-zinc-500 mb-3">{t.ui.bld_mb_chooseFromMenu}</p>
            <div className="grid grid-cols-2 gap-2 pb-4">
              {meatItems.map((m) => (
                <button key={m.id} onClick={() => setSnack(m.id)}
                  className={`p-3 rounded-xl border text-left transition-all active:scale-[0.97] ${
                    snack === m.id
                      ? 'bg-amber-500/15 border-amber-500/50 ring-1 ring-amber-500/30'
                      : 'bg-zinc-900 border-zinc-800/50 hover:border-zinc-700'
                  }`}>
                  <p className={`text-sm font-medium ${snack === m.id ? 'text-amber-400' : 'text-white'}`}>
                    {getItemName(m.id, m.name)}
                  </p>
                  {snack === m.id && <span className="text-amber-400 text-xs">✓</span>}
                </button>
              ))}
            </div>
          </>
        )}

        {/* STEP 2: Frites */}
        {step === 'frites' && (
          <div className="space-y-4 mt-3">
            <div className="flex gap-3">
              <ToggleBtn label="Avec sel" active={withSalt} onToggle={() => setWithSalt(!withSalt)} />
              <ToggleBtn label="Épicées" active={withSpice} onToggle={() => setWithSpice(!withSpice)} />
            </div>
          </div>
        )}

        {/* STEP 3: Sauce (1 seule) */}
        {step === 'sauce' && (
          <>
            <p className="text-xs text-zinc-500 mb-3">{t.ui.bld_mb_chooseSauce}</p>
            <div className="grid grid-cols-2 gap-2 pb-4">
              {sauceItems.map((s) => (
                <button key={s.id} onClick={() => setSauce(s)}
                  className={`p-3 rounded-xl border text-left transition-all active:scale-[0.97] ${
                    sauce?.id === s.id
                      ? 'bg-amber-500/15 border-amber-500/50 ring-1 ring-amber-500/30'
                      : 'bg-zinc-900 border-zinc-800/50 hover:border-zinc-700'
                  }`}>
                  <p className={`text-sm font-medium ${sauce?.id === s.id ? 'text-amber-400' : 'text-white'}`}>
                    {getItemName(s.id, s.name)}
                  </p>
                  {sauce?.id === s.id && <span className="text-amber-400 text-xs">✓</span>}
                </button>
              ))}
            </div>
          </>
        )}

        {/* STEP 4: Boisson */}
        {step === 'boisson' && (
          <div className="flex gap-3 mt-3">
            {BOISSONS.map((b) => (
              <ToggleBtn key={b.id} label={b.name} emoji={b.emoji}
                active={boisson === b.id} onToggle={() => setBoisson(b.id)} />
            ))}
          </div>
        )}

        {/* STEP 5: Jouet */}
        {step === 'jouet' && (
          <div className="flex gap-3 mt-3">
            {JOUETS.map((j) => (
              <ToggleBtn key={j.id} label={j.name} emoji={j.emoji}
                active={jouet === j.id} onToggle={() => setJouet(j.id)} />
            ))}
          </div>
        )}

        {/* STEP 6: Summary */}
        {step === 'summary' && (
          <div className="mt-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-2">
            <div className="flex justify-between">
              <span className="text-white font-medium">🎁 {getItemName(item.id, item.name)}</span>
              <span className="text-amber-400 font-bold">{formatPrice(basePrice)} €</span>
            </div>
            <div className="border-t border-zinc-800 pt-2 space-y-1 text-sm">
              <p className="text-zinc-400">
                🍖 {isExtra ? (meatItems.find((m) => m.id === snack)?.name || snack) : (MAGIC_BOX_SNACKS.find((s) => s.id === snack)?.name)}
              </p>
              <p className="text-zinc-400">
                🍟 Frites {withSalt ? 'avec sel' : 'sans sel'}{withSpice ? ', épicées' : ''}
              </p>
              <p className="text-zinc-400">
                🫙 {sauce ? getItemName(sauce.id, sauce.name) : '—'}
              </p>
              <p className="text-zinc-400">
                {BOISSONS.find((b) => b.id === boisson)?.emoji} {BOISSONS.find((b) => b.id === boisson)?.name}
              </p>
              <p className="text-zinc-400">
                {JOUETS.find((j) => j.id === jouet)?.emoji} {JOUETS.find((j) => j.id === jouet)?.name}
              </p>
            </div>
            <div className="border-t border-zinc-700 pt-2 flex justify-between">
              <span className="text-white font-bold">{t.ui.bld_total}</span>
              <span className="text-amber-400 font-bold text-lg">{formatPrice(basePrice)} €</span>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="sticky bottom-0 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/50 px-4 py-3">
        <div className="flex gap-3 max-w-lg lg:max-w-2xl mx-auto">
          {stepIndex > 0 && (
            <button onClick={prevStep}
              className="px-4 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-medium text-sm flex-1">
              \u2190 {t.ui.bld_previous}
            </button>
          )}
          {step === 'summary' ? (
            <button onClick={handleAddToCart}
              className="px-4 py-3 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm flex-1 active:scale-[0.97]">
              {t.ui.bld_addToCart} — {formatPrice(basePrice)} \u20ac
            </button>
          ) : (
            <button onClick={nextStep} disabled={!canNext()}
              className="px-4 py-3 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm flex-1 active:scale-[0.97] disabled:opacity-50">
              {t.ui.bld_next} \u2192
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
