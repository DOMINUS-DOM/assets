export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, getRequiredOrgId, getLocationIdsForOrg, resolveOrgFromRequest, ADMIN_ROLES, forbidden } from '@/lib/auth';
import { Category, MenuItem, SizeVariant } from '@/types';

/**
 * GET /api/menu/v2 — Read menu from relational models
 *
 * Returns the same Category[] format as the legacy /api/menu endpoint
 * so that POS, kiosk, and client code needs zero changes.
 *
 * Query params:
 *   ?locationId=xxx  — load location-specific categories (falls back to global)
 *   ?full=1          — include modifier groups and builder configs (for admin)
 */
export async function GET(req: NextRequest) {
  const locationId = req.nextUrl.searchParams.get('locationId');
  const full = req.nextUrl.searchParams.get('full') === '1';

  try {
    // Resolve org — authenticated user first, then public slug header
    let orgId: string | null = null;
    const authResult = getRequiredOrgId(req);
    if (authResult) {
      orgId = authResult.orgId;
    } else {
      orgId = await resolveOrgFromRequest(req);
    }

    if (!orgId) {
      return NextResponse.json([]);
    }

    const orgLocationIds = await getLocationIdsForOrg(orgId);
    if (orgLocationIds.length === 0) {
      return NextResponse.json([]);
    }

    // If a specific locationId is requested, validate it belongs to this org
    let filterLocationIds = orgLocationIds;
    if (locationId && orgLocationIds.includes(locationId)) {
      filterLocationIds = [locationId];
    }

    // Fetch categories with products and sizes — scoped to org locations
    const dbCategories = await prisma.menuCategory.findMany({
      where: {
        active: true,
        locationId: { in: filterLocationIds },
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            sizes: { orderBy: { sortOrder: 'asc' } },
            ...(full ? {
              modifierLinks: {
                orderBy: { sortOrder: 'asc' },
                include: {
                  group: {
                    include: {
                      modifiers: {
                        where: { active: true },
                        orderBy: { sortOrder: 'asc' },
                      },
                    },
                  },
                },
              },
              builderConfig: true,
            } : {}),
          },
        },
      },
    });

    if (full) {
      // Return the raw relational data for admin
      return NextResponse.json(dbCategories);
    }

    // Transform to legacy Category[] format for compatibility
    const categories: Category[] = dbCategories.map((cat) => {
      const items: MenuItem[] = cat.items.map((p) => {
        const item: MenuItem = {
          id: p.nameKey || p.id,  // Use nameKey as ID for i18n compatibility
          name: p.name,
          currency: '€',
          price: p.price || undefined,
          tags: safeJsonParse(p.tags, []),
          allergens: safeJsonParse(p.allergens, []),
          subcategory: p.subcategory || undefined,
          priceLabel: p.priceLabel || undefined,
          descriptionKey: p.descKey || undefined,
          unavailable: !p.active,
          imageUrl: p.imageUrl || undefined,
        };

        // Add sizes if any
        if (p.sizes.length > 0) {
          item.sizes = p.sizes.map((s): SizeVariant => ({
            sizeKey: s.sizeKey,
            price: s.price,
          }));
        }

        return item;
      });

      const category: Category = {
        id: cat.slug.replace(/-/g, '_'), // Normalize slug to match legacy IDs
        slug: cat.slug,
        nameKey: cat.nameKey,
        icon: cat.icon,
        imageUrl: cat.imageUrl || undefined,
        items,
        builder: cat.builder || undefined,
        note: cat.note || undefined,
      };

      if (cat.flatPrice) {
        category.flatPrice = { price: cat.flatPrice, labelKey: 'allSaucesPrice' };
      }

      return category;
    });

    return NextResponse.json(categories);
  } catch (error: any) {
    console.error('[menu/v2] GET error:', error);
    return NextResponse.json({ error: 'fetch_failed', message: error.message }, { status: 500 });
  }
}

/**
 * POST /api/menu/v2 — CRUD operations on menu catalog
 *
 * Actions:
 *   createCategory, updateCategory, deleteCategory, reorderCategories
 *   createProduct, updateProduct, deleteProduct, toggleProduct
 *   createModifierGroup, updateModifierGroup, deleteModifierGroup
 *   createModifier, updateModifier, deleteModifier
 *   linkModifierGroup, unlinkModifierGroup
 *   saveBuilderConfig, deleteBuilderConfig
 */
