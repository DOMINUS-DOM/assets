/**
 * @jest-environment node
 *
 * Tests for the /api/onboarding/menu endpoint (blocker #4).
 * Runs against the Neon `test` branch via jest.setup.ts.
 *
 * Covers all 4 modes of the POST endpoint (create on empty, create on
 * existing → 409, replace wipe+reseed, skip no-op) plus the GET status
 * that the wizard uses to decide whether to open the modal.
 */
import { GET, POST } from '@/app/api/onboarding/menu/route';
import { prisma } from '@/lib/prisma';
import { mkTestOrg, cleanupTestOrgs, mkReq, withAuth } from './_helpers/multi-tenant';

// Tests hit the Neon test branch through an unpooled round-trip per row.
// mkTestOrg + bcrypt + the POST transaction routinely exceed the 5s default.
jest.setTimeout(30000);

// Minimal template, strictly conforming to the route's zod templateSchema.
// Total: 2 categories, 3 products.
const FAKE_TEMPLATE = {
  categories: [
    {
      slug: 'test-starters',
      name: 'Entrées test',
      icon: '🥗',
      products: [
        { name: 'Salade test', price: 8.5 },
        { name: 'Soupe test', price: 6 },
      ],
    },
    {
      slug: 'test-mains',
      name: 'Plats test',
      products: [{ name: 'Burger test', price: 14 }],
    },
  ],
};

beforeAll(async () => {
  await cleanupTestOrgs();
});

afterAll(async () => {
  await cleanupTestOrgs();
  await prisma.$disconnect();
});

// ─── Test 1 — POST create on empty location ──────────────────────────

test('POST create: empty location → 200, menu seeded', async () => {
  const { location, token } = await mkTestOrg('menu-create');

  const before = await prisma.menuCategory.count({ where: { locationId: location.id } });
  expect(before).toBe(0);

  const res = await POST(
    mkReq('http://localhost/api/onboarding/menu', {
      method: 'POST',
      headers: { ...withAuth(token), 'content-type': 'application/json' },
      body: JSON.stringify({ locationId: location.id, template: FAKE_TEMPLATE, mode: 'create' }),
    })
  );

  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.mode).toBe('create');
  expect(body.categoryCount).toBe(2);
  expect(body.productCount).toBe(3);

  expect(await prisma.menuCategory.count({ where: { locationId: location.id } })).toBe(2);
  expect(await prisma.menuProduct.count({ where: { category: { locationId: location.id } } })).toBe(3);
});

// ─── Test 2 — POST create on location that already has a menu ────────

test('POST create: location with existing menu → 409 menu_already_exists, no mutation', async () => {
  const { location, token } = await mkTestOrg('menu-conflict');

  // Seed directly via prisma so this test is decoupled from the create path.
  await prisma.menuCategory.create({
    data: { locationId: location.id, slug: 'existing-cat', nameKey: 'Existante' },
  });
  const before = await prisma.menuCategory.count({ where: { locationId: location.id } });
  expect(before).toBe(1);

  const res = await POST(
    mkReq('http://localhost/api/onboarding/menu', {
      method: 'POST',
      headers: { ...withAuth(token), 'content-type': 'application/json' },
      body: JSON.stringify({ locationId: location.id, template: FAKE_TEMPLATE, mode: 'create' }),
    })
  );

  expect(res.status).toBe(409);
  const body = await res.json();
  expect(body.error).toBe('menu_already_exists');

  // Nothing was added.
  const after = await prisma.menuCategory.count({ where: { locationId: location.id } });
  expect(after).toBe(before);
});

// ─── Test 3 — POST replace on location with menu ─────────────────────

