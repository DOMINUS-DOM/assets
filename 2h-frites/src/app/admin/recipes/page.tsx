'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { api } from '@/lib/api';
import { useLocation } from '@/contexts/LocationContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatPrice } from '@/utils/format';
import { menuStore } from '@/stores/menuStore';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  category: string;
}

interface RecipeItemData {
  id: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  ingredient: Ingredient;
}

interface Recipe {
  id: string;
  menuItemId: string;
  name: string;
  prepTime: number | null;
  notes: string;
  items: RecipeItemData[];
  totalCost: number;
}

interface MenuItemFlat {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  categoryName: string;
}

export default function RecipesPage() {
  const { locationId } = useLocation();
  const { t } = useLanguage();
  const categories = useSyncExternalStore(menuStore.subscribe, menuStore.getCategories, menuStore.getCategories);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [recipeForm, setRecipeForm] = useState({ name: '', prepTime: '', notes: '' });
  const [addItemForm, setAddItemForm] = useState({ ingredientId: '', quantity: '', unit: '' });
  const [editingRecipe, setEditingRecipe] = useState(false);

  // Flatten menu items
  const allMenuItems: MenuItemFlat[] = categories.flatMap((cat) =>
    cat.items.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price || (item.sizes?.[0]?.price) || 0,
      categoryId: cat.id,
      categoryName: cat.nameKey || cat.slug || '',
    }))
  );

  const filteredItems = search
    ? allMenuItems.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : allMenuItems;

  const refresh = async () => {
    try {
      const [recipesData, invData] = await Promise.all([
        api.get<Recipe[]>('/recipes'),
        api.get<{ ingredients: Ingredient[] }>(`/inventory${locationId ? `?locationId=${locationId}` : ''}`),
      ]);
      setRecipes(recipesData);
      setIngredients(invData.ingredients);
    } catch {}
  };

  useEffect(() => {
    menuStore.setLocationId(locationId || null);
    refresh();
  }, [locationId]);

  const recipeMap = new Map(recipes.map((r) => [r.menuItemId, r]));
  const selectedItem = allMenuItems.find((i) => i.id === selectedItemId);
  const selectedRecipe = selectedItemId ? recipeMap.get(selectedItemId) : undefined;

  const handleCreateRecipe = async () => {
    if (!selectedItemId || !selectedItem) return;
    await api.post('/recipes', {
      action: 'create',
      menuItemId: selectedItemId,
      name: selectedItem.name,
      prepTime: null,
      notes: '',
      items: [],
    });
    refresh();
  };

  const handleUpdateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipe) return;
    await api.post('/recipes', {
      action: 'update',
      id: selectedRecipe.id,
      name: recipeForm.name || selectedRecipe.name,
      prepTime: recipeForm.prepTime ? parseInt(recipeForm.prepTime) : null,
      notes: recipeForm.notes,
    });
    setEditingRecipe(false);
    refresh();
  };

  const handleDeleteRecipe = async () => {
    if (!selectedRecipe || !confirm(t.ui.rec_deleteConfirm)) return;
    await api.post('/recipes', { action: 'delete', id: selectedRecipe.id });
    refresh();
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipe || !addItemForm.ingredientId) return;
    const ing = ingredients.find((i) => i.id === addItemForm.ingredientId);
    await api.post('/recipes', {
      action: 'addItem',
      recipeId: selectedRecipe.id,
      ingredientId: addItemForm.ingredientId,
      quantity: parseFloat(addItemForm.quantity) || 0,
      unit: addItemForm.unit || ing?.unit || '',
    });
    setAddItemForm({ ingredientId: '', quantity: '', unit: '' });
    refresh();
  };

  const handleRemoveItem = async (itemId: string) => {
    await api.post('/recipes', { action: 'removeItem', id: itemId });
    refresh();
  };

  const getMarginColor = (pct: number) => {
    if (pct >= 65) return 'text-emerald-400';
    if (pct >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const ic = 'w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-amber-500/50';

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">{t.ui.rec_title}</h1>

      {/* Search */}
      <input
        className={ic}
        placeholder={t.ui.rec_searchPlaceholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LEFT: Menu items list */}
        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t.ui.rec_menuItems}</h2>
          {filteredItems.map((item) => {
            const recipe = recipeMap.get(item.id);
            const hasRecipe = !!recipe;
            const marginPct = hasRecipe && item.price > 0
              ? ((item.price - recipe.totalCost) / item.price) * 100
              : null;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedItemId(item.id);
                  setEditingRecipe(false);
                  if (recipe) {
                    setRecipeForm({ name: recipe.name, prepTime: recipe.prepTime ? String(recipe.prepTime) : '', notes: recipe.notes });
                  }
                }}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${selectedItemId === item.id
                  ? 'bg-amber-500/10 border-amber-500/40'
                  : 'bg-zinc-900 border-zinc-800/50 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{hasRecipe ? '\u2705' : '\u274c'}</span>
                    <span className="text-sm font-medium text-white">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-500">{formatPrice(item.price)} \u20ac</span>
                    {hasRecipe && marginPct !== null && (
                      <span className={`font-bold ${getMarginColor(marginPct)}`}>
                        {marginPct.toFixed(0)}%
                      </span>
                    )}
                    {hasRecipe && (
                      <span className="text-zinc-500">{t.ui.rec_cost} {formatPrice(recipe.totalCost)} \u20ac</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          {filteredItems.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-6">{t.ui.rec_noProducts}</p>
          )}
        </div>

        {/* RIGHT: Recipe editor */}
        <div className="space-y-3">
          {!selectedItem && (
            <div className="p-8 rounded-xl bg-zinc-900 border border-zinc-800/50 text-center">
              <p className="text-zinc-500 text-sm">{t.ui.rec_selectProduct}</p>
            </div>
          )}

          {selectedItem && !selectedRecipe && (
            <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800/50 text-center space-y-3">
              <p className="text-sm text-zinc-400">{t.ui.rec_noRecipe} <span className="text-white font-medium">{selectedItem.name}</span></p>
              <button onClick={handleCreateRecipe}
                className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 font-bold text-sm">
                {t.ui.rec_createRecipe}
              </button>
            </div>
          )}

          {selectedItem && selectedRecipe && (
            <div className="space-y-3">
              {/* Recipe header */}
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-white">{selectedRecipe.name}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingRecipe(!editingRecipe)}
                      className="text-zinc-500 hover:text-amber-400 text-xs p-1">&#9998;</button>
                    <button onClick={handleDeleteRecipe}
                      className="text-zinc-500 hover:text-red-400 text-xs p-1">&#10005;</button>
                  </div>
                </div>

                {/* Cost / margin summary */}
                {(() => {
                  const cost = selectedRecipe.totalCost;
                  const price = selectedItem.price;
                  const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
                  return (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-zinc-800">
                        <div className="text-[10px] text-zinc-500 uppercase">Co\u00fbt</div>
                        <div className="text-sm font-bold text-white">{formatPrice(cost)} \u20ac</div>
                      </div>
                      <div className="p-2 rounded-lg bg-zinc-800">
                        <div className="text-[10px] text-zinc-500 uppercase">Prix vente</div>
                        <div className="text-sm font-bold text-white">{formatPrice(price)} \u20ac</div>
                      </div>
                      <div className="p-2 rounded-lg bg-zinc-800">
                        <div className="text-[10px] text-zinc-500 uppercase">Marge</div>
                        <div className={`text-sm font-bold ${getMarginColor(margin)}`}>{margin.toFixed(1)}%</div>
                      </div>
                    </div>
                  );
                })()}

                {selectedRecipe.prepTime && (
                  <p className="text-xs text-zinc-500 mt-2">Temps de pr\u00e9p: {selectedRecipe.prepTime} min</p>
                )}
                {selectedRecipe.notes && (
                  <p className="text-xs text-zinc-400 mt-1 italic">{selectedRecipe.notes}</p>
                )}
              </div>

              {/* Edit recipe form */}
              {editingRecipe && (
                <form onSubmit={handleUpdateRecipe} className="p-4 rounded-xl bg-zinc-900 border border-amber-500/30 space-y-2">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Modifier la recette</h4>
                  <input className={ic} placeholder="Nom" value={recipeForm.name} onChange={(e) => setRecipeForm({ ...recipeForm, name: e.target.value })} />
                  <input className={ic} type="number" placeholder="Temps de pr\u00e9p (min)" value={recipeForm.prepTime} onChange={(e) => setRecipeForm({ ...recipeForm, prepTime: e.target.value })} />
                  <textarea className={`${ic} min-h-[60px]`} placeholder="Notes" value={recipeForm.notes} onChange={(e) => setRecipeForm({ ...recipeForm, notes: e.target.value })} />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditingRecipe(false)} className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm">Annuler</button>
                    <button type="submit" className="flex-1 py-2 rounded-lg bg-amber-500 text-zinc-950 font-bold text-sm">Enregistrer</button>
                  </div>
                </form>
              )}

              {/* Ingredients list */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Ingr\u00e9dients ({selectedRecipe.items.length})</h4>
                {selectedRecipe.items.map((ri) => {
                  const lineCost = ri.quantity * ri.ingredient.costPerUnit;
                  return (
                    <div key={ri.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50">
                      <div>
                        <span className="text-sm text-white">{ri.ingredient.name}</span>
                        <span className="text-xs text-zinc-500 ml-2">{ri.quantity} {ri.unit}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400">{formatPrice(lineCost)} \u20ac</span>
                        <button onClick={() => handleRemoveItem(ri.id)}
                          className="text-zinc-600 hover:text-red-400 text-xs p-1">&#10005;</button>
                      </div>
                    </div>
                  );
                })}
                {selectedRecipe.items.length === 0 && (
                  <p className="text-zinc-500 text-xs text-center py-3">Aucun ingr\u00e9dient</p>
                )}
              </div>

              {/* Add ingredient form */}
              <form onSubmit={handleAddItem} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Ajouter un ingr\u00e9dient</h4>
                <div className="grid grid-cols-3 gap-2">
                  <select className={ic} value={addItemForm.ingredientId} onChange={(e) => {
                    const ing = ingredients.find((i) => i.id === e.target.value);
                    setAddItemForm({ ...addItemForm, ingredientId: e.target.value, unit: ing?.unit || addItemForm.unit });
                  }} required>
                    <option value="">Ingr\u00e9dient</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>{ing.name}</option>
                    ))}
                  </select>
                  <input className={ic} type="number" step="0.001" placeholder="Qt\u00e9" value={addItemForm.quantity} onChange={(e) => setAddItemForm({ ...addItemForm, quantity: e.target.value })} required />
                  <input className={ic} placeholder="Unit\u00e9" value={addItemForm.unit} onChange={(e) => setAddItemForm({ ...addItemForm, unit: e.target.value })} />
                </div>
                <button type="submit" className="w-full py-2 rounded-lg bg-amber-500 text-zinc-950 font-bold text-sm">Ajouter</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
