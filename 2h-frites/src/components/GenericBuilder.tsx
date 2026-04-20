'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { CartExtra } from '@/types/order';

// ─── Types ───

interface ModifierItem {
  id: string;
  name: string;
  nameKey?: string;
  price: number;
}

interface BuilderStep {
  key: string;
  label: string;
  type?: 'options';          // 'options' = toggle/fixed choices; absence = modifier_group
  options?: string[];        // for type='options'
  groupId?: string;          // for modifier_group steps
  groupName?: string;        // resolved group name
  maxSelect?: number;        // max items selectable (default 1)
  modifiers?: ModifierItem[];// resolved modifier items (inline from API)
}

interface ModifierGroupData {
  id: string;
  name: string;
  nameKey?: string;
  minSelect: number;
  maxSelect: number;
  modifiers: ModifierItem[];
}

interface BuilderProduct {
  id: string;
  name: string;
  nameKey?: string;
  price?: number | null;
  categorySlug: string;
}

export interface GenericBuilderProps {
  product: BuilderProduct;
  builderConfig?: {
    basePrice: number;
    steps: BuilderStep[];
    options?: Record<string, any>;
  } | null;
  modifierGroups?: ModifierGroupData[];  // for items without builderConfig (pains ronds)
  allowSimpleAdd?: boolean;               // show "ajouter sans extras" button
  mode?: 'fullscreen' | 'panel' | 'inline'; // inline = renders inside parent, no overlay
  // Pre-fill selections for combo mode (e.g. pain-frites classique)
  initialSelections?: Record<string, string[]>;  // stepKey → modifier nameKeys
  initialOptions?: Record<string, string[]>;     // stepKey → option keys
  initialStep?: number;                          // start at this step (e.g. summary)
  onClose: () => void;
  onAdd: (item: { menuItemId: string; name: string; price: number; categoryId: string; extras?: CartExtra[] }) => void;
}

// ─── Option labels (i18n-like) ───
const OPTION_LABELS: Record<string, { label: string; emoji: string }> = {
  salt: { label: 'Avec sel', emoji: '✓' },
  spice: { label: 'Epicees', emoji: '✗' },
  fricadelle: { label: 'Fricadelle', emoji: '🌭' },
  hamburger: { label: 'Hamburger', emoji: '🍔' },
  capri_sun: { label: 'Capri-Sun', emoji: '🧃' },
  eau_plate: { label: 'Eau plate', emoji: '💧' },
  jouet_fille: { label: 'Jouet fille', emoji: '👧' },
  jouet_garcon: { label: 'Jouet garcon', emoji: '👦' },
};

// ─── Component ───

