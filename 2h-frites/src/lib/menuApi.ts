/**
 * Menu Catalog v2 API client
 * All CRUD operations on relational menu models
 */

const getToken = () => typeof localStorage !== 'undefined' ? localStorage.getItem('2h-auth-token') : null;

async function post(action: string, data: Record<string, any> = {}) {
  const token = getToken();
  const res = await fetch('/api/menu/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, ...data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'unknown' }));
    throw new Error(err.message || err.error || 'API error');
  }
  return res.json();
}

async function get(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/menu/v2${qs ? '?' + qs : ''}`);
  if (!res.ok) throw new Error('Failed to load menu');
  return res.json();
}

// ─── Categories ───
export const menuApi = {
  // Full data (with modifiers and builder configs)
  loadFull: (locationId?: string) => get({ full: '1', ...(locationId ? { locationId } : {}) }),

  // Categories
  createCategory: (data: { slug: string; nameKey: string; icon?: string; builder?: boolean; note?: string; flatPrice?: number; locationId?: string }) =>
    post('createCategory', data),
  updateCategory: (id: string, data: Record<string, any>) =>
    post('updateCategory', { id, ...data }),
  deleteCategory: (id: string) => post('deleteCategory', { id }),
  reorderCategories: (orderedIds: string[]) => post('reorderCategories', { orderedIds }),

  // Products
  createProduct: (data: Record<string, any>) => post('createProduct', data),
  updateProduct: (id: string, data: Record<string, any>) => post('updateProduct', { id, ...data }),
  deleteProduct: (id: string) => post('deleteProduct', { id }),
  toggleProduct: (id: string) => post('toggleProduct', { id }),

  // Modifier Groups
  createModifierGroup: (data: Record<string, any>) => post('createModifierGroup', data),
  updateModifierGroup: (id: string, data: Record<string, any>) => post('updateModifierGroup', { id, ...data }),
  deleteModifierGroup: (id: string) => post('deleteModifierGroup', { id }),
  listModifierGroups: () => post('listModifierGroups'),

  // Modifiers
  createModifier: (data: Record<string, any>) => post('createModifier', data),
  updateModifier: (id: string, data: Record<string, any>) => post('updateModifier', { id, ...data }),
  deleteModifier: (id: string) => post('deleteModifier', { id }),

  // Product-Group Links
  linkModifierGroup: (productId: string, groupId: string, sortOrder?: number) =>
    post('linkModifierGroup', { productId, groupId, sortOrder }),
  unlinkModifierGroup: (id: string) => post('unlinkModifierGroup', { id }),

  // Builder Data (for GenericBuilder)
  getBuilderData: (productId: string) => post('getBuilderData', { productId }),

  // Builder Config
  saveBuilderConfig: (data: Record<string, any>) => post('saveBuilderConfig', data),
  deleteBuilderConfig: (productId: string) => post('deleteBuilderConfig', { productId }),
};
