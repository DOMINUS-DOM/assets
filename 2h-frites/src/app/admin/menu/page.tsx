'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { menuApi } from '@/lib/menuApi';
import { formatPrice } from '@/utils/format';
import ImageUpload from '@/components/admin/ImageUpload';

// ─── Types ───
interface Size { id: string; sizeKey: string; price: number; sortOrder: number }
interface Modifier { id: string; name: string; nameKey?: string; price: number; active: boolean; sortOrder: number }
interface ModGroup { id: string; name: string; nameKey?: string; minSelect: number; maxSelect: number; required: boolean; sortOrder: number; modifiers: Modifier[] }
interface ProdModLink { id: string; groupId: string; sortOrder: number; group: ModGroup }
interface BuilderCfg { id: string; productId: string; basePrice: number; steps: string; options?: string }
interface Product {
  id: string; categoryId: string; name: string; nameKey?: string; descKey?: string;
  price: number | null; active: boolean; available: boolean; sortOrder: number;
  visibleOnPos: boolean; visibleOnWeb: boolean; visibleOnKiosk: boolean;
  tags: string; allergens: string; subcategory?: string; priceLabel?: string; imageUrl?: string;
  sizes: Size[]; modifierLinks: ProdModLink[]; builderConfig?: BuilderCfg;
}
interface Category {
  id: string; slug: string; nameKey: string; icon: string; imageUrl?: string | null; sortOrder: number;
  active: boolean; builder: boolean; note?: string; flatPrice?: number;
  items: Product[];
}

const TAG_OPTIONS = ['popular', 'vegetarian', 'spicy', 'new'];
const TAG_LABELS: Record<string, string> = { popular: 'Populaire', vegetarian: 'Vegetarien', spicy: 'Epice', new: 'Nouveau' };
const ALLERGEN_NAMES: Record<number, string> = {
  1: 'Gluten', 2: 'Crustaces', 3: 'Oeufs', 4: 'Poisson', 5: 'Arachides', 6: 'Soja',
  7: 'Lait', 8: 'Fruits a coque', 9: 'Celeri', 10: 'Moutarde', 11: 'Sesame', 12: 'Sulfites',
};

const ic = 'w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500/50';
const btn = 'px-3 py-2 rounded-lg text-sm font-medium transition-colors active:scale-[0.97]';
const btnPrimary = `${btn} bg-amber-500 text-zinc-950 hover:bg-amber-400`;
const btnSecondary = `${btn} bg-zinc-800 text-zinc-300 hover:bg-zinc-700`;
const btnDanger = `${btn} bg-red-500/15 text-red-400 hover:bg-red-500/25`;