export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  const orgResult = getRequiredOrgId(req);
  if (!orgResult) return NextResponse.json({ error: 'forbidden', message: 'No organization context' }, { status: 403 });
  const { orgId } = orgResult;
  const locationIds = await getLocationIdsForOrg(orgId);
  if (locationIds.length === 0) return NextResponse.json({ error: 'forbidden', message: 'No locations for organization' }, { status: 403 });

  // Helper: verify a category belongs to this org
  async function assertCategoryOwnership(categoryId: string) {
    const cat = await prisma.menuCategory.findUnique({ where: { id: categoryId }, select: { locationId: true } });
    if (!cat || !cat.locationId || !locationIds.includes(cat.locationId)) return false;
    return true;
  }

  // Helper: verify a product belongs to this org (via its category)
  async function assertProductOwnership(productId: string) {
    const product = await prisma.menuProduct.findUnique({ where: { id: productId }, select: { category: { select: { locationId: true } } } });
    if (!product || !product.category.locationId || !locationIds.includes(product.category.locationId)) return false;
    return true;
  }

  // Helper: verify a modifier group belongs to this org
  async function assertModifierGroupOwnership(groupId: string) {
    const group = await prisma.modifierGroup.findUnique({ where: { id: groupId }, select: { locationId: true } });
    if (!group || !group.locationId || !locationIds.includes(group.locationId)) return false;
    return true;
  }

  const body = await req.json();
  const { action } = body;

  try {
    // ─── Categories ───
    if (action === 'createCategory') {
      const { slug, nameKey, icon, imageUrl, sortOrder, builder, note, flatPrice, locationId } = body;
      // Validate locationId belongs to org, default to first location
      const resolvedLocationId = locationId && locationIds.includes(locationId) ? locationId : locationIds[0];
      const cat = await prisma.menuCategory.create({
        data: { slug, nameKey, icon: icon || '🍽️', imageUrl, sortOrder: sortOrder || 0, builder: builder || false, note, flatPrice, locationId: resolvedLocationId },
      });
      return NextResponse.json(cat);
    }

    if (action === 'updateCategory') {
      const { id, action: _, ...data } = body;
      if (!(await assertCategoryOwnership(id))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      // If updating locationId, validate the new one too
      if (data.locationId && !locationIds.includes(data.locationId)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      const cat = await prisma.menuCategory.update({ where: { id }, data });
      return NextResponse.json(cat);
    }

    if (action === 'deleteCategory') {
      if (!(await assertCategoryOwnership(body.id))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      // Cleanup Cloudinary assets (category + all its products) before the DB delete cascades.
      const cat = await prisma.menuCategory.findUnique({
        where: { id: body.id },
        select: { imageUrl: true, items: { select: { imageUrl: true } } },
      });
      await prisma.menuCategory.delete({ where: { id: body.id } });
      // Fire-and-forget best-effort cleanup — don't block the response.
      if (cat) {
        const { destroyCloudinaryAsset } = await import('@/lib/cloudinaryAdmin');
        destroyCloudinaryAsset(cat.imageUrl);
        cat.items.forEach((p) => destroyCloudinaryAsset(p.imageUrl));
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'reorderCategories') {
      const { orderedIds } = body;
      // Verify all categories belong to this org
      for (const catId of orderedIds) {
        if (!(await assertCategoryOwnership(catId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      for (let i = 0; i < orderedIds.length; i++) {
        await prisma.menuCategory.update({ where: { id: orderedIds[i] }, data: { sortOrder: i } });
      }
      return NextResponse.json({ ok: true });
    }

    // ─── Products ───
    if (action === 'createProduct') {
      const { categoryId, name, nameKey, descKey, price, tags, allergens, subcategory, priceLabel, imageUrl, sizes, available, visibleOnPos, visibleOnWeb, visibleOnKiosk } = body;
      // Verify the target category belongs to this org
      if (!(await assertCategoryOwnership(categoryId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      const product = await prisma.menuProduct.create({
        data: {
          categoryId,
          name,
          nameKey,
          descKey,
          price: price != null ? parseFloat(price) : null,
          tags: JSON.stringify(tags || []),
          allergens: JSON.stringify(allergens || []),
          subcategory,
          priceLabel,
          imageUrl,
          available: available !== false,
          visibleOnPos: visibleOnPos !== false,
          visibleOnWeb: visibleOnWeb !== false,
          visibleOnKiosk: visibleOnKiosk !== false,
        },
      });

      // Create sizes if provided
      if (sizes && Array.isArray(sizes)) {
        for (let i = 0; i < sizes.length; i++) {
          await prisma.productSize.create({
            data: { productId: product.id, sizeKey: sizes[i].sizeKey, price: parseFloat(sizes[i].price), sortOrder: i },
          });
        }
      }

      const result = await prisma.menuProduct.findUnique({
        where: { id: product.id },
        include: { sizes: true, modifierLinks: { include: { group: true } }, builderConfig: true },
      });
      return NextResponse.json(result);
    }

    if (action === 'updateProduct') {
      const { id, sizes, action: _, ...data } = body;
      if (!(await assertProductOwnership(id))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      // If moving to a different category, validate it too
      if (data.categoryId && !(await assertCategoryOwnership(data.categoryId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      // Clean data: convert tags/allergens to JSON strings if arrays
      if (Array.isArray(data.tags)) data.tags = JSON.stringify(data.tags);
      if (Array.isArray(data.allergens)) data.allergens = JSON.stringify(data.allergens);
      if (data.price != null) data.price = parseFloat(data.price);

      const product = await prisma.menuProduct.update({ where: { id }, data });

      // Update sizes if provided
      if (sizes && Array.isArray(sizes)) {
        await prisma.productSize.deleteMany({ where: { productId: id } });
        for (let i = 0; i < sizes.length; i++) {
          await prisma.productSize.create({
            data: { productId: id, sizeKey: sizes[i].sizeKey, price: parseFloat(sizes[i].price), sortOrder: i },
          });
        }
      }

      const result = await prisma.menuProduct.findUnique({
        where: { id },
        include: { sizes: true, modifierLinks: { include: { group: true } }, builderConfig: true },
      });
      return NextResponse.json(result);
    }

    if (action === 'deleteProduct') {
      if (!(await assertProductOwnership(body.id))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      const prod = await prisma.menuProduct.findUnique({ where: { id: body.id }, select: { imageUrl: true } });
      await prisma.menuProduct.delete({ where: { id: body.id } });
      if (prod?.imageUrl) {
        const { destroyCloudinaryAsset } = await import('@/lib/cloudinaryAdmin');
        destroyCloudinaryAsset(prod.imageUrl);
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'toggleProduct') {
      if (!(await assertProductOwnership(body.id))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      const product = await prisma.menuProduct.findUnique({ where: { id: body.id } });
      if (!product) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      const updated = await prisma.menuProduct.update({
        where: { id: body.id },
        data: { active: !product.active },
      });
      return NextResponse.json(updated);
    }

    // ─── Modifier Groups ───
    if (action === 'createModifierGroup') {
      const { name, nameKey, minSelect, maxSelect, required, sortOrder, locationId } = body;
      // Validate locationId belongs to org, default to first location
      const resolvedLocationId = locationId && locationIds.includes(locationId) ? locationId : locationIds[0];
      const group = await prisma.modifierGroup.create({
        data: { name, nameKey, minSelect: minSelect || 0, maxSelect: maxSelect || 1, required: required || false, sortOrder: sortOrder || 0, locationId: resolvedLocationId },
      });
      return NextResponse.json(group);
    }

    if (action === 'updateModifierGroup') {
      const { id, action: _, ...data } = body;
      if (!(await assertModifierGroupOwnership(id))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      // If updating locationId, validate the new one too
      if (data.locationId && !locationIds.includes(data.locationId)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      const group = await prisma.modifierGroup.update({ where: { id }, data });
      return NextResponse.json(group);
    }

    if (action === 'deleteModifierGroup') {
      if (!(await assertModifierGroupOwnership(body.id))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      await prisma.modifierGroup.delete({ where: { id: body.id } });
      return NextResponse.json({ ok: true });
    }

    // ─── Modifiers ───
    if (action === 'createModifier') {
      const { groupId, name, nameKey, price, sortOrder } = body;
      if (!(await assertModifierGroupOwnership(groupId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      const mod = await prisma.modifier.create({
        data: { groupId, name, nameKey, price: price || 0, sortOrder: sortOrder || 0 },
      });
      return NextResponse.json(mod);
    }

    if (action === 'updateModifier') {
      const { id, action: _, ...data } = body;
      // Verify modifier's group belongs to this org
      const modForCheck = await prisma.modifier.findUnique({ where: { id }, select: { groupId: true } });
      if (!modForCheck || !(await assertModifierGroupOwnership(modForCheck.groupId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      if (data.price != null) data.price = parseFloat(data.price);
      const mod = await prisma.modifier.update({ where: { id }, data });
      return NextResponse.json(mod);
    }

    if (action === 'deleteModifier') {
      const modForCheck = await prisma.modifier.findUnique({ where: { id: body.id }, select: { groupId: true } });
      if (!modForCheck || !(await assertModifierGroupOwnership(modForCheck.groupId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      await prisma.modifier.delete({ where: { id: body.id } });
      return NextResponse.json({ ok: true });
    }

    // ─── Product-ModifierGroup Links ───
    if (action === 'linkModifierGroup') {
      const { productId, groupId, sortOrder } = body;
      if (!(await assertProductOwnership(productId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      if (!(await assertModifierGroupOwnership(groupId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      const link = await prisma.productModifierGroup.create({
        data: { productId, groupId, sortOrder: sortOrder || 0 },
      });
      return NextResponse.json(link);
    }

    if (action === 'unlinkModifierGroup') {
      // Verify the link's product belongs to this org
      const link = await prisma.productModifierGroup.findUnique({ where: { id: body.id }, select: { productId: true } });
      if (!link || !(await assertProductOwnership(link.productId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      await prisma.productModifierGroup.delete({ where: { id: body.id } });
      return NextResponse.json({ ok: true });
    }

    // ─── Builder Config ───
    if (action === 'saveBuilderConfig') {
      const { productId, basePrice, steps, options } = body;
      if (!(await assertProductOwnership(productId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      const config = await prisma.builderConfig.upsert({
        where: { productId },
        create: {
          productId,
          basePrice: parseFloat(basePrice),
          steps: typeof steps === 'string' ? steps : JSON.stringify(steps),
          options: options ? (typeof options === 'string' ? options : JSON.stringify(options)) : null,
        },
        update: {
          basePrice: parseFloat(basePrice),
          steps: typeof steps === 'string' ? steps : JSON.stringify(steps),
          options: options ? (typeof options === 'string' ? options : JSON.stringify(options)) : null,
        },
      });
      return NextResponse.json(config);
    }

    if (action === 'deleteBuilderConfig') {
      if (!(await assertProductOwnership(body.productId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      await prisma.builderConfig.delete({ where: { productId: body.productId } });
      return NextResponse.json({ ok: true });
    }

    // ─── Builder Data (for GenericBuilder) ───
    if (action === 'getBuilderData') {
      const { productId } = body;
      if (!(await assertProductOwnership(productId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      const product = await prisma.menuProduct.findUnique({
        where: { id: productId },
        include: {
          builderConfig: true,
          modifierLinks: {
            orderBy: { sortOrder: 'asc' },
            include: {
              group: {
                include: { modifiers: { where: { active: true }, orderBy: { sortOrder: 'asc' } } },
              },
            },
          },
          category: { select: { slug: true, nameKey: true } },
        },
      });
      if (!product) return NextResponse.json({ error: 'not_found' }, { status: 404 });

      // Parse builder config
      const builderConfig = product.builderConfig ? {
        basePrice: product.builderConfig.basePrice,
        steps: safeJsonParse(product.builderConfig.steps, []),
        options: safeJsonParse(product.builderConfig.options, {}),
      } : null;

      // Build modifier groups map for step resolution
      const modifierGroups = product.modifierLinks.map((l) => ({
        id: l.group.id,
        name: l.group.name,
        nameKey: l.group.nameKey,
        minSelect: l.group.minSelect,
        maxSelect: l.group.maxSelect,
        modifiers: l.group.modifiers.map((m) => ({
          id: m.id,
          name: m.name,
          nameKey: m.nameKey,
          price: m.price,
        })),
      }));

      // Also resolve groupIds in builder steps to include modifiers inline
      if (builderConfig) {
        for (const step of builderConfig.steps as any[]) {
          if (step.groupId) {
            // Find group from linked groups or fetch it
            let group = modifierGroups.find((g: any) => g.id === step.groupId);
            if (!group) {
              const dbGroup = await prisma.modifierGroup.findUnique({
                where: { id: step.groupId },
                include: { modifiers: { where: { active: true }, orderBy: { sortOrder: 'asc' } } },
              });
              if (dbGroup) {
                group = {
                  id: dbGroup.id, name: dbGroup.name, nameKey: dbGroup.nameKey,
                  minSelect: dbGroup.minSelect, maxSelect: dbGroup.maxSelect,
                  modifiers: dbGroup.modifiers.map((m) => ({ id: m.id, name: m.name, nameKey: m.nameKey, price: m.price })),
                };
              }
            }
            if (group) {
              step.modifiers = group.modifiers;
              step.groupName = group.name;
              if (!step.maxSelect) step.maxSelect = group.maxSelect;
            }
          }
        }
      }

      return NextResponse.json({
        product: {
          id: product.id,
          name: product.name,
          nameKey: product.nameKey,
          price: product.price,
          categorySlug: product.category.slug,
          categoryNameKey: product.category.nameKey,
        },
        builderConfig,
        modifierGroups,
      });
    }

    // ─── Bulk: Get all modifier groups ───
    if (action === 'listModifierGroups') {
      const groups = await prisma.modifierGroup.findMany({
        where: { locationId: { in: locationIds } },
        orderBy: { sortOrder: 'asc' },
        include: {
          modifiers: { where: { active: true }, orderBy: { sortOrder: 'asc' } },
        },
      });
      return NextResponse.json(groups);
    }

    return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
  } catch (error: any) {
    console.error('[menu/v2] POST error:', error);
    return NextResponse.json({ error: 'action_failed', message: error.message }, { status: 500 });
  }
}

// ─── Helpers ───
function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try { return JSON.parse(json); } catch { return fallback; }
}
