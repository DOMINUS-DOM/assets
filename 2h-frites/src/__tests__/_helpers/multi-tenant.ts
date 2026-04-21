/**
 * Shared test helpers for multi-tenant isolation tests.
 *
 * Tests run against the Neon `test` branch (see jest.setup.ts for the swap
 * and the DATABASE_URL === DATABASE_URL_TEST allowlist guard in env.ts).
 * Every fixture created here is prefixed `test-iso-` so cleanupTestOrgs()
 * can wipe the slate between runs without touching real tenants.
 *
 * Underscore-prefixed directory (__tests__/_helpers/) so jest does NOT
 * auto-discover it as a test file — only imported from `.test.ts` files.
 */
import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';
import bcryptjs from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createToken } from '@/lib/auth';

// ─── Fixture factory ─────────────────────────────────────────────────

/**
 * Create a fully-wired test tenant: Organization + Location + patron User +
 * OrderChannel (uber_eats, inactive) + a Bearer token for the patron.
 *
 * `suffix` disambiguates fixtures inside a single test run (e.g. 'iso-a',
 * 'iso-b'). The final slug is `test-iso-${suffix}-${timestamp}` so two
 * concurrent runs don't collide.
 */
export async function mkTestOrg(suffix: string) {
  const slug = `test-iso-${suffix}-${Date.now()}`;
  const email = `${slug}@test.local`;

  const org = await prisma.organization.create({
    data: {
      name: `Test ${suffix.toUpperCase()}`,
      slug,
      brandingJson: '{}',
      modulesJson: '{}',
    },
  });

  const location = await prisma.location.create({
    data: {
      organizationId: org.id,
      name: 'Main',
      slug: `${slug}-main`,
      address: 'x',
      city: 'x',
      postalCode: 'x',
      phone: '0',
      email,
    },
  });

  const passwordHash = bcryptjs.hashSync('password123', 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: 'Test Patron',
      phone: '0',
      role: 'patron',
      organizationId: org.id,
      locationId: location.id,
    },
  });

  const channel = await prisma.orderChannel.create({
    data: {
      name: 'uber_eats',
      active: false,
      commission: 30,
      organizationId: org.id,
    },
  });

  const token = createToken(user.id, 'patron', location.id, org.id);

  return { org, location, user, channel, token };
}

// ─── Teardown ────────────────────────────────────────────────────────

/**
 * Delete every organization whose slug starts with `test-iso-`.
 * Cascades via FK handle the full cleanup:
 *   Organization → Location → MenuCategory → MenuProduct → ...
 *   Organization → User (via organizationId SET NULL / relation)
 *   Organization → OrderChannel (Cascade, blocker #2)
 *
 * No age filter — on every run, beforeAll + afterAll should wipe everything
 * so leftover fixtures from a crashed run don't leak into the next.
 */
export async function cleanupTestOrgs(): Promise<void> {
  const orgs = await prisma.organization.findMany({
    where: { slug: { startsWith: 'test-iso-' } },
    select: { id: true },
  });
  if (orgs.length === 0) return;
  const ids = orgs.map((o) => o.id);

  // Some related rows (Employee, AuditLog, Order/OrderItem) may not cascade
  // cleanly in every schema corner — delete them best-effort first.
  const locs = await prisma.location.findMany({
    where: { organizationId: { in: ids } },
    select: { id: true },
  });
  const locIds = locs.map((l) => l.id);
  if (locIds.length > 0) {
    await prisma.employee.deleteMany({ where: { locationId: { in: locIds } } }).catch(() => {});
    // MenuCategory is scoped by location; cascade on MenuProduct from category.
    await prisma.menuCategory.deleteMany({ where: { locationId: { in: locIds } } }).catch(() => {});
    await prisma.modifierGroup.deleteMany({ where: { locationId: { in: locIds } } }).catch(() => {});
    await prisma.order.deleteMany({ where: { locationId: { in: locIds } } }).catch(() => {});
  }
  await prisma.orderChannel.deleteMany({ where: { organizationId: { in: ids } } }).catch(() => {});
  await prisma.user.deleteMany({ where: { organizationId: { in: ids } } }).catch(() => {});
  await prisma.location.deleteMany({ where: { organizationId: { in: ids } } }).catch(() => {});
  await prisma.organization.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
}

// ─── Request helpers ─────────────────────────────────────────────────

/**
 * Trivial NextRequest wrapper. Kept as a helper so tests don't have to
 * import NextRequest directly — keeps the test file read cleanly focused
 * on assertions.
 */
export function mkReq(url: string, opts?: ConstructorParameters<typeof NextRequest>[1]): NextRequest {
  return new NextRequest(url, opts);
}

/**
 * Build the Bearer authorization header. Tests use Bearer rather than
 * cookie because it's simpler (no cookie serialization) and
 * getAuthUser() accepts both.
 */
export function withAuth(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

// ─── Token forging (security test only) ──────────────────────────────

/**
 * Re-implements the HMAC signing in src/lib/auth.ts for test purposes.
 * Used to forge a token with an arbitrary secret (e.g. the old
 * 'dev-only-secret-not-for-prod' fallback that blocker #1 removed) and
 * prove verifyToken() rejects it.
 *
 * Mirrors the exact shape of createToken: base64url(JSON) + '.' +
 * base64url(hmac-sha256(secret, payload)).
 */
export function forgeToken(payload: Record<string, unknown>, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}