export default function MenuAdminPage() {
  const { hasRole } = useAuth();
  // Roles allowed to mutate the menu — mirrors ADMIN_ROLES on the API side.
  // Before this included only patron/manager, which locked out franchise
  // owners (franchisor_admin) and multi-site managers (location_manager)
  // even though the backend accepted their requests.
  const canEdit = hasRole('patron', 'manager', 'franchisor_admin', 'location_manager');

  const [categories, setCategories] = useState<Category[]>([]);
  const [allGroups, setAllGroups] = useState<ModGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [panel, setPanel] = useState<'categories' | 'product' | 'modifiers' | 'newCategory' | 'newProduct'>('categories');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // ─── Data loading ───
  const reload = useCallback(async () => {
    try {
      const [cats, groups] = await Promise.all([
        menuApi.loadFull(),
        menuApi.listModifierGroups(),
      ]);
      setCategories(cats);
      setAllGroups(groups);
    } catch (e) { console.error('Load failed:', e); }
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const activeCat = categories.find((c) => c.id === activeCatId);
  const activeProduct = activeCat?.items.find((p) => p.id === activeProductId);

  // ─── Helpers ───
  const parseTags = (s: string): string[] => { try { return JSON.parse(s); } catch { return []; } };
  const parseAllergens = (s: string): number[] => { try { return JSON.parse(s); } catch { return []; } };

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-zinc-500 text-sm">Chargement du catalogue...</p></div>;

  // ═══════════════════════════════════════════════════════════
  // LAYOUT: 3 columns — Categories | Products | Detail Panel
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium shadow-lg animate-slide-up">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
        <h1 className="text-lg font-bold text-white">Catalogue Menu</h1>
        <div className="flex gap-2">
          <button onClick={() => setPanel('modifiers')} className={`${btnSecondary} text-xs`}>
            Modifier Groups ({allGroups.length})
          </button>
          {canEdit && (
            <>
              <a href="/admin/menu/import" className={`${btnSecondary} text-xs`}>
                📋 Coller une carte
              </a>
              <button onClick={() => setPanel('newCategory')} className={`${btnPrimary} text-xs`}>
                + Categorie
              </button>
            </>
          )}
        </div>
      </div>

      {/* Empty state — no categories yet, guide to create the first one */}
      {categories.length === 0 && panel !== 'newCategory' && panel !== 'modifiers' && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-5">
            <p className="text-5xl">🍽️</p>
            <h2 className="text-xl font-bold text-white">Votre menu est vide</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Créez votre première catégorie (entrées, plats, boissons…) pour commencer à ajouter des produits.
            </p>
            {canEdit ? (
              <div className="flex flex-col gap-3 items-center">
                <a
                  href="/admin/menu/import"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm hover:bg-amber-400 transition-colors active:scale-[0.98]"
                >
                  📋 Coller ma carte
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </a>
                <button
                  onClick={() => setPanel('newCategory')}
                  className="text-xs text-zinc-400 hover:text-amber-400 transition-colors"
                >
                  Ou créer une catégorie vide manuellement
                </button>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">Demandez à votre administrateur de configurer le menu.</p>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      {(categories.length > 0 || panel === 'newCategory' || panel === 'modifiers') && (
      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: Categories */}
        <div className="w-56 shrink-0 border-r border-zinc-800/50 overflow-y-auto bg-zinc-950">
          <div className="p-2 space-y-1">
            {categories.map((cat) => {
              const isActive = cat.id === activeCatId;
              const itemCount = cat.items.length;
              const activeCount = cat.items.filter((i) => i.active).length;
              return (
                <button key={cat.id}
                  onClick={() => { setActiveCatId(cat.id); setActiveProductId(null); setPanel('categories'); }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    isActive ? 'bg-amber-500/15 border border-amber-500/30' : 'hover:bg-zinc-800/50 border border-transparent'
                  }`}>
                  <span className="text-lg">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${isActive ? 'text-amber-400' : 'text-white'}`}>
                      {cat.nameKey}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {activeCount}/{itemCount} actifs
                      {cat.builder && ' · Builder'}
                    </p>
                  </div>
                  {!cat.active && <span className="text-[10px] text-red-400">OFF</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Column 2: Products in category */}
        <div className="w-72 shrink-0 border-r border-zinc-800/50 overflow-y-auto">
          {activeCat ? (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-2">
                <p className="text-xs font-bold text-zinc-400 uppercase">{activeCat.icon} {activeCat.nameKey}</p>
                {canEdit && (
                  <button onClick={() => { setActiveProductId(null); setPanel('newProduct'); }}
                    className="text-xs text-amber-400 hover:text-amber-300">+ Produit</button>
                )}
              </div>
              <div className="space-y-1">
                {activeCat.items.map((p) => {
                  const isActive = p.id === activeProductId;
                  const tags = parseTags(p.tags);
                  return (
                    <button key={p.id}
                      onClick={() => { setActiveProductId(p.id); setPanel('product'); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                        isActive ? 'bg-blue-500/10 border border-blue-500/30' : 'hover:bg-zinc-800/50 border border-transparent'
                      } ${!p.active ? 'opacity-40' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${isActive ? 'text-blue-400' : 'text-white'}`}>{p.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {p.price != null && <span className="text-[10px] text-amber-400">{formatPrice(p.price)}€</span>}
                          {p.sizes.length > 0 && <span className="text-[10px] text-zinc-500">{p.sizes.length} tailles</span>}
                          {p.modifierLinks.length > 0 && <span className="text-[10px] text-purple-400">{p.modifierLinks.length} grp</span>}
                          {p.builderConfig && <span className="text-[10px] text-blue-400">Builder</span>}
                          {tags.includes('popular') && <span className="text-[10px]">⭐</span>}
                          {!(p as any).available && <span className="text-[10px] text-red-400">Rupture</span>}
                        </div>
                      </div>
                      {/* Channel visibility dots */}
                      <div className="flex gap-0.5 shrink-0">
                        <span className={`w-1.5 h-1.5 rounded-full ${(p as any).visibleOnPos !== false ? 'bg-emerald-400' : 'bg-zinc-700'}`} title="POS" />
                        <span className={`w-1.5 h-1.5 rounded-full ${(p as any).visibleOnWeb !== false ? 'bg-blue-400' : 'bg-zinc-700'}`} title="Web" />
                        <span className={`w-1.5 h-1.5 rounded-full ${(p as any).visibleOnKiosk !== false ? 'bg-purple-400' : 'bg-zinc-700'}`} title="Kiosk" />
                      </div>
                      {!p.active && <span className="text-[10px] text-red-400">OFF</span>}
                    </button>
                  );
                })}
                {activeCat.items.length === 0 && (
                  <p className="text-center text-zinc-500 py-8 text-xs">Aucun produit</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-zinc-500 text-xs">Sélectionnez une catégorie</p>
            </div>
          )}
        </div>

        {/* Column 3: Detail panel */}
        <div className="flex-1 overflow-y-auto bg-zinc-900/30">
          {panel === 'product' && activeProduct && (
            <ProductPanel
              product={activeProduct}
              allGroups={allGroups}
              canEdit={canEdit}
              saving={saving}
              onSave={async (data) => {
                setSaving(true);
                try {
                  await menuApi.updateProduct(activeProduct.id, data);
                  showToast('Produit sauvegardé');
                  await reload();
                } catch (e: any) { showToast('Erreur: ' + e.message); }
                setSaving(false);
              }}
              onToggle={async () => {
                await menuApi.toggleProduct(activeProduct.id);
                showToast(activeProduct.active ? 'Desactive' : 'Active');
                await reload();
              }}
              onDelete={async () => {
                if (!confirm('Supprimer ce produit ?')) return;
                await menuApi.deleteProduct(activeProduct.id);
                setActiveProductId(null);
                showToast('Produit supprimé');
                await reload();
              }}
              onLinkGroup={async (groupId) => {
                await menuApi.linkModifierGroup(activeProduct.id, groupId);
                showToast('Groupe lié');
                await reload();
              }}
              onUnlinkGroup={async (linkId) => {
                await menuApi.unlinkModifierGroup(linkId);
                showToast('Groupe délié');
                await reload();
              }}
              onSaveBuilder={async (cfg) => {
                await menuApi.saveBuilderConfig({ productId: activeProduct.id, ...cfg });
                showToast('Builder sauvegardé');
                await reload();
              }}
              onDeleteBuilder={async () => {
                await menuApi.deleteBuilderConfig(activeProduct.id);
                showToast('Builder supprimé');
                await reload();
              }}
            />
          )}

          {panel === 'newProduct' && activeCat && (
            <NewProductPanel
              categoryId={activeCat.id}
              onSave={async (data) => {
                setSaving(true);
                try {
                  const p = await menuApi.createProduct(data);
                  setActiveProductId(p.id);
                  setPanel('product');
                  showToast('Produit créé');
                  await reload();
                } catch (e: any) { showToast('Erreur: ' + e.message); }
                setSaving(false);
              }}
              onCancel={() => setPanel('categories')}
            />
          )}

          {panel === 'newCategory' && (
            <NewCategoryPanel
              onSave={async (data) => {
                setSaving(true);
                try {
                  const cat = await menuApi.createCategory(data);
                  setActiveCatId(cat.id);
                  setPanel('categories');
                  showToast('Catégorie créée');
                  await reload();
                } catch (e: any) { showToast('Erreur: ' + e.message); }
                setSaving(false);
              }}
              onCancel={() => setPanel('categories')}
            />
          )}

          {panel === 'modifiers' && (
            <ModifierGroupsPanel
              groups={allGroups}
              canEdit={canEdit}
              onReload={reload}
              showToast={showToast}
            />
          )}

          {panel === 'categories' && activeCat && (
            <CategoryPanel
              category={activeCat}
              canEdit={canEdit}
              onSave={async (data) => {
                await menuApi.updateCategory(activeCat.id, data);
                showToast('Catégorie sauvegardée');
                await reload();
              }}
              onDelete={async () => {
                if (!confirm('Supprimer cette categorie et tous ses produits ?')) return;
                await menuApi.deleteCategory(activeCat.id);
                setActiveCatId(null);
                showToast('Catégorie supprimée');
                await reload();
              }}
            />
          )}

          {panel === 'categories' && !activeCat && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-3xl mb-2">🍽️</p>
                <p className="text-zinc-400 text-sm">Sélectionnez une catégorie pour voir les détails</p>
                <p className="text-zinc-600 text-xs mt-1">{categories.length} categories · {categories.reduce((a, c) => a + c.items.length, 0)} produits</p>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CATEGORY PANEL
// ═══════════════════════════════════════════════════════════
function CategoryPanel({ category, canEdit, onSave, onDelete }: {
  category: Category; canEdit: boolean;
  onSave: (data: Record<string, any>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [icon, setIcon] = useState(category.icon);
  const [imageUrl, setImageUrl] = useState<string | null>(category.imageUrl ?? null);
  const [nameKey, setNameKey] = useState(category.nameKey);
  const [slug, setSlug] = useState(category.slug);
  const [builder, setBuilder] = useState(category.builder);
  const [active, setActive] = useState(category.active);
  const [flatPrice, setFlatPrice] = useState(category.flatPrice != null ? String(category.flatPrice) : '');
  const [note, setNote] = useState(category.note || '');

  useEffect(() => {
    setIcon(category.icon); setImageUrl(category.imageUrl ?? null);
    setNameKey(category.nameKey); setSlug(category.slug);
    setBuilder(category.builder); setActive(category.active);
    setFlatPrice(category.flatPrice != null ? String(category.flatPrice) : '');
    setNote(category.note || '');
  }, [category.id]);

  // Restaurateur-friendly edit view: show only what a non-technical user needs to
  // change (photo, icon fallback, name, visibility). Slug, flat price, builder
  // flag and note remain in state so save preserves existing values — they
  // simply stay hidden.
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-sm font-bold text-white">Catégorie : {category.icon} {category.nameKey}</h2>
      <ImageUpload
        kind="categories"
        label="Photo de la catégorie (optionnelle)"
        value={imageUrl}
        onChange={(v) => { setImageUrl(v); onSave({ imageUrl: v }); }}
        disabled={!canEdit}
      />
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <div>
          <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Icône</label>
          <input className={`${ic} w-16 text-center`} value={icon} onChange={(e) => setIcon(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Nom</label>
          <input className={ic} value={nameKey} onChange={(e) => setNameKey(e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-emerald-500" />
        Visible en caisse et sur le menu
      </label>
      {canEdit && (
        <div className="flex gap-2">
          <button onClick={() => onSave({ icon, nameKey, slug, builder, active, flatPrice: flatPrice ? parseFloat(flatPrice) : null, note: note || null })} className={btnPrimary}>
            Sauvegarder
          </button>
          <button onClick={onDelete} className={btnDanger}>Supprimer</button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// NEW CATEGORY PANEL
// ═══════════════════════════════════════════════════════════
function NewCategoryPanel({ onSave, onCancel }: {
  onSave: (data: any) => Promise<void>; onCancel: () => void;
}) {
  const [icon, setIcon] = useState('🍽️');
  const [name, setName] = useState('');
  // Slug is auto-derived from the name. Builder defaults to false. The advanced
  // options are intentionally hidden from the restaurateur-facing form.
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'categorie';

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-sm font-bold text-white">Nouvelle catégorie</h2>
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <div>
          <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Icône</label>
          <input className={`${ic} w-16 text-center`} value={icon} onChange={(e) => setIcon(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Nom</label>
          <input
            className={ic}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex : Entrées, Plats, Boissons…"
            autoFocus
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave({ icon, nameKey: name.trim(), slug, builder: false })} className={btnPrimary} disabled={!name.trim()}>Créer</button>
        <button onClick={onCancel} className={btnSecondary}>Annuler</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PRODUCT PANEL (full editing)
// ═══════════════════════════════════════════════════════════
function ProductPanel({ product, allGroups, canEdit, saving, onSave, onToggle, onDelete, onLinkGroup, onUnlinkGroup, onSaveBuilder, onDeleteBuilder }: {
  product: Product; allGroups: ModGroup[]; canEdit: boolean; saving: boolean;
  onSave: (data: Record<string, any>) => Promise<void>;
  onToggle: () => Promise<void>;
  onDelete: () => Promise<void>;
  onLinkGroup: (groupId: string) => Promise<void>;
  onUnlinkGroup: (linkId: string) => Promise<void>;
  onSaveBuilder: (cfg: Record<string, any>) => Promise<void>;
  onDeleteBuilder: () => Promise<void>;
}) {
  const tags = (() => { try { return JSON.parse(product.tags) as string[]; } catch { return []; } })();
  const allergens = (() => { try { return JSON.parse(product.allergens) as number[]; } catch { return []; } })();

  const [name, setName] = useState(product.name);
  const [imageUrl, setImageUrl] = useState<string | null>(product.imageUrl ?? null);
  const [price, setPrice] = useState(product.price != null ? String(product.price) : '');
  const [selectedTags, setSelectedTags] = useState<string[]>(tags);
  const [selectedAllergens, setSelectedAllergens] = useState<number[]>(allergens);
  const [sizes, setSizes] = useState(product.sizes.map((s) => ({ sizeKey: s.sizeKey, price: String(s.price) })));
  const [nameKey, setNameKey] = useState(product.nameKey || '');
  const [descKey, setDescKey] = useState(product.descKey || '');
  const [subcategory, setSubcategory] = useState(product.subcategory || '');
  const [available, setAvailable] = useState(product.available !== false);
  const [visibleOnPos, setVisibleOnPos] = useState(product.visibleOnPos !== false);
  const [visibleOnWeb, setVisibleOnWeb] = useState(product.visibleOnWeb !== false);
  const [visibleOnKiosk, setVisibleOnKiosk] = useState(product.visibleOnKiosk !== false);

  // Builder state
  const bc = product.builderConfig;
  const [isBuilder, setIsBuilder] = useState(!!bc);
  const [basePrice, setBasePrice] = useState(bc ? String(bc.basePrice) : '');
  const [builderSteps, setBuilderSteps] = useState(bc ? bc.steps : '[]');

  useEffect(() => {
    const t = (() => { try { return JSON.parse(product.tags) as string[]; } catch { return []; } })();
    const a = (() => { try { return JSON.parse(product.allergens) as number[]; } catch { return []; } })();
    setName(product.name); setImageUrl(product.imageUrl ?? null);
    setPrice(product.price != null ? String(product.price) : '');
    setSelectedTags(t); setSelectedAllergens(a);
    setSizes(product.sizes.map((s) => ({ sizeKey: s.sizeKey, price: String(s.price) })));
    setNameKey(product.nameKey || ''); setDescKey(product.descKey || '');
    setSubcategory(product.subcategory || '');
    setAvailable(product.available !== false);
    setVisibleOnPos(product.visibleOnPos !== false);
    setVisibleOnWeb(product.visibleOnWeb !== false);
    setVisibleOnKiosk(product.visibleOnKiosk !== false);
    setIsBuilder(!!product.builderConfig);
    setBasePrice(product.builderConfig ? String(product.builderConfig.basePrice) : '');
    setBuilderSteps(product.builderConfig ? product.builderConfig.steps : '[]');
  }, [product.id]);

  const linkedGroupIds = product.modifierLinks.map((l) => l.groupId);
  const unlinkedGroups = allGroups.filter((g) => !linkedGroupIds.includes(g.id));

  const toggleTag = (tag: string) => setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  const toggleAllergen = (id: number) => setSelectedAllergens((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]);

  const handleSave = () => {
    onSave({
      name, nameKey: nameKey || null, descKey: descKey || null,
      price: price ? parseFloat(price) : null,
      tags: selectedTags, allergens: selectedAllergens,
      subcategory: subcategory || null,
      imageUrl,
      available, visibleOnPos, visibleOnWeb, visibleOnKiosk,
      sizes: sizes.filter((s) => s.sizeKey).map((s) => ({ sizeKey: s.sizeKey, price: s.price })),
    });
    // Save builder if enabled
    if (isBuilder && basePrice) {
      onSaveBuilder({ basePrice: parseFloat(basePrice), steps: builderSteps });
    } else if (!isBuilder && product.builderConfig) {
      onDeleteBuilder();
    }
  };

  return (
    <div className="p-4 space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">Produit : {product.name}</h2>
        <div className="flex gap-2">
          <button onClick={onToggle} className={product.active ? `${btn} bg-emerald-500/15 text-emerald-400` : `${btn} bg-red-500/15 text-red-400`}>
            {product.active ? '✓ Actif' : '✗ Inactif'}
          </button>
          <button onClick={onDelete} className={btnDanger}>Supprimer</button>
        </div>
      </div>

      {/* Photo — auto-saved on upload, no explicit save needed */}
      <Section title="Photo du produit">
        <ImageUpload
          kind="products"
          value={imageUrl}
          onChange={(v) => { setImageUrl(v); onSave({ imageUrl: v }); }}
          disabled={!canEdit}
        />
      </Section>

      {/* Basic info */}
      <Section title="Informations">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Nom</label>
            <input className={ic} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Prix (€)</label>
            <input className={ic} type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="—" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Cle i18n</label>
            <input className={ic} value={nameKey} onChange={(e) => setNameKey(e.target.value)} placeholder="ex: fricadelle" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Sous-categorie</label>
            <input className={ic} value={subcategory} onChange={(e) => setSubcategory(e.target.value)} placeholder="ex: canettes" />
          </div>
        </div>
      </Section>

      {/* Sizes */}
      <Section title="Tailles">
        {sizes.map((s, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input className={`${ic} flex-1`} value={s.sizeKey} onChange={(e) => { const n = [...sizes]; n[i] = { ...n[i], sizeKey: e.target.value }; setSizes(n); }} placeholder="petit" />
            <input className={`${ic} w-24`} type="number" step="0.01" value={s.price} onChange={(e) => { const n = [...sizes]; n[i] = { ...n[i], price: e.target.value }; setSizes(n); }} placeholder="3.80" />
            <button onClick={() => setSizes(sizes.filter((_, j) => j !== i))} className="text-red-400 text-xs hover:text-red-300 px-2">✗</button>
          </div>
        ))}
        <button onClick={() => setSizes([...sizes, { sizeKey: '', price: '' }])} className="text-xs text-amber-400 hover:text-amber-300">+ Ajouter une taille</button>
      </Section>

      {/* Availability */}
      <Section title="Disponibilite">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-zinc-300">Disponible (en stock)</span>
          <button onClick={() => setAvailable(!available)} className={`w-10 h-6 rounded-full transition-colors ${available ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
            <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${available ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
        </label>
      </Section>

      {/* Channel visibility */}
      <Section title="Visibilite par canal">
        <div className="space-y-2.5">
          {([
            { key: 'pos', label: 'Caisse POS', value: visibleOnPos, set: setVisibleOnPos },
            { key: 'web', label: 'Site web / commande en ligne', value: visibleOnWeb, set: setVisibleOnWeb },
            { key: 'kiosk', label: 'Kiosk / borne de commande', value: visibleOnKiosk, set: setVisibleOnKiosk },
          ] as const).map((ch) => (
            <label key={ch.key} className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-zinc-300">{ch.label}</span>
              <button onClick={() => ch.set(!ch.value)} className={`w-10 h-6 rounded-full transition-colors ${ch.value ? 'bg-brand' : 'bg-zinc-700'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${ch.value ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </label>
          ))}
        </div>
      </Section>

      {/* Tags */}
      <Section title="Tags">
        <div className="flex gap-2 flex-wrap">
          {TAG_OPTIONS.map((tag) => (
            <button key={tag} onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedTags.includes(tag) ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
              }`}>
              {TAG_LABELS[tag] || tag}
            </button>
          ))}
        </div>
      </Section>

      {/* Allergens */}
      <Section title="Allergenes">
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(ALLERGEN_NAMES).map(([id, label]) => {
            const numId = parseInt(id);
            const selected = selectedAllergens.includes(numId);
            return (
              <button key={id} onClick={() => toggleAllergen(numId)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  selected ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-zinc-800 text-zinc-600 border border-zinc-700'
                }`}>
                {numId}. {label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Modifier Groups */}
      <Section title="Groupes de modifiers">
        {product.modifierLinks.length > 0 ? (
          <div className="space-y-2">
            {product.modifierLinks.map((link) => (
              <div key={link.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                <div>
                  <p className="text-xs font-medium text-purple-400">{link.group.name}</p>
                  <p className="text-[10px] text-zinc-500">
                    min {link.group.minSelect} / max {link.group.maxSelect} — {link.group.modifiers.length} modifiers
                  </p>
                </div>
                {canEdit && <button onClick={() => onUnlinkGroup(link.id)} className="text-red-400 text-xs hover:text-red-300">Delier</button>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">Aucun groupe lie</p>
        )}
        {canEdit && unlinkedGroups.length > 0 && (
          <div className="mt-2">
            <select className={ic} onChange={(e) => { if (e.target.value) { onLinkGroup(e.target.value); e.target.value = ''; } }}>
              <option value="">+ Lier un groupe...</option>
              {unlinkedGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name} ({g.modifiers.length} mod.)</option>
              ))}
            </select>
          </div>
        )}
      </Section>

      {/* Builder Config */}
      <Section title="Configuration Builder">
        <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer mb-3">
          <input type="checkbox" checked={isBuilder} onChange={(e) => setIsBuilder(e.target.checked)} className="accent-blue-500" />
          Ce produit est un builder
        </label>
        {isBuilder && (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Prix de base (€)</label>
              <input className={ic} type="number" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Etapes (JSON)</label>
              <textarea className={`${ic} h-32 font-mono text-xs`} value={builderSteps} onChange={(e) => setBuilderSteps(e.target.value)} />
              <p className="text-[9px] text-zinc-600 mt-1">Format: [{"{"}"key":"sauce","label":"Sauce","groupId":"...","maxSelect":2{"}"}]</p>
            </div>
          </div>
        )}
      </Section>

      {/* Save button */}
      {canEdit && (
        <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur-sm py-3 border-t border-zinc-800/50 -mx-4 px-4">
          <button onClick={handleSave} disabled={saving} className={`${btnPrimary} w-full py-3`}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder le produit'}
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// NEW PRODUCT PANEL
// ═══════════════════════════════════════════════════════════
function NewProductPanel({ categoryId, onSave, onCancel }: {
  categoryId: string;
  onSave: (data: Record<string, any>) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [nameKey, setNameKey] = useState('');

  // The i18n key is derived from the name and kept in state — users don't see it.
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-sm font-bold text-white">Nouveau produit</h2>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div>
          <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Nom</label>
          <input
            className={ic}
            value={name}
            onChange={(e) => { setName(e.target.value); setNameKey(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_')); }}
            placeholder="ex : Cheeseburger"
            autoFocus
          />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Prix (€)</label>
          <input className={`${ic} w-24`} type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="4.50" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave({ categoryId, name, nameKey, price: price ? parseFloat(price) : null })} className={btnPrimary} disabled={!name.trim()}>Créer</button>
        <button onClick={onCancel} className={btnSecondary}>Annuler</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MODIFIER GROUPS PANEL
// ═══════════════════════════════════════════════════════════
function ModifierGroupsPanel({ groups, canEdit, onReload, showToast }: {
  groups: ModGroup[]; canEdit: boolean;
  onReload: () => Promise<void>; showToast: (msg: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMin, setNewMin] = useState('0');
  const [newMax, setNewMax] = useState('1');
  const [editingMod, setEditingMod] = useState<{ groupId: string; name: string; price: string } | null>(null);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">Groupes de modifiers</h2>
        {canEdit && <button onClick={() => setShowNew(true)} className={`${btnPrimary} text-xs`}>+ Groupe</button>}
      </div>

      {showNew && (
        <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 space-y-2">
          <input className={ic} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nom du groupe (ex: Sauces)" />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-zinc-500">Min</label>
              <input className={ic} type="number" value={newMin} onChange={(e) => setNewMin(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-zinc-500">Max</label>
              <input className={ic} type="number" value={newMax} onChange={(e) => setNewMax(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <button className={btnPrimary} disabled={!newName} onClick={async () => {
              await menuApi.createModifierGroup({ name: newName, nameKey: newName.toLowerCase().replace(/\s+/g, '_'), minSelect: parseInt(newMin), maxSelect: parseInt(newMax) });
              setShowNew(false); setNewName(''); showToast('Groupe créé');
              await onReload();
            }}>Creer</button>
            <button className={btnSecondary} onClick={() => setShowNew(false)}>Annuler</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {groups.map((g) => {
          const expanded = g.id === expandedId;
          return (
            <div key={g.id} className="rounded-lg border border-zinc-700/50 overflow-hidden">
              <button onClick={() => setExpandedId(expanded ? null : g.id)}
                className="w-full flex items-center justify-between p-3 bg-zinc-800/50 hover:bg-zinc-800 text-left">
                <div>
                  <p className="text-sm font-medium text-purple-400">{g.name}</p>
                  <p className="text-[10px] text-zinc-500">min {g.minSelect} / max {g.maxSelect} — {g.modifiers.length} modifiers</p>
                </div>
                <span className="text-zinc-500 text-xs">{expanded ? '▼' : '▶'}</span>
              </button>
              {expanded && (
                <div className="p-3 space-y-2 bg-zinc-900/50">
                  {/* Edit group settings */}
                  {canEdit && (
                    <div className="flex gap-2 mb-3">
                      <div className="flex-1">
                        <label className="text-[10px] text-zinc-500">Min</label>
                        <input className={ic} type="number" defaultValue={g.minSelect}
                          onBlur={async (e) => { await menuApi.updateModifierGroup(g.id, { minSelect: parseInt(e.target.value) }); await onReload(); }} />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-zinc-500">Max</label>
                        <input className={ic} type="number" defaultValue={g.maxSelect}
                          onBlur={async (e) => { await menuApi.updateModifierGroup(g.id, { maxSelect: parseInt(e.target.value) }); await onReload(); }} />
                      </div>
                      <button onClick={async () => {
                        if (!confirm('Supprimer ce groupe ?')) return;
                        await menuApi.deleteModifierGroup(g.id); showToast('Groupe supprimé'); await onReload();
                      }} className={`${btnDanger} self-end text-xs`}>Supprimer</button>
                    </div>
                  )}

                  {/* Modifiers list */}
                  {g.modifiers.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-zinc-800/30">
                      <span className="text-xs text-zinc-300">{m.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-amber-400">{m.price > 0 ? `+${formatPrice(m.price)}€` : 'Inclus'}</span>
                        {canEdit && (
                          <button onClick={async () => {
                            if (!confirm(`Supprimer ${m.name} ?`)) return;
                            await menuApi.deleteModifier(m.id); showToast('Modifier supprimé'); await onReload();
                          }} className="text-red-400/50 hover:text-red-400 text-[10px]">✗</button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add modifier */}
                  {canEdit && (
                    <div className="flex gap-2 mt-2">
                      {editingMod?.groupId === g.id ? (
                        <>
                          <input className={`${ic} flex-1`} value={editingMod.name} onChange={(e) => setEditingMod({ ...editingMod, name: e.target.value })} placeholder="Nom" autoFocus />
                          <input className={`${ic} w-20`} type="number" step="0.01" value={editingMod.price} onChange={(e) => setEditingMod({ ...editingMod, price: e.target.value })} placeholder="Prix" />
                          <button className={`${btnPrimary} text-xs`} disabled={!editingMod.name} onClick={async () => {
                            await menuApi.createModifier({ groupId: g.id, name: editingMod.name, price: parseFloat(editingMod.price) || 0 });
                            setEditingMod(null); showToast('Modifier ajoute'); await onReload();
                          }}>OK</button>
                          <button className="text-xs text-zinc-500" onClick={() => setEditingMod(null)}>✗</button>
                        </>
                      ) : (
                        <button onClick={() => setEditingMod({ groupId: g.id, name: '', price: '0' })} className="text-xs text-amber-400 hover:text-amber-300">+ Ajouter modifier</button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SECTION WRAPPER
// ═══════════════════════════════════════════════════════════
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">{title}</h3>
      <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
        {children}
      </div>
    </div>
  );
}
