'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { menuApi } from '@/lib/menuApi';
import { parseMenuText, slugifyName, ParsedLine } from '@/lib/menuTextParser';

// Draft shape displayed in the preview table.
// We keep it flat (one row per product) and group by category at render time.
interface DraftRow {
  id: string;           // client-side id (for React keys)
  name: string;
  price: string;        // kept as string so the input is controllable ('' allowed)
  category: string;     // user-facing category name (exact string, see grouping)
  selected: boolean;    // unchecked rows are ignored on publish
}

const DEFAULT_CATEGORY_LABEL = 'Menu';
const STORAGE_KEY = 'brizo-menu-import-text';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function uid() { return Math.random().toString(36).slice(2, 10); }

function priceIsValid(raw: string): boolean {
  if (!raw.trim()) return false;
  const n = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(n) && n >= 0;
}

export default function MenuImportPage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [defaultCategory, setDefaultCategory] = useState(DEFAULT_CATEGORY_LABEL);
  const [draft, setDraft] = useState<DraftRow[] | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Restore textarea from localStorage on mount. We intentionally skip SSR.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setText(saved);
    } catch { /* localStorage disabled → degrade silently */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, text); } catch { /* noop */ }
  }, [text]);

  // Build draft rows from parser output.
  function analyze() {
    const parsed: ParsedLine[] = parseMenuText(text);
    if (parsed.length === 0) {
      setError('Aucun produit détecté. Chaque ligne doit contenir un nom (et idéalement un prix). Exemple : « Cheeseburger 9.50 ».');
      return;
    }
    const rows: DraftRow[] = [];
    for (const item of parsed) {
      if (item.kind !== 'product') continue;
      rows.push({
        id: uid(),
        name: item.name,
        price: item.price != null ? String(item.price) : '',
        category: item.category || defaultCategory,
        selected: true,
      });
    }
    if (rows.length === 0) {
      setError('Seulement des catégories détectées, aucun produit. Ajoutez au moins une ligne « Nom Prix ».');
      return;
    }
    setError(null);
    setDraft(rows);
  }

  const groupedDraft = useMemo(() => {
    if (!draft) return [] as { category: string; rows: DraftRow[] }[];
    const map = new Map<string, DraftRow[]>();
    for (const row of draft) {
      const key = row.category.trim() || defaultCategory;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return Array.from(map.entries()).map(([category, rows]) => ({ category, rows }));
  }, [draft, defaultCategory]);

  const selectableCount = (draft || []).filter((r) => r.selected && r.name.trim() && priceIsValid(r.price)).length;
  const uncertainCount = (draft || []).filter((r) => !priceIsValid(r.price) || !r.name.trim()).length;

  function updateRow(id: string, patch: Partial<DraftRow>) {
    setDraft((prev) => (prev ? prev.map((r) => (r.id === id ? { ...r, ...patch } : r)) : prev));
  }
  function deleteRow(id: string) {
    setDraft((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
  }
  function addRow(category: string) {
    setDraft((prev) => ([...(prev || []), { id: uid(), name: '', price: '', category, selected: true }]));
  }
  function renameCategory(oldName: string, newName: string) {
    const name = newName.trim();
    if (!name || name === oldName) return;
    setDraft((prev) => (prev ? prev.map((r) => (r.category === oldName ? { ...r, category: name } : r)) : prev));
  }

  async function publish() {
    if (!draft) return;
    setError(null);
    setPublishing(true);
    try {
      // Load current categories from API so we reuse existing ones by name.
      const existing = await fetch('/api/menu/v2').then((r) => r.json()).catch(() => []);
      const existingByName = new Map<string, string>();
      if (Array.isArray(existing)) {
        for (const c of existing) existingByName.set((c.nameKey || c.slug || '').toLowerCase(), c.id);
      }

      const rowsToPublish = draft.filter((r) => r.selected && r.name.trim() && priceIsValid(r.price));
      if (rowsToPublish.length === 0) {
        setError('Aucun produit prêt à publier. Complétez nom et prix, ou cochez au moins une ligne valide.');
        setPublishing(false);
        return;
      }

      const byCategory = new Map<string, DraftRow[]>();
      for (const r of rowsToPublish) {
        const key = r.category.trim() || defaultCategory;
        if (!byCategory.has(key)) byCategory.set(key, []);
        byCategory.get(key)!.push(r);
      }

      const total = rowsToPublish.length;
      let done = 0;
      setProgress({ done, total });

      for (const [catName, rows] of byCategory) {
        let catId = existingByName.get(catName.toLowerCase());
        if (!catId) {
          const created = await menuApi.createCategory({
            slug: slugifyName(catName),
            nameKey: catName,
            icon: '🍽️',
          });
          catId = created.id;
          existingByName.set(catName.toLowerCase(), catId!);
        }
        for (const row of rows) {
          await menuApi.createProduct({
            categoryId: catId,
            name: row.name.trim(),
            nameKey: slugifyName(row.name),
            price: parseFloat(row.price.replace(',', '.')),
          });
          // Remove the row from the draft so a retry after a failure doesn't
          // double-insert items already created.
          setDraft((prev) => (prev ? prev.filter((r) => r.id !== row.id) : prev));
          done += 1;
          setProgress({ done, total });
        }
      }

      // All rows saved — clear persisted textarea and go back to the menu editor.
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
      setText('');
      router.push('/admin/menu');
    } catch (e: any) {
      const detail = e?.message || 'Erreur inconnue';
      setError(`Publication interrompue : ${detail}. Les produits déjà créés sont conservés — cliquez Publier pour reprendre.`);
    } finally {
      setPublishing(false);
      setProgress(null);
    }
  }

  const ta = 'w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 font-mono leading-relaxed';
  const ic = 'w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-amber-500/50';
  const btnPrimary = 'px-5 py-3 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm hover:bg-amber-400 transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed';
  const btnSecondary = 'px-5 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-medium text-sm hover:bg-zinc-700 transition-colors';

  // ─── Render: empty / input ───
  if (!draft) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-2">
        <div>
          <Link href="/admin/menu" className="text-xs text-amber-400">← Retour au menu</Link>
          <h1 className="text-xl font-bold text-white mt-2">Coller ma carte</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Copiez votre carte (Word, notes, …) et collez-la ci-dessous. Un produit par ligne, avec le prix à la fin.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-semibold tracking-[0.12em] uppercase text-zinc-500">Catégorie par défaut</label>
          <input
            className={ic + ' max-w-xs'}
            value={defaultCategory}
            onChange={(e) => setDefaultCategory(e.target.value)}
            placeholder="ex : Plats"
          />
          <p className="text-[11px] text-zinc-600">Utilisée pour les produits collés sans catégorie. Les titres comme « BURGERS » ou « # Entrées » sont détectés automatiquement.</p>
        </div>

        <div>
          <textarea
            className={ta + ' min-h-[280px]'}
            placeholder={`Exemple :\n\nBURGERS\nCheeseburger 9.50\nHamburger 8\n\nBOISSONS\nCoca 3\nEau 2`}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
          <div className="flex items-center justify-between mt-3">
            <p className="text-[11px] text-zinc-600">{text.length} caractères</p>
            <button onClick={analyze} disabled={!text.trim()} className={btnPrimary}>
              Analyser ce texte
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: preview / publish ───
  return (
    <div className="max-w-3xl mx-auto space-y-5 py-2 pb-24">
      <div>
        <button onClick={() => setDraft(null)} className="text-xs text-amber-400 hover:underline">← Modifier le texte collé</button>
        <h1 className="text-xl font-bold text-white mt-2">Vérifiez votre brouillon</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {draft.length} ligne{draft.length > 1 ? 's' : ''} détectée{draft.length > 1 ? 's' : ''}
          {uncertainCount > 0 && <> — <span className="text-amber-400">{uncertainCount} à compléter</span></>}.
          Corrigez les prix manquants, décochez ce que vous ne voulez pas publier.
        </p>
      </div>

      {groupedDraft.map((group) => (
        <div key={group.category} className="rounded-2xl bg-zinc-900 border border-zinc-800/50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
            <input
              className="bg-transparent text-sm font-bold text-white focus:outline-none focus:bg-zinc-800 px-2 py-1 rounded-md"
              value={group.category}
              onChange={(e) => renameCategory(group.category, e.target.value)}
            />
            <span className="text-xs text-zinc-500">{group.rows.length} produit{group.rows.length > 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {group.rows.map((row) => {
              const nameBlank = !row.name.trim();
              const priceBlank = !priceIsValid(row.price);
              const rowProblem = nameBlank || priceBlank;
              return (
                <div key={row.id} className={`grid grid-cols-[auto_1fr_110px_auto] gap-3 items-center px-4 py-2.5 ${rowProblem && row.selected ? 'bg-amber-500/5' : ''}`}>
                  <input
                    type="checkbox"
                    className="accent-amber-500 w-4 h-4"
                    checked={row.selected && !rowProblem ? true : row.selected}
                    onChange={(e) => updateRow(row.id, { selected: e.target.checked })}
                    disabled={rowProblem}
                  />
                  <input
                    className={`${ic} ${nameBlank ? 'border-amber-500/50' : ''}`}
                    value={row.name}
                    onChange={(e) => updateRow(row.id, { name: e.target.value })}
                    placeholder="Nom du produit"
                  />
                  <div className="relative">
                    <input
                      className={`${ic} pr-7 ${priceBlank ? 'border-amber-500/50' : ''}`}
                      type="text"
                      inputMode="decimal"
                      value={row.price}
                      onChange={(e) => updateRow(row.id, { price: e.target.value })}
                      placeholder="—"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">€</span>
                  </div>
                  <button
                    onClick={() => deleteRow(row.id)}
                    className="text-zinc-500 hover:text-red-400 text-sm px-2"
                    aria-label="Supprimer la ligne"
                  >
                    🗑
                  </button>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => addRow(group.category)}
            className="w-full text-left px-4 py-2.5 text-xs text-zinc-500 hover:text-amber-400 hover:bg-zinc-800/50 border-t border-zinc-800/50 transition-colors"
          >
            + Ajouter une ligne dans « {group.category} »
          </button>
        </div>
      ))}

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="sticky bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 -mx-4 px-4 py-4 flex items-center justify-between">
        <div className="text-sm text-zinc-400">
          {progress ? (
            <span>Création en cours… <strong className="text-white">{progress.done}/{progress.total}</strong></span>
          ) : (
            <span><strong className="text-white">{selectableCount}</strong> produit{selectableCount > 1 ? 's' : ''} prêt{selectableCount > 1 ? 's' : ''} à publier</span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setDraft(null)} className={btnSecondary} disabled={publishing}>Annuler</button>
          <button
            onClick={publish}
            className={btnPrimary}
            disabled={publishing || selectableCount === 0}
          >
            {publishing ? 'Publication…' : `Publier ${selectableCount} produit${selectableCount > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