test('POST replace: wipes existing categories + modifier groups and reseeds from template', async () => {
  const { location, token } = await mkTestOrg('menu-replace');

  // Pre-seed 3 categories, 5 products, 1 modifier group
  const oldCat1 = await prisma.menuCategory.create({
    data: { locationId: location.id, slug: 'old-cat-1', nameKey: 'Old 1' },
  });
  const oldCat2 = await prisma.menuCategory.create({
    data: { locationId: location.id, slug: 'old-cat-2', nameKey: 'Old 2' },
  });
  await prisma.menuCategory.create({
    data: { locationId: location.id, slug: 'old-cat-3', nameKey: 'Old 3' },
  });
  await prisma.menuProduct.createMany({
    data: [
      { categoryId: oldCat1.id, name: 'Old prod 1', price: 5 },
      { categoryId: oldCat1.id, name: 'Old prod 2', price: 6 },
      { categoryId: oldCat2.id, name: 'Old prod 3', price: 7 },
      { categoryId: oldCat2.id, name: 'Old prod 4', price: 8 },
      { categoryId: oldCat2.id, name: 'Old prod 5', price: 9 },
    ],
  });
  await prisma.modifierGroup.create({
    data: { locationId: location.id, name: 'Old modifier group' },
  });

  expect(await prisma.menuCategory.count({ where: { locationId: location.id } })).toBe(3);
  expect(await prisma.menuProduct.count({ where: { category: { locationId: location.id } } })).toBe(5);
  expect(await prisma.modifierGroup.count({ where: { locationId: location.id } })).toBe(1);

  const res = await POST(
    mkReq('http://localhost/api/onboarding/menu', {
      method: 'POST',
      headers: { ...withAuth(token), 'content-type': 'application/json' },
      body: JSON.stringify({ locationId: location.id, template: FAKE_TEMPLATE, mode: 'replace' }),
    })
  );

  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.mode).toBe('replace');

  // New menu in place, old wiped
  expect(await prisma.menuCategory.count({ where: { locationId: location.id } })).toBe(2);
  expect(await prisma.menuProduct.count({ where: { category: { locationId: location.id } } })).toBe(3);
  expect(await prisma.modifierGroup.count({ where: { locationId: location.id } })).toBe(0);

  // Slugs swapped: new template ones present, old ones gone
  const slugs = new Set(
    (await prisma.menuCategory.findMany({ where: { locationId: location.id }, select: { slug: true } })).map((c) => c.slug)
  );
  expect(slugs.has('test-starters')).toBe(true);
  expect(slugs.has('test-mains')).toBe(true);
  expect(slugs.has('old-cat-1')).toBe(false);
  expect(slugs.has('old-cat-2')).toBe(false);
  expect(slugs.has('old-cat-3')).toBe(false);
});

// ─── Test 4 — POST skip is a no-op ───────────────────────────────────

test('POST skip: no DB touch, returns { skipped: true }', async () => {
  const { location, token } = await mkTestOrg('menu-skip');

  await prisma.menuCategory.create({
    data: { locationId: location.id, slug: 'keep-me', nameKey: 'Garder' },
  });
  const before = await prisma.menuCategory.count({ where: { locationId: location.id } });

  const res = await POST(
    mkReq('http://localhost/api/onboarding/menu', {
      method: 'POST',
      headers: { ...withAuth(token), 'content-type': 'application/json' },
      body: JSON.stringify({ locationId: location.id, mode: 'skip' }),
    })
  );

  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.skipped).toBe(true);

  const after = await prisma.menuCategory.count({ where: { locationId: location.id } });
  expect(after).toBe(before);
});

// ─── Test 5 — GET status reflects the menu accurately ────────────────

test('GET status: reflects menu state (empty, then seeded)', async () => {
  const { location, token } = await mkTestOrg('menu-status');

  // Empty state
  let res = await GET(
    mkReq(`http://localhost/api/onboarding/menu?locationId=${location.id}`, {
      headers: withAuth(token),
    })
  );
  expect(res.status).toBe(200);
  let body = await res.json();
  expect(body.hasMenu).toBe(false);
  expect(body.categoryCount).toBe(0);
  expect(body.productCount).toBe(0);
  expect(body.modifierGroupCount).toBe(0);

  // Seed 1 cat + 1 product + 1 modifier group
  const cat = await prisma.menuCategory.create({
    data: { locationId: location.id, slug: 'some-cat', nameKey: 'Cat' },
  });
  await prisma.menuProduct.create({ data: { categoryId: cat.id, name: 'Prod', price: 10 } });
  await prisma.modifierGroup.create({ data: { locationId: location.id, name: 'Grp' } });

  res = await GET(
    mkReq(`http://localhost/api/onboarding/menu?locationId=${location.id}`, {
      headers: withAuth(token),
    })
  );
  expect(res.status).toBe(200);
  body = await res.json();
  expect(body.hasMenu).toBe(true);
  expect(body.categoryCount).toBe(1);
  expect(body.productCount).toBe(1);
  expect(body.modifierGroupCount).toBe(1);
});
