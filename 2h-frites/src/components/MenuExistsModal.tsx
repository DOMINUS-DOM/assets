'use client';

/**
 * Shown during the onboarding wizard step 2 when the user submits a template
 * but a menu already exists on the location (typically because they re-entered
 * the wizard via settings "Relancer l'assistant").
 *
 * 3 explicit choices — click-outside maps to Cancel, NEVER to Keep: skipping
 * the menu mutation is a real intent that must be a positive click, not an
 * accidental backdrop tap.
 */

interface Props {
  existingInfo: {
    categoryCount: number;
    productCount: number;
    modifierGroupCount: number;
  };
  onReplace: () => void;
  onKeep: () => void;
  onCancel: () => void;
  busy?: boolean;
}

function pluralize(n: number, singular: string, plural: string) {
  return `${n} ${n <= 1 ? singular : plural}`;
}

export default function MenuExistsModal({ existingInfo, onReplace, onKeep, onCancel, busy }: Props) {
  const { categoryCount, productCount, modifierGroupCount } = existingInfo;
  const cats = pluralize(categoryCount, 'catégorie', 'catégories');
  const prods = pluralize(productCount, 'produit', 'produits');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div className="bg-zinc-900 rounded-2xl border border-zinc-700 p-6 w-96 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white text-center">
          Un menu existe déjà
        </h3>

        <p className="text-sm text-zinc-400 text-center">
          Ce restaurant a déjà {cats} et {prods}. Que souhaitez-vous faire ?
        </p>

        {modifierGroupCount > 0 && (
          <p className="text-xs text-zinc-500 text-center">
            Les groupes de modificateurs ({modifierGroupCount}) seront également supprimés en cas de remplacement.
          </p>
        )}

        <div className="space-y-2 pt-2">
          <button onClick={onReplace} disabled={busy}
            className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform">
            {busy ? 'Remplacement en cours…' : 'Remplacer ce menu'}
          </button>
          <button onClick={onKeep} disabled={busy}
            className="w-full py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-sm disabled:opacity-50 active:scale-[0.98] transition-transform">
            Garder le menu existant
          </button>
          <button onClick={onCancel} disabled={busy}
            className="w-full py-2.5 text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
