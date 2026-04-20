'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/contexts/TenantContext';
import { useLocation } from '@/contexts/LocationContext';
import { api } from '@/lib/api';
import ImageUpload from '@/components/admin/ImageUpload';
import { getCloudinaryUrl } from '@/lib/cloudinaryUrl';
import MenuExistsModal from '@/components/MenuExistsModal';

// ─── Restaurant type templates ───

type Template = {
  categories: { slug: string; name: string; icon: string; products: { name: string; price: number }[] }[];
};

const TEMPLATES: Record<string, Template> = {
  friterie: {
    categories: [
      {
        slug: 'plats', name: 'Plats principaux', icon: '🍟',
        products: [
          { name: 'Mitraillette poulet', price: 7.50 },
          { name: 'Mitraillette boulette', price: 7.00 },
          { name: 'Fricadelle sauce', price: 4.50 },
          { name: 'Frite spéciale', price: 5.50 },
          { name: 'Merguez frites', price: 6.00 },
        ],
      },
      {
        slug: 'accompagnements', name: 'Accompagnements', icon: '🥗',
        products: [
          { name: 'Portion de frites', price: 2.50 },
          { name: 'Croquettes (6 pièces)', price: 3.50 },
          { name: 'Salade composée', price: 3.00 },
        ],
      },
      {
        slug: 'boissons', name: 'Boissons', icon: '🥤',
        products: [
          { name: 'Coca-Cola 33cl', price: 2.00 },
          { name: 'Eau minérale 50cl', price: 1.50 },
          { name: 'Jus de fruits', price: 2.00 },
        ],
      },
    ],
  },
  pizzeria: {
    categories: [
      {
        slug: 'pizzas', name: 'Pizzas', icon: '🍕',
        products: [
          { name: 'Margherita', price: 10.00 },
          { name: 'Regina', price: 12.00 },
          { name: 'Quattro stagioni', price: 13.00 },
          { name: '4 fromages', price: 13.50 },
          { name: 'Napolitaine', price: 11.50 },
          { name: 'Calzone', price: 12.50 },
        ],
      },
      {
        slug: 'entrees', name: 'Entrées', icon: '🥗',
        products: [
          { name: 'Bruschetta', price: 5.50 },
          { name: 'Burrata', price: 8.00 },
          { name: 'Salade César', price: 9.00 },
        ],
      },
      {
        slug: 'boissons', name: 'Boissons', icon: '🥤',
        products: [
          { name: 'Coca-Cola', price: 2.50 },
          { name: 'Eau pétillante', price: 3.00 },
          { name: 'Bière pression', price: 3.50 },
        ],
      },
    ],
  },
  burger: {
    categories: [
      {
        slug: 'burgers', name: 'Burgers', icon: '🍔',
        products: [
          { name: 'Classic Burger', price: 8.50 },
          { name: 'Double Smash', price: 11.00 },
          { name: 'Chicken Burger', price: 9.00 },
          { name: 'BBQ Bacon', price: 10.50 },
          { name: 'Veggie Burger', price: 9.00 },
        ],
      },
      {
        slug: 'menus', name: 'Menus', icon: '🍟',
        products: [
          { name: 'Menu Classic', price: 12.50 },
          { name: 'Menu Double', price: 15.00 },
        ],
      },
      {
        slug: 'boissons', name: 'Boissons', icon: '🥤',
        products: [
          { name: 'Coca-Cola', price: 2.50 },
          { name: 'Milkshake', price: 4.00 },
          { name: 'Eau', price: 1.50 },
        ],
      },
    ],
  },
  classique: {
    categories: [
      {
        slug: 'entrees', name: 'Entrées', icon: '🥗',
        products: [
          { name: 'Soupe du jour', price: 6.00 },
          { name: 'Crevettes grises', price: 9.50 },
          { name: 'Carpaccio de bœuf', price: 12.00 },
        ],
      },
      {
        slug: 'plats', name: 'Plats', icon: '🍽️',
        products: [
          { name: 'Steak-frites', price: 18.00 },
          { name: 'Filet de saumon', price: 19.50 },
          { name: 'Poulet rôti', price: 16.00 },
          { name: 'Pâtes carbonara', price: 14.00 },
          { name: 'Plat végétarien', price: 15.00 },
        ],
      },
      {
        slug: 'desserts', name: 'Desserts', icon: '🍰',
        products: [
          { name: 'Moelleux au chocolat', price: 7.00 },
          { name: 'Crème brûlée', price: 6.50 },
          { name: 'Tiramisu', price: 6.00 },
        ],
      },
      {
        slug: 'boissons', name: 'Boissons', icon: '🥤',
        products: [
          { name: 'Eau minérale', price: 4.00 },
          { name: 'Café', price: 2.50 },
          { name: 'Verre de vin', price: 5.00 },
        ],
      },
    ],
  },
  snack: {
    categories: [
      {
        slug: 'sandwichs', name: 'Sandwichs & Wraps', icon: '🌯',
        products: [
          { name: 'Wrap poulet', price: 7.50 },
          { name: 'Panini jambon', price: 5.50 },
          { name: 'Club sandwich', price: 8.00 },
          { name: 'Kebab', price: 6.50 },
          { name: 'Bagel saumon', price: 8.50 },
        ],
      },
      {
        slug: 'snacks', name: 'Snacks', icon: '🍟',
        products: [
          { name: 'Nems (4 pièces)', price: 4.00 },
          { name: 'Samoussas (3 pièces)', price: 3.50 },
          { name: 'Frites maison', price: 3.00 },
        ],
      },
      {
        slug: 'boissons', name: 'Boissons', icon: '🥤',
        products: [
          { name: 'Sodas', price: 2.00 },
          { name: 'Jus de fruits', price: 2.50 },
          { name: 'Café', price: 1.80 },
        ],
      },
    ],
  },
  boulangerie: {
    categories: [
      {
        slug: 'viennoiseries', name: 'Viennoiseries', icon: '🥐',
        products: [
          { name: 'Croissant', price: 1.40 },
          { name: 'Pain au chocolat', price: 1.60 },
          { name: 'Chausson aux pommes', price: 1.80 },
          { name: 'Brioche', price: 2.00 },
        ],
      },
      {
        slug: 'sandwichs', name: 'Sandwichs', icon: '🥖',
        products: [
          { name: 'Jambon-beurre', price: 4.50 },
          { name: 'Poulet-crudités', price: 5.00 },
          { name: 'Wrap caprese', price: 5.50 },
        ],
      },
      {
        slug: 'patisseries', name: 'Pâtisseries', icon: '🍰',
        products: [
          { name: 'Éclair au chocolat', price: 3.20 },
          { name: 'Tarte aux fruits', price: 3.50 },
          { name: 'Millefeuille', price: 3.80 },
        ],
      },
      {
        slug: 'boissons', name: 'Boissons', icon: '☕',
        products: [
          { name: 'Café', price: 1.60 },
          { name: 'Thé', price: 1.80 },
          { name: 'Chocolat chaud', price: 2.20 },
        ],
      },
    ],
  },
  autre: {
    categories: [
      {
        slug: 'plats', name: 'Plats principaux', icon: '🍽️',
        products: [
          { name: 'Plat du jour', price: 12.00 },
          { name: 'Formule midi', price: 15.00 },
          { name: 'Spécialité maison', price: 14.00 },
        ],
      },
      {
        slug: 'boissons', name: 'Boissons', icon: '🥤',
        products: [
          { name: 'Eau', price: 1.50 },
          { name: 'Café', price: 2.00 },
          { name: 'Soda', price: 2.50 },
        ],
      },
    ],
  },
};