export default function GenericBuilder({ product, builderConfig, modifierGroups, allowSimpleAdd, mode = 'fullscreen', initialSelections, initialOptions, initialStep, onClose, onAdd }: GenericBuilderProps) {
  const { t, getItemName } = useLanguage();

  // ─── Build steps ───
  const steps = useMemo(() => {
    if (builderConfig?.steps?.length) {
      return builderConfig.steps;
    }
    // Auto-generate steps from modifier groups
    if (modifierGroups?.length) {
      return modifierGroups.map((g): BuilderStep => ({
        key: g.nameKey || g.id,
        label: g.name,
        groupId: g.id,
        maxSelect: g.maxSelect,
        modifiers: g.modifiers,
      }));
    }
    return [];
  }, [builderConfig, modifierGroups]);

  const allStepKeys = useMemo(() => [...steps.map((s) => s.key), 'summary'], [steps]);

  const [currentStepIdx, setCurrentStepIdx] = useState(initialStep ?? 0);
  const currentStepKey = allStepKeys[currentStepIdx];
  const isLastStep = currentStepKey === 'summary';
  const currentStep = steps.find((s) => s.key === currentStepKey);

  // ─── Selections state (with optional pre-fill from combo) ───
  const [selections, setSelections] = useState<Record<string, ModifierItem[]>>(() => {
    if (!initialSelections) return {};
    // Resolve nameKeys to ModifierItem objects from step modifiers
    const result: Record<string, ModifierItem[]> = {};
    for (const [stepKey, nameKeys] of Object.entries(initialSelections)) {
      const step = steps.find((s) => s.key === stepKey);
      if (step?.modifiers) {
        result[stepKey] = step.modifiers.filter((m) => nameKeys.includes(m.nameKey || m.name));
      }
    }
    return result;
  });
  const [optionSelections, setOptionSelections] = useState<Record<string, string[]>>(() => {
    if (initialOptions) return { ...initialOptions };
    return {};
  });

  // ─── Base price ───
  const basePrice = builderConfig?.basePrice ?? product.price ?? 0;
  const isFixedPrice = builderConfig?.options?.isExtra === false || builderConfig?.options?.isExtra === true;
  // Magic Box: all extras are cosmetic (price 0), total = basePrice
  // Pain-frites, pains ronds: extras have real prices

  // ─── Price calculation ───
  const totalPrice = useMemo(() => {
    if (isFixedPrice) return basePrice; // Fixed-price builders (magic box)
    let total = basePrice;
    Object.values(selections).forEach((items) => {
      items.forEach((item) => { total += item.price; });
    });
    return total;
  }, [basePrice, selections, isFixedPrice]);

  // ─── Modifier group selection ───
  const toggleModifier = useCallback((stepKey: string, mod: ModifierItem, maxSelect: number) => {
    setSelections((prev) => {
      const current = prev[stepKey] || [];
      const exists = current.find((m) => m.id === mod.id);
      if (exists) {
        return { ...prev, [stepKey]: current.filter((m) => m.id !== mod.id) };
      }
      if (current.length >= maxSelect) {
        // Replace oldest if at max
        if (maxSelect === 1) return { ...prev, [stepKey]: [mod] };
        return prev; // Don't add more
      }
      return { ...prev, [stepKey]: [...current, mod] };
    });
  }, []);

  // ─── Options selection ───
  const toggleOption = useCallback((stepKey: string, option: string) => {
    setOptionSelections((prev) => {
      const current = prev[stepKey] || [];
      // For salt/spice style: toggle individually
      if (current.includes(option)) {
        return { ...prev, [stepKey]: current.filter((o) => o !== option) };
      }
      // For single-select options (snacks, boissons, jouets): replace
      const step = steps.find((s) => s.key === stepKey);
      const isSaltSpice = stepKey === 'frites';
      if (isSaltSpice) {
        return { ...prev, [stepKey]: [...current, option] };
      }
      return { ...prev, [stepKey]: [option] }; // single select
    });
  }, [steps]);

  // Init default options (salt on by default for frites step, unless already set by initialOptions)
  useEffect(() => {
    const fritesStep = steps.find((s) => s.key === 'frites' && s.type === 'options');
    if (fritesStep && builderConfig?.options?.hasSalt) {
      setOptionSelections((prev) => {
        if (prev.frites?.length) return prev; // Already set (by initialOptions or user)
        return { ...prev, frites: ['salt'] };
      });
    }
  }, [steps, builderConfig]);

  // ─── Build extras for cart ───
  const buildExtras = useCallback((): CartExtra[] => {
    const extras: CartExtra[] = [];

    for (const step of steps) {
      if (step.type === 'options') {
        // Options step: cosmetic extras
        const opts = optionSelections[step.key] || [];
        if (step.key === 'frites') {
          const withSalt = opts.includes('salt');
          const withSpice = opts.includes('spice');
          const label = `Frites ${withSalt ? (t.ui.bld_withSalt || 'avec sel') : (t.ui.bld_noSalt || 'sans sel')}${withSpice ? `, ${t.ui.bld_spicy || 'epicees'}` : ''}`;
          extras.push({ name: label, price: 0 });
        } else if (opts.length > 0) {
          const optLabel = opts.map((o) => OPTION_LABELS[o]?.label || t.ui[o] || o).join(', ');
          extras.push({ name: optLabel, price: 0 });
        }
      } else {
        // Modifier group step: real extras with prices
        const mods = selections[step.key] || [];
        for (const mod of mods) {
          extras.push({
            name: getItemName(mod.nameKey || mod.id, mod.name),
            price: isFixedPrice ? 0 : mod.price,
          });
        }
      }
    }

    return extras;
  }, [steps, optionSelections, selections, isFixedPrice, getItemName, t]);

  // ─── Add to cart ───
  const handleAdd = useCallback(() => {
    const extras = buildExtras();
    const categoryId = product.categorySlug.replace(/-/g, '_');
    onAdd({
      menuItemId: `${product.nameKey || product.id}_${Date.now()}`,
      name: getItemName(product.nameKey || product.id, product.name),
      price: totalPrice,
      categoryId,
      extras: extras.length > 0 ? extras : undefined,
    });
    onClose();
  }, [product, totalPrice, buildExtras, getItemName, onAdd, onClose]);

  // ─── Add simple (no extras) ───
  const handleAddSimple = useCallback(() => {
    const categoryId = product.categorySlug.replace(/-/g, '_');
    onAdd({
      menuItemId: product.nameKey || product.id,
      name: getItemName(product.nameKey || product.id, product.name),
      price: product.price || 0,
      categoryId,
    });
    onClose();
  }, [product, getItemName, onAdd, onClose]);

  // ─── Navigation ───
  const canGoNext = () => {
    if (isLastStep) return true;
    if (!currentStep) return true;
    if (currentStep.type === 'options') {
      // Frites step: always ok (salt has default)
      if (currentStep.key === 'frites') return true;
      // Other options: at least one selected
      return (optionSelections[currentStep.key]?.length || 0) > 0;
    }
    // Modifier group: optional
    return true;
  };

  const goNext = () => {
    if (currentStepIdx < allStepKeys.length - 1) setCurrentStepIdx(currentStepIdx + 1);
  };
  const goBack = () => {
    if (currentStepIdx > 0) setCurrentStepIdx(currentStepIdx - 1);
    else onClose();
  };

  // ─── Next step label ───
  const nextStepLabel = useMemo(() => {
    if (isLastStep) return null;
    const nextKey = allStepKeys[currentStepIdx + 1];
    if (nextKey === 'summary') return t.ui.bld_summary || 'Resume';
    const nextStep = steps.find((s) => s.key === nextKey);
    return nextStep?.label || nextKey;
  }, [currentStepIdx, allStepKeys, steps, isLastStep, t]);

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════
  const isPanel = mode === 'panel';
  const isInline = mode === 'inline';

  // Inline mode: renders directly in parent container, no overlay
  if (isInline) {
    return (
      <div className="flex flex-col h-full">
        {/* Inline header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#EDEBE7] shrink-0">
          <button onClick={goBack} className="text-brand-light text-xs font-medium">← Retour</button>
          <p className="text-xs font-bold text-[#1A1A1A] truncate mx-2">{getItemName(product.nameKey || product.id, product.name)}</p>
          <span className="text-xs font-bold text-brand-light shrink-0">{totalPrice.toFixed(2)} €</span>
        </div>

        {/* Inline progress */}
        <div className="flex gap-0.5 px-3 py-1 shrink-0">
          {allStepKeys.map((key, idx) => (
            <div key={key} className={`flex-1 h-1 rounded-full ${idx <= currentStepIdx ? 'bg-brand' : 'bg-[#F5F3EF]'}`} />
          ))}
        </div>

        {/* Inline content */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {currentStep && (
            <h3 className="text-sm font-bold text-[#1A1A1A] mb-2">{currentStepIdx + 1}. {currentStep.label}</h3>
          )}

          {/* Options: frites — compact inline */}
          {currentStep?.type === 'options' && currentStep.key === 'frites' && (
            <div className="flex gap-2 mb-1">
              {currentStep.options?.map((opt) => {
                const sel = optionSelections[currentStep.key] || [];
                const active = sel.includes(opt);
                const info = OPTION_LABELS[opt] || { label: opt, emoji: '' };
                return (
                  <button key={opt} onClick={() => toggleOption(currentStep.key, opt)}
                    className={`flex-1 py-2.5 rounded-lg border text-center text-xs font-medium active:scale-95 ${
                      active ? 'border-brand/50 bg-brand/10 text-[#1A1A1A]' : 'border-[#EDEBE7] bg-white text-[#6B6B6B]'
                    }`}>
                    {active ? '✓' : '✗'} {t.ui[`bld_${opt}`] || info.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Options: other (snacks, boissons, jouets) */}
          {currentStep?.type === 'options' && currentStep.key !== 'frites' && (
            <div className="grid grid-cols-2 gap-2">
              {currentStep.options?.map((opt) => {
                const sel = optionSelections[currentStep.key] || [];
                const active = sel.includes(opt);
                const info = OPTION_LABELS[opt] || { label: opt, emoji: '' };
                return (
                  <button key={opt} onClick={() => toggleOption(currentStep.key, opt)}
                    className={`py-4 rounded-lg border text-center text-sm font-medium active:scale-95 ${
                      active ? 'border-brand/50 bg-brand/10 text-[#1A1A1A]' : 'border-[#EDEBE7] bg-white text-[#6B6B6B]'
                    }`}>
                    <span className="text-xl block mb-1">{info.emoji}</span>
                    {t.ui[opt] || info.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Modifier group grid */}
          {currentStep && !currentStep.type && currentStep.modifiers && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {currentStep.modifiers.map((mod) => {
                const sel = selections[currentStep.key] || [];
                const active = sel.some((m) => m.id === mod.id);
                return (
                  <button key={mod.id}
                    onClick={() => toggleModifier(currentStep.key, mod, currentStep.maxSelect || 1)}
                    className={`p-2 rounded-lg border text-left text-xs active:scale-95 ${
                      active ? 'border-brand/50 bg-brand/10' : 'border-[#EDEBE7] bg-white hover:border-[#1A1A1A]/30'
                    }`}>
                    <p className="font-medium text-[#1A1A1A] truncate">{getItemName(mod.nameKey || mod.id, mod.name)}</p>
                    {mod.price > 0 && <p className="text-brand-light text-[10px]">+{mod.price.toFixed(2)} €</p>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Summary */}
          {isLastStep && (
            <div className="p-3 rounded-lg bg-[#F5F3EF]/30 border border-[#EDEBE7]/30 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-[#1A1A1A]">{getItemName(product.nameKey || product.id, product.name)}</span>
                <span className="text-brand-light font-bold">{basePrice.toFixed(2)} €</span>
              </div>
              {steps.filter((s) => s.type === 'options').map((step) => {
                const opts = optionSelections[step.key] || [];
                if (opts.length === 0) return null;
                return (
                  <div key={step.key} className="flex justify-between text-[10px] text-[#8A8A8A]">
                    <span>{opts.map((o) => OPTION_LABELS[o]?.label || o).join(', ')}</span>
                    <span>—</span>
                  </div>
                );
              })}
              {steps.filter((s) => !s.type).map((step) => {
                const mods = selections[step.key] || [];
                return mods.map((mod) => (
                  <div key={mod.id} className="flex justify-between text-xs">
                    <span className="text-[#1A1A1A]">{getItemName(mod.nameKey || mod.id, mod.name)}</span>
                    <span className={mod.price > 0 && !isFixedPrice ? 'text-brand-light' : 'text-[#8A8A8A]'}>
                      {mod.price > 0 && !isFixedPrice ? `+${mod.price.toFixed(2)} €` : '—'}
                    </span>
                  </div>
                ));
              })}
              <div className="border-t border-[#EDEBE7] pt-1.5 flex justify-between">
                <span className="text-sm font-bold text-[#1A1A1A]">Total</span>
                <span className="text-sm font-bold text-brand-light">{totalPrice.toFixed(2)} €</span>
              </div>
            </div>
          )}
        </div>

        {/* Inline footer */}
        <div className="px-3 py-2 border-t border-[#EDEBE7] space-y-1.5 shrink-0">
          {isLastStep ? (
            <button onClick={handleAdd}
              className="w-full py-3 rounded-lg bg-[#1A1A1A] text-white font-extrabold text-sm active:scale-[0.97]">
              Ajouter — {totalPrice.toFixed(2)} €
            </button>
          ) : (
            <button onClick={goNext} disabled={!canGoNext()}
              className="w-full py-3 rounded-lg bg-[#1A1A1A] text-white font-bold text-sm active:scale-[0.97] disabled:opacity-40">
              {nextStepLabel || 'Suivant'} →
            </button>
          )}
          {allowSimpleAdd && currentStepIdx === 0 && (
            <button onClick={handleAddSimple}
              className="w-full py-2 rounded-lg bg-[#F5F3EF] text-[#6B6B6B] font-medium text-xs active:scale-[0.97]">
              Ajouter sans personnalisation
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={isPanel
      ? 'fixed inset-0 z-50 flex'
      : 'fixed inset-0 z-50 bg-[#FAFAF8] flex flex-col'
    }>
      {/* Panel mode: backdrop + side panel */}
      {isPanel && <div className="flex-1 bg-black/40" onClick={onClose} />}

      <div className={isPanel
        ? 'w-[520px] bg-[#FAFAF8] border-l border-[#EDEBE7] flex flex-col h-full shadow-2xl'
        : 'flex flex-col flex-1 min-h-0'
      }>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#EDEBE7]">
        <button onClick={goBack} className="text-brand-light text-sm font-medium">
          ← {t.ui.back || 'Retour'}
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-[#1A1A1A]">
            {t.ui.bld_compose || 'Personnaliser'} {getItemName(product.nameKey || product.id, product.name)}
          </p>
        </div>
        <span className="text-sm font-bold text-brand-light">{totalPrice.toFixed(2)} €</span>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1 px-4 py-2">
        {allStepKeys.map((key, idx) => (
          <div key={key} className={`flex-1 h-1 rounded-full transition-colors ${
            idx <= currentStepIdx ? 'bg-brand' : 'bg-[#F5F3EF]'
          }`} />
        ))}
      </div>

      {/* Content — scrollable, shrinks to fit between header and footer */}
      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        {/* Step title */}
        {currentStep && (
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">
            {currentStepIdx + 1}. {currentStep.label}
          </h2>
        )}

        {/* Options step (toggles) */}
        {currentStep?.type === 'options' && currentStep.key === 'frites' && (
          <>
            <div className="p-4 rounded-xl bg-white border border-[#EDEBE7] mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🥖🍟</span>
                <div>
                  <p className="text-base font-bold text-[#1A1A1A]">{product.categorySlug === 'pain-frites' ? 'Pain + Frites' : product.name}</p>
                  <p className="text-sm text-brand-light font-bold">{basePrice.toFixed(2)} €</p>
                  <p className="text-xs text-[#8A8A8A]">{t.ui.bld_pf_baseIncl || 'Prix de base incluant le pain et les frites.'}</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-[#6B6B6B] uppercase font-bold mb-3">{t.ui.bld_pf_fritesOptions || 'OPTIONS FRITES'}</p>
            <div className="flex gap-3">
              {currentStep.options?.map((opt) => {
                const sel = optionSelections[currentStep.key] || [];
                const active = sel.includes(opt);
                const info = OPTION_LABELS[opt] || { label: opt, emoji: '' };
                return (
                  <button key={opt} onClick={() => toggleOption(currentStep.key, opt)}
                    className={`flex-1 py-6 rounded-xl border-2 text-center transition-all active:scale-95 ${
                      active ? 'border-brand/50 bg-brand/10' : 'border-[#EDEBE7] bg-white'
                    }`}>
                    <span className="text-2xl block mb-1">{active ? '✓' : '✗'}</span>
                    <span className="text-sm font-medium text-[#1A1A1A]">{t.ui[`bld_${opt}`] || info.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Options step (single select, not frites) */}
        {currentStep?.type === 'options' && currentStep.key !== 'frites' && (
          <div className="flex gap-3 flex-wrap">
            {currentStep.options?.map((opt) => {
              const sel = optionSelections[currentStep.key] || [];
              const active = sel.includes(opt);
              const info = OPTION_LABELS[opt] || { label: opt, emoji: '' };
              return (
                <button key={opt} onClick={() => toggleOption(currentStep.key, opt)}
                  className={`flex-1 min-w-[140px] py-6 rounded-xl border-2 text-center transition-all active:scale-95 ${
                    active ? 'border-brand/50 bg-brand/10' : 'border-[#EDEBE7] bg-white'
                  }`}>
                  <span className="text-3xl block mb-2">{info.emoji}</span>
                  <span className="text-sm font-medium text-[#1A1A1A]">{t.ui[opt] || info.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Modifier group step (grid) */}
        {currentStep && !currentStep.type && currentStep.modifiers && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pb-4">
            {currentStep.modifiers.map((mod) => {
              const sel = selections[currentStep.key] || [];
              const active = sel.some((m) => m.id === mod.id);
              return (
                <button key={mod.id}
                  onClick={() => toggleModifier(currentStep.key, mod, currentStep.maxSelect || 1)}
                  className={`p-3 rounded-xl border text-left transition-all active:scale-95 ${
                    active
                      ? 'border-brand/50 bg-brand/10 ring-1 ring-brand/30'
                      : 'border-[#EDEBE7] bg-white hover:border-[#1A1A1A]/30'
                  }`}>
                  <p className="text-sm font-medium text-[#1A1A1A] truncate">
                    {getItemName(mod.nameKey || mod.id, mod.name)}
                  </p>
                  {mod.price > 0 && (
                    <p className="text-xs text-brand-light mt-1">+{mod.price.toFixed(2)} €</p>
                  )}
                  {mod.price === 0 && !isFixedPrice && (
                    <p className="text-xs text-[#8A8A8A] mt-1">{t.ui.bld_included || 'Inclus'}</p>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Summary step */}
        {isLastStep && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">{t.ui.bld_summary || 'Resume'}</h2>
            <div className="p-4 rounded-xl bg-white border border-[#EDEBE7] space-y-2">
              {/* Base */}
              <div className="flex justify-between text-sm">
                <span className="text-[#1A1A1A]">{getItemName(product.nameKey || product.id, product.name)}</span>
                <span className="text-brand-light font-bold">{basePrice.toFixed(2)} €</span>
              </div>

              {/* Options selections */}
              {steps.filter((s) => s.type === 'options').map((step) => {
                const opts = optionSelections[step.key] || [];
                if (opts.length === 0) return null;
                if (step.key === 'frites') {
                  const withSalt = opts.includes('salt');
                  const withSpice = opts.includes('spice');
                  return (
                    <div key={step.key} className="flex justify-between text-sm">
                      <span className="text-[#6B6B6B]">
                        Frites {withSalt ? 'avec sel' : 'sans sel'}{withSpice ? ', epicees' : ''}
                      </span>
                      <span className="text-[#8A8A8A]">—</span>
                    </div>
                  );
                }
                return (
                  <div key={step.key} className="flex justify-between text-sm">
                    <span className="text-[#6B6B6B]">{opts.map((o) => OPTION_LABELS[o]?.label || o).join(', ')}</span>
                    <span className="text-[#8A8A8A]">—</span>
                  </div>
                );
              })}

              {/* Modifier selections */}
              {steps.filter((s) => !s.type).map((step) => {
                const mods = selections[step.key] || [];
                return mods.map((mod) => (
                  <div key={mod.id} className="flex justify-between text-sm">
                    <span className="text-[#1A1A1A]">{getItemName(mod.nameKey || mod.id, mod.name)}</span>
                    <span className={mod.price > 0 && !isFixedPrice ? 'text-brand-light' : 'text-[#8A8A8A]'}>
                      {mod.price > 0 && !isFixedPrice ? `+${mod.price.toFixed(2)} €` : '—'}
                    </span>
                  </div>
                ));
              })}

              {/* Total */}
              <div className="border-t border-[#EDEBE7] pt-2 mt-2 flex justify-between">
                <span className="text-base font-bold text-[#1A1A1A]">Total</span>
                <span className="text-base font-bold text-brand-light">{totalPrice.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer — always visible at bottom */}
      <div className="px-4 py-4 border-t border-[#EDEBE7] space-y-2 shrink-0">
        {isLastStep ? (
          <button onClick={handleAdd}
            className="w-full py-4 rounded-xl bg-[#1A1A1A] text-white font-extrabold text-lg active:scale-[0.97] transition-transform">
            {t.ui.bld_pf_addToOrder || 'Ajouter a la commande'} — {totalPrice.toFixed(2)} €
          </button>
        ) : (
          <button onClick={goNext} disabled={!canGoNext()}
            className="w-full py-4 rounded-xl bg-[#1A1A1A] text-white font-extrabold text-base active:scale-[0.97] transition-transform disabled:opacity-40">
            {nextStepLabel ? `${nextStepLabel} →` : 'Suivant →'}
          </button>
        )}

        {/* Add simple (for pains ronds) */}
        {allowSimpleAdd && currentStepIdx === 0 && (
          <button onClick={handleAddSimple}
            className="w-full py-3 rounded-xl bg-[#F5F3EF] text-[#1A1A1A] font-medium text-sm active:scale-[0.97] transition-transform">
            {t.ui.bld_addSimple || 'Ajouter sans personnalisation'}
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
