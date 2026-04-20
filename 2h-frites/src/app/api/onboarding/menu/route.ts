export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser, getRequiredOrgId, ADMIN_ROLES, forbidden, unauthorized } from '@/lib/auth';

/**
 * Onboarding wizard menu endpoint.
 *
 * GET  /api/onboarding/menu?locationId=X
 *   Returns the current menu footprint on that location so the wizard can
 *   decide whether to prompt the user (replace existing vs. keep).
 *
 * POST /api/onboarding/menu
 *   Body: { locationId, template?, mode: 'create' | 'replace' | 'skip' }
 *   - 'create'  → seed from template if location has no menu yet (409 otherwise)
 *   - 'replace' → hard-delete existing menu + modifier groups, then seed
 *   - 'skip'    → no-op (lets caller advance through the wizard)
 *
 * Tenant isolation: locationId is ALWAYS re-resolved through the caller's
 * organizationId before any read/write, so a patron from tenant A cannot
 * touch tenant B's menu by passing a foreign locationId.
 *
 * Safe-delete reasoning (see NOTES_AUDIT / blocker #4 pré-flight):
 *   - MenuCategory → MenuProduct → ProductSize / ProductModifierGroup /
 *     BuilderConfig all cascade on delete.
 *   - OrderItem.productId is nullable with onDelete=SET NULL and carries
 *     a full snapshot (name, price, categoryId, extras) — deleting a
 *     product detaches historical OrderItems without corrupting them.
 *   - So wiping a location's menu preserves order history.
 */

// ─── Shared helpers ─────────────────────────────────────────────────

async function resolveAuthorizedLocationId(
  req: NextRequest,
  locationId: string | null
): Promise<{ orgId: string; locationId: string } | NextResponse> {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  const orgResult = getRequiredOrgId(req);
  if (!orgResult || !orgResult.orgId) return forbidden();
  const { orgId } = orgResult;

  if (!locationId) {
    return NextResponse.json({ error: 'locationId_required' }, { status: 400 });
  }

  // Re-resolve via DB — never trust client-provided locationId
  const loc = await prisma.location.findFirst({
    where: { id: locationId, organizationId: orgId },
    select: { id: true },
  });
  if (!loc) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return { orgId, locationId: loc.id };
}

// ─── Template validation ────────────────────────────────────────────

const templateProductSchema = z.object({
  name: z.string().min(1),
  price: z.number(),
});
const templateCategorySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().optional(),
  products: z.array(templateProductSchema),
});
const templateSchema = z.object({
  categories: z.array(templateCategorySchema).min(1),
});
type Template = z.infer<typeof templateSchema>;

const postBodySchema = z.object({
  locationId: z.string().min(1),
  template: z.unknown().optional(),
  mode: z.enum(['create', 'replace', 'skip']),
});

// ─── Seed helper ────────────────────────────────────────────────────

/**
 * Seed menu from a validated template, inside a Prisma transaction.
 * Accepts `tx` (transaction client) so the entire seed is atomic — any
 * failure rolls back the whole operation.
 */
async function seedMenuFromTemplate(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  locationId: string,
  template: Template
): Promise<{ categoryCount: number; productCount: number }> {
  let categoryCount = 0;
  let productCount = 0;
  for (let ci = 0; ci < template.categories.length; ci++) {
    const cat = template.categories[ci];
    const created = await tx.menuCategory.create({
      data: {
        locationId,
        slug: cat.slug,
        nameKey: cat.name,
        icon: cat.icon || '🍽️',
        sortOrder: ci,
      },
    });
    categoryCount++;
    for (let pi = 0; pi < cat.products.length; pi++) {
      const p = cat.products[pi];
      await tx.menuProduct.create({
        data: {
          categoryId: created.id,
          name: p.name,
          price: p.price,
          sortOrder: pi,
        },
      });
      productCount++;
    }
  }
  return { categoryCount, productCount };
}

// ─── GET — status ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const locationIdParam = req.nextUrl.searchParams.get('locationId');
  const resolved = await resolveAuthorizedLocationId(req, locationIdParam);
  if (resolved instanceof NextResponse) return resolved;
  const { locationId } = resolved;

  const [categoryCount, productCount, modifierGroupCount] = await Promise.all([
    prisma.menuCategory.count({ where: { locationId } }),
    prisma.menuProduct.count({ where: { category: { locationId } } }),
    prisma.modifierGroup.count({ where: { locationId } }),
  ]);

  return NextResponse.json({
    hasMenu: categoryCount > 0,
    categoryCount,
    productCount,
    modifierGroupCount,
  });
}

// ─── POST — create | replace | skip ─────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const rawBody = await req.json().catch(() => null);
  const parsed = postBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
  }
  const { locationId: bodyLocationId, template, mode } = parsed.data;

  // Skip short-circuits before the DB lookup — useful if caller lost tenant context.
  if (mode === 'skip') {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Require a template for create / replace.
  const tplParsed = templateSchema.safeParse(template);
  if (!tplParsed.success) {
    return NextResponse.json({ error: 'template_required', issues: tplParsed.error.issues }, { status: 400 });
  }
  const validTemplate = tplParsed.data;

  const resolved = await resolveAuthorizedLocationId(req, bodyLocationId);
  if (resolved instanceof NextResponse) return resolved;
  const { locationId } = resolved;

  if (mode === 'create') {
    const existing = await prisma.menuCategory.count({ where: { locationId } });
    if (existing > 0) {
      return NextResponse.json({ error: 'menu_already_exists' }, { status: 409 });
    }
    const seeded = await prisma.$transaction((tx) => seedMenuFromTemplate(tx, locationId, validTemplate));
    return NextResponse.json({ ok: true, mode: 'create', ...seeded });
  }

  if (mode === 'replace') {
    const seeded = await prisma.$transaction(async (tx) => {
      // ModifierGroup is location-scoped and independent of categories.
      // Wipe it explicitly — cascade on ModifierGroup → Modifier and
      // ProductModifierGroup (via the deleted products) handles the rest.
      await tx.modifierGroup.deleteMany({ where: { locationId } });
      // MenuCategory deleteMany triggers cascade:
      //   MenuCategory → MenuProduct → ProductSize / BuilderConfig /
      //                                ProductModifierGroup
      // OrderItem.productId is nullable SET NULL, so orders survive.
      await tx.menuCategory.deleteMany({ where: { locationId } });
      return seedMenuFromTemplate(tx, locationId, validTemplate);
    });
    return NextResponse.json({ ok: true, mode: 'replace', ...seeded });
  }

  // Unreachable — zod enum covered all modes, but TS needs the return.
  return NextResponse.json({ error: 'unknown_mode' }, { status: 400 });
}