const RESTAURANT_TYPES = [
  { key: 'friterie', label: 'Friterie', icon: '🍟' },
  { key: 'pizzeria', label: 'Pizzeria', icon: '🍕' },
  { key: 'burger', label: 'Burger', icon: '🍔' },
  { key: 'classique', label: 'Restaurant classique', icon: '🍽️' },
  { key: 'snack', label: 'Snack / Fast food', icon: '🌯' },
  { key: 'boulangerie', label: 'Boulangerie', icon: '🥐' },
  { key: 'autre', label: 'Autre', icon: '✏️' },
];

// Palette presets shown as swatch chips in step 1.
const COLOR_PRESETS = [
  { key: 'amber',   label: 'Amber',   value: '#F59E0B' },
  { key: 'violet',  label: 'Violet',  value: '#9f32fd' },
  { key: 'emerald', label: 'Vert',    value: '#10B981' },
  { key: 'slate',   label: 'Neutre',  value: '#1A1A1A' },
];

// 3-step onboarding wizard. Only step 1 is strictly required (restaurant name).
// Steps 2 and 3 are skippable — we still mark the tenant as onboarded so the
// redirect doesn't bring them back to this page forever. A banner on the
// dashboard signals skipped steps to encourage completion later.

type Hours = Record<number, { open: string; close: string; closed: boolean }>;
const DEFAULT_HOURS: Hours = {
  0: { open: '11:00', close: '22:00', closed: false },
  1: { open: '11:00', close: '22:00', closed: false },
  2: { open: '11:00', close: '22:00', closed: false },
  3: { open: '11:00', close: '22:00', closed: false },
  4: { open: '11:00', close: '22:00', closed: false },
  5: { open: '11:00', close: '23:00', closed: false },
  6: { open: '11:00', close: '23:00', closed: false },
};
const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function WelcomePage() {
  const router = useRouter();
  const { tenant } = useTenant();
  const { locationId } = useLocation();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1 — identity
  const [brandName, setBrandName] = useState(tenant?.name || '');
  const [tagline, setTagline] = useState('');
  const [logoPublicId, setLogoPublicId] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string>('#F59E0B');

  // Step 2 — menu
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Step 3 — hours + service modes
  const [hours, setHours] = useState<Hours>(DEFAULT_HOURS);
  const [pickup, setPickup] = useState(true);
  const [delivery, setDelivery] = useState(true);
  const [dineIn, setDineIn] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skippedMenu, setSkippedMenu] = useState(false);
  const [skippedHours, setSkippedHours] = useState(false);
  const [existingMenuInfo, setExistingMenuInfo] = useState<{
    categoryCount: number;
    productCount: number;
    modifierGroupCount: number;
  } | null>(null);

  const template = selectedType ? TEMPLATES[selectedType] : null;

  const saveBranding = async () => {
    if (!tenant?.id) return;
    const brandingJson = JSON.stringify({
      ...(tenant.branding || {}),
      brandName: brandName.trim() || tenant.name,
      tagline: tagline.trim() || undefined,
      logoUrl: logoPublicId || tenant.branding?.logoUrl,
      primaryColor,
    });
    await api.post('/organizations', { action: 'update', id: tenant.id, brandingJson });
  };

  // Menu seeding — see /api/onboarding/menu. The wizard checks status first
  // so it can surface an explicit "menu already exists" modal rather than
  // silently duplicating or erroring at P2002 on the unique (locationId, slug).
  const fetchMenuStatus = async () => {
    if (!locationId) throw new Error('no_location');
    const res = await fetch(`/api/onboarding/menu?locationId=${encodeURIComponent(locationId)}`);
    if (!res.ok) throw new Error('status_check_failed');
    return res.json() as Promise<{
      hasMenu: boolean;
      categoryCount: number;
      productCount: number;
      modifierGroupCount: number;
    }>;
  };

  const submitMenu = async (mode: 'create' | 'replace' | 'skip') => {
    const res = await fetch('/api/onboarding/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId, template, mode }),
    });
    if (res.status === 409) {
      // Race: menu appeared between status check and create. Re-open the modal.
      const status = await fetchMenuStatus();
      setExistingMenuInfo({
        categoryCount: status.categoryCount,
        productCount: status.productCount,
        modifierGroupCount: status.modifierGroupCount,
      });
      throw new Error('menu_already_exists');
    }
    if (!res.ok) throw new Error('submit_failed');
    return res.json();
  };

  const handleReplace = async () => {
    setBusy(true); setError(null);
    try {
      await submitMenu('replace');
      setExistingMenuInfo(null);
      setStep(3);
    } catch (e: any) {
      if (e?.message !== 'menu_already_exists') {
        setError('Impossible de remplacer le menu. Réessayez.');
      }
    }
    setBusy(false);
  };

  const handleKeep = async () => {
    setBusy(true); setError(null);
    try {
      await submitMenu('skip');
      setSkippedMenu(true);
      setExistingMenuInfo(null);
      setStep(3);
    } catch (e: any) {
      setError('Erreur. Réessayez.');
    }
    setBusy(false);
  };

  const handleCancelModal = () => {
    if (busy) return; // don't allow dismissal mid-request
    setExistingMenuInfo(null);
  };

  const saveHoursAndModes = async () => {
    const settings = {
      hours: Object.entries(hours).map(([day, h]) => ({ day: Number(day), open: h.open, close: h.close, closed: h.closed })),
      acceptPickup: pickup,
      acceptDelivery: delivery,
      acceptDineIn: dineIn,
    };
    try { await api.post('/settings', { action: 'update', settings }); } catch { /* settings endpoint may swallow unknown fields — not critical */ }
    // Service modes → organization modules
    if (tenant?.id) {
      const next = { ...(tenant.modules || {}), delivery };
      await api.post('/organizations', { action: 'update', id: tenant.id, modulesJson: JSON.stringify(next) });
    }
  };

  const markOnboarded = async () => {
    if (!tenant?.id) return;
    await api.post('/organizations', { action: 'update', id: tenant.id, onboarded: true });
  };

  const goToStep2 = async () => {
    if (!brandName.trim()) { setError('Le nom du restaurant est obligatoire.'); return; }
    setError(null); setBusy(true);
    try { await saveBranding(); setStep(2); }
    catch (e: any) { setError('Impossible de sauvegarder. Réessayez.'); }
    setBusy(false);
  };

  const goToStep3 = async (skip = false) => {
    setError(null); setBusy(true);
    try {
      if (skip) {
        // Pre-fix behaviour preserved: "Plus tard" is a pure client-side skip.
        // No server call — the wizard just advances with skippedMenu=true.
        setSkippedMenu(true);
        setStep(3);
        setBusy(false);
        return;
      }
      if (!template) {
        // Should not happen (button is disabled) but be defensive.
        setStep(3);
        setBusy(false);
        return;
      }
      const status = await fetchMenuStatus();
      if (status.hasMenu) {
        // Branch into the modal — do NOT advance. handleReplace / handleKeep
        // will bump setStep(3) after user decides.
        setExistingMenuInfo({
          categoryCount: status.categoryCount,
          productCount: status.productCount,
          modifierGroupCount: status.modifierGroupCount,
        });
        setBusy(false);
        return;
      }
      await submitMenu('create');
      setStep(3);
    } catch (e: any) {
      if (e?.message !== 'menu_already_exists') {
        setError('Impossible de créer le menu. Réessayez.');
      }
    }
    setBusy(false);
  };

  const finish = async (skip = false) => {
    setError(null); setBusy(true);
    try {
      if (!skip) await saveHoursAndModes();
      if (skip) setSkippedHours(true);
      await markOnboarded();
      setStep(4);
    } catch (e: any) { setError('Impossible de finaliser. Réessayez.'); }
    setBusy(false);
  };

  const StepHeader = ({ n }: { n: number }) => (
    <div className="flex items-center gap-2 mb-6 text-[11px] font-semibold tracking-[0.15em] uppercase text-zinc-500">
      <span className="text-brand-light">{String(n).padStart(2, '0')}</span>
      <span>·</span>
      <span>Étape {n} sur 3</span>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">

      {/* ─── Step 1 — Identity ─── */}
      {step === 1 && (
        <div className="space-y-6">
          <StepHeader n={1} />
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Votre identité</h1>
            <p className="text-sm text-zinc-500">Logo, nom, tagline, couleur. Ce que verront vos clients en premier.</p>
          </div>

          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-5">
            <div>
              <label className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase mb-2 block">Logo (optionnel)</label>
              <ImageUpload kind="categories" value={logoPublicId} onChange={setLogoPublicId} />
            </div>
            <div>
              <label className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase mb-2 block">Nom du restaurant *</label>
              <input value={brandName} onChange={(e) => setBrandName(e.target.value)}
                placeholder="ex : Bistrot du Coin"
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-brand/50" />
            </div>
            <div>
              <label className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase mb-2 block">Tagline (optionnel)</label>
              <input value={tagline} onChange={(e) => setTagline(e.target.value)}
                placeholder="ex : Cuisine maison · Bruxelles"
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-brand/50" />
            </div>
            <div>
              <label className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase mb-2 block">Couleur d'accent</label>
              <div className="flex gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button key={c.key} type="button" onClick={() => setPrimaryColor(c.value)}
                    className={`w-10 h-10 rounded-full ring-2 ring-offset-2 ring-offset-zinc-900 transition-all ${primaryColor === c.value ? 'ring-white' : 'ring-transparent hover:ring-zinc-600'}`}
                    style={{ background: c.value }}
                    aria-label={c.label} />
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-5 text-center">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">Aperçu côté client</p>
            {logoPublicId ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={getCloudinaryUrl(logoPublicId, 'admin-preview') || ''} alt={brandName} className="h-14 w-14 mx-auto rounded-full object-cover mb-3" />
            ) : (
              <div className="h-14 w-14 mx-auto rounded-full mb-3 flex items-center justify-center text-white font-bold text-[20px]" style={{ background: primaryColor }}>
                {(brandName.trim() || 'R').charAt(0).toUpperCase()}
              </div>
            )}
            <p className="text-lg font-extrabold text-white tracking-tight">{brandName.trim() || 'Votre restaurant'}</p>
            {tagline && <p className="text-xs text-zinc-500 mt-1">{tagline}</p>}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button onClick={goToStep2} disabled={busy || !brandName.trim()}
            className="w-full py-3.5 rounded-xl bg-brand text-zinc-950 font-bold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform">
            {busy ? 'Enregistrement…' : 'Suivant →'}
          </button>
        </div>
      )}

      {/* ─── Step 2 — Menu ─── */}
      {step === 2 && (
        <div className="space-y-6">
          <StepHeader n={2} />
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Votre menu</h1>
            <p className="text-sm text-zinc-500">
              Choisissez un modèle adapté à votre type de restaurant. Vous pourrez modifier ou ajouter des produits ensuite.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {RESTAURANT_TYPES.filter((t) => TEMPLATES[t.key]).map((type) => {
              const selected = selectedType === type.key;
              return (
                <button key={type.key} onClick={() => setSelectedType(type.key)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    selected ? 'bg-brand/10 border-brand/50 ring-1 ring-brand/40' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                  }`}>
                  <span className="text-3xl">{type.icon}</span>
                  <span className="text-sm font-medium text-white text-center">{type.label}</span>
                </button>
              );
            })}
          </div>

          {template && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                {template.categories.length} catégories · {template.categories.reduce((s, c) => s + c.products.length, 0)} produits
              </p>
              {template.categories.map((cat, ci) => (
                <div key={ci}>
                  <p className="text-sm font-semibold text-white mb-1.5">{cat.icon} {cat.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.products.slice(0, 6).map((p, pi) => (
                      <span key={pi} className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300">{p.name} · {p.price.toFixed(2)} €</span>
                    ))}
                    {cat.products.length > 6 && <span className="text-xs px-2.5 py-1 text-zinc-500">+{cat.products.length - 6}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="space-y-2">
            <button onClick={() => goToStep3(false)} disabled={!selectedType || busy}
              className="w-full py-3.5 rounded-xl bg-brand text-zinc-950 font-bold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform">
              {busy ? 'Création en cours…' : 'Créer mon menu et continuer →'}
            </button>
            <button onClick={() => goToStep3(true)} disabled={busy}
              className="w-full py-2.5 text-xs text-zinc-500 hover:text-zinc-300">
              Plus tard — je configurerai mon menu manuellement
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 3 — Hours + service modes ─── */}
      {step === 3 && (
        <div className="space-y-6">
          <StepHeader n={3} />
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Horaires et service</h1>
            <p className="text-sm text-zinc-500">Quand êtes-vous ouvert, et comment vos clients peuvent-ils commander ?</p>
          </div>

          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-2">
            {DAYS.map((label, day) => {
              const h = hours[day];
              return (
                <div key={day} className="grid grid-cols-[60px_auto_1fr] items-center gap-3">
                  <span className="text-sm font-medium text-zinc-300">{label}</span>
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input type="checkbox" checked={!h.closed}
                      onChange={(e) => setHours({ ...hours, [day]: { ...h, closed: !e.target.checked } })}
                      className="accent-brand" />
                    Ouvert
                  </label>
                  <div className="flex gap-2 items-center">
                    <input type="time" value={h.open} disabled={h.closed}
                      onChange={(e) => setHours({ ...hours, [day]: { ...h, open: e.target.value } })}
                      className="px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-white disabled:opacity-40" />
                    <span className="text-zinc-600">—</span>
                    <input type="time" value={h.close} disabled={h.closed}
                      onChange={(e) => setHours({ ...hours, [day]: { ...h, close: e.target.value } })}
                      className="px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-white disabled:opacity-40" />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
            <p className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase mb-3">Modes de service acceptés</p>
            <div className="space-y-2">
              {[
                { key: 'pickup', label: '🏪 Retrait en magasin', v: pickup, set: setPickup },
                { key: 'delivery', label: '🛵 Livraison', v: delivery, set: setDelivery },
                { key: 'dinein', label: '🍽️ Sur place', v: dineIn, set: setDineIn },
              ].map((m) => (
                <label key={m.key} className="flex items-center gap-3 text-sm text-white cursor-pointer">
                  <input type="checkbox" checked={m.v} onChange={(e) => m.set(e.target.checked)} className="accent-brand w-4 h-4" />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="space-y-2">
            <button onClick={() => finish(false)} disabled={busy}
              className="w-full py-3.5 rounded-xl bg-brand text-zinc-950 font-bold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform">
              {busy ? 'Finalisation…' : 'Terminer →'}
            </button>
            <button onClick={() => finish(true)} disabled={busy}
              className="w-full py-2.5 text-xs text-zinc-500 hover:text-zinc-300">
              Plus tard — je configurerai horaires et modes depuis les paramètres
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 4 — Done ─── */}
      {step === 4 && (
        <div className="space-y-6 text-center py-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-3xl mx-auto">🎉</div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Votre restaurant est en ligne.</h1>
            <p className="text-sm text-zinc-500 max-w-sm mx-auto">
              {skippedMenu || skippedHours
                ? 'Il reste quelques étapes — vous les retrouverez sur le dashboard.'
                : 'Vous pouvez dès maintenant recevoir des commandes.'}
            </p>
          </div>
          <div className="space-y-3">
            <button onClick={() => router.push('/admin')}
              className="w-full py-3.5 rounded-xl bg-brand text-zinc-950 font-bold text-sm active:scale-[0.98] transition-transform">
              Voir mon dashboard
            </button>
            <button onClick={() => router.push('/')}
              className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300">
              Voir mon site client →
            </button>
          </div>
        </div>
      )}

      {existingMenuInfo && (
        <MenuExistsModal
          existingInfo={existingMenuInfo}
          onReplace={handleReplace}
          onKeep={handleKeep}
          onCancel={handleCancelModal}
          busy={busy}
        />
      )}
    </div>
  );
}
