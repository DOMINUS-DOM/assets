/**
 * @jest-environment node
 *
 * Permanent regression net for the multi-tenant isolation promise of
 * /api/channels (blocker #2). Runs against the Neon `test` branch via
 * jest.setup.ts (DATABASE_URL swap + allowlist guard).
 *
 * If any of these tests ever goes red, that's a real security regression
 * — not a data-shape flake. Inspect the route handler + enforceOrganization
 * plumbing before touching the test.
 */
import { GET, POST } from '@/app/api/channels/route';
import { prisma } from '@/lib/prisma';
import { mkTestOrg, cleanupTestOrgs, mkReq, withAuth, forgeToken } from './_helpers/multi-tenant';

// Tests hit the Neon test branch per row; default 5s is too tight.
jest.setTimeout(30000);

beforeAll(async () => {
  await cleanupTestOrgs();
});

afterAll(async () => {
  await cleanupTestOrgs();
  await prisma.$disconnect();
});

// ─── Test 1 — GET /api/channels isolation ────────────────────────────

test('GET /api/channels returns only the caller org channels', async () => {
  const a = await mkTestOrg('chan-a');
  const b = await mkTestOrg('chan-b');

  const rA = await GET(mkReq('http://localhost/api/channels', { headers: withAuth(a.token) }));
  const rB = await GET(mkReq('http://localhost/api/channels', { headers: withAuth(b.token) }));

  expect(rA.status).toBe(200);
  expect(rB.status).toBe(200);

  const listA = (await rA.json()) as Array<{ id: string }>;
  const listB = (await rB.json()) as Array<{ id: string }>;

  expect(listA).toHaveLength(1);
  expect(listB).toHaveLength(1);
  expect(listA[0].id).toBe(a.channel.id);
  expect(listB[0].id).toBe(b.channel.id);

  // Strict: no intersection between what A and B see.
  const idsA = new Set(listA.map((c) => c.id));
  const idsB = new Set(listB.map((c) => c.id));
  expect(idsA.has(b.channel.id)).toBe(false);
  expect(idsB.has(a.channel.id)).toBe(false);
});

// ─── Test 2 — POST incomingOrder cross-tenant ────────────────────────

test('POST incomingOrder with foreign locationId returns 404 and creates nothing', async () => {
  const a = await mkTestOrg('inj-a');
  const b = await mkTestOrg('inj-b');

  const ordersInBBefore = await prisma.order.count({ where: { locationId: b.location.id } });

  const res = await POST(
    mkReq('http://localhost/api/channels', {
      method: 'POST',
      headers: { ...withAuth(a.token), 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'incomingOrder',
        locationId: b.location.id, // tenant-B's location — A must not be able to inject there
        channel: 'uber_eats',
        customerName: 'Injector',
        total: 10,
        items: [],
      }),
    })
  );

  expect(res.status).toBe(404);

  const ordersInBAfter = await prisma.order.count({ where: { locationId: b.location.id } });
  expect(ordersInBAfter).toBe(ordersInBBefore);
});

// ─── Test 3 — Forged token with the removed dev-only secret ──────────

test('token forged with old dev fallback secret is rejected with 403 (no channel leak)', async () => {
  const b = await mkTestOrg('forge-b');

  // Forge a token whose signature uses the string that blocker #1 removed
  // from the codebase. If verifyToken() ever re-accepts that secret,
  // this test goes red.
  const fakePayload = {
    userId: 'fake-attacker',
    role: 'patron',
    organizationId: b.org.id,
    locationId: b.location.id,
    exp: Date.now() + 86400000,
  };
  const fakeToken = forgeToken(fakePayload, 'dev-only-secret-not-for-prod');

  const res = await GET(mkReq('http://localhost/api/channels', { headers: withAuth(fakeToken) }));

  // Strict status: verifyToken returns null on sig mismatch → getAuthUser
  // returns null → route's first guard calls forbidden() → 403.
  expect(res.status).toBe(403);

  const body = await res.json();
  // Paranoid extra: whatever the body shape, there must NOT be a channel
  // list leaked alongside the error.
  expect(Array.isArray(body)).toBe(false);
  expect(body.id).toBeUndefined();
  expect(body.name).toBeUndefined();
});

// ─── Test 4 — POST toggle ownership mismatch ─────────────────────────

test('POST toggle on a foreign channel returns 404 and does not mutate', async () => {
  const a = await mkTestOrg('togg-a');
  const b = await mkTestOrg('togg-b');

  const res = await POST(
    mkReq('http://localhost/api/channels', {
      method: 'POST',
      headers: { ...withAuth(a.token), 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', id: b.channel.id }),
    })
  );

  // 404, not 403 — we deliberately avoid leaking existence of foreign channels.
  expect(res.status).toBe(404);

  const chanAfter = await prisma.orderChannel.findUnique({ where: { id: b.channel.id } });
  expect(chanAfter?.active).toBe(false); // mkTestOrg seeded active=false, must be unchanged
});
