/**
 * @jest-environment node
 *
 * Regression net for the 3 bugs diagnosed 2026-04-22 :
 *   - Bug A (logo rendering) → getCloudinaryUrl passes public_ids and
 *     absolute URLs through correctly.
 *   - Bug B (hours shape) → /api/settings persists the body flat and the
 *     reload reads it flat. The wrapped legacy shape is demonstrably
 *     broken (proving why migration of existing rows is needed).
 *
 * These tests would be red without the corresponding fixes — they are the
 * proof that no future refactor can silently break the save/reload cycle.
 */
import { POST as settingsPOST, GET as settingsGET } from '@/app/api/settings/route';
import { getCloudinaryUrl } from '@/lib/cloudinaryUrl';
import { prisma } from '@/lib/prisma';
import { mkTestOrg, cleanupTestOrgs, mkReq, withAuth } from './_helpers/multi-tenant';

jest.setTimeout(30000);

beforeAll(async () => {
  await cleanupTestOrgs();
});
afterAll(async () => {
  await cleanupTestOrgs();
  await prisma.$disconnect();
});

// ─── Bug A — getCloudinaryUrl handles both formats ───────────────────

describe('getCloudinaryUrl', () => {
  it('returns null when the input is empty (no broken <img src=""> render)', () => {
    expect(getCloudinaryUrl(null)).toBeNull();
    expect(getCloudinaryUrl(undefined)).toBeNull();
    expect(getCloudinaryUrl('')).toBeNull();
  });

  it('builds a Cloudinary URL from a bare public_id using the preset transforms', () => {
    const url = getCloudinaryUrl('tenants/2h-frites/categories/logo-abc', 'admin-preview');
    expect(url).toMatch(/^https:\/\/res\.cloudinary\.com\/.+\/image\/upload\/.+\/tenants\/2h-frites\/categories\/logo-abc$/);
    // admin-preview preset spans w_240,h_240
    expect(url).toContain('w_240,h_240');
  });

  it('passes through absolute https:// URLs untouched (legacy row compatibility)', () => {
    const legacyUrl = 'https://res.cloudinary.com/dnutqg4yv/image/upload/v123/abc.png';
    expect(getCloudinaryUrl(legacyUrl, 'admin-preview')).toBe(legacyUrl);
  });
});

// ─── Bug B — /api/settings flat shape round-trip ─────────────────────

describe('POST /api/settings — flat settings round-trip (Bug B fix)', () => {
  it('stores the body verbatim and GET returns the same flat shape', async () => {
    const { org, token } = await mkTestOrg('settings-flat');

    const payload = {
      hours: [
        { day: 0, open: '09:00', close: '22:00', closed: false },
        { day: 1, open: '09:00', close: '22:00', closed: false },
      ],
      name: 'Test Resto',
      phone: '+32000',
      vatRate: 0.06,
      vatRateDrinks: 0.21,
      acceptPickup: true,
      acceptDelivery: false,
    };

    const postRes = await settingsPOST(
      mkReq('http://localhost/api/settings', {
        method: 'POST',
        headers: { ...withAuth(token), 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );
    expect(postRes.status).toBe(200);

    const getRes = await settingsGET(
      mkReq('http://localhost/api/settings', { headers: withAuth(token) })
    );
    expect(getRes.status).toBe(200);
    const body = await getRes.json();

    // hours must be reachable as `body.hours`, NOT `body.settings.hours`
    expect(body.hours).toEqual(payload.hours);
    expect(body.name).toBe('Test Resto');
    expect(body.settings).toBeUndefined();

    // Cleanup the Setting row (mkTestOrg cleanup doesn't handle Setting)
    await prisma.setting.deleteMany({ where: { key: `business-${org.id}` } });
  });
});

// ─── Bug B — legacy wrapped shape is demonstrably broken ─────────────

describe('POST /api/settings — legacy wrapped shape exposes the reload bug', () => {
  it('when stored as {action, settings:{hours:[...]}}, body.hours is undefined on reload (proof migration is required for existing rows)', async () => {
    const { org, token } = await mkTestOrg('settings-wrapped-legacy');

    // Simulate what the PRE-fix wizard stored
    await settingsPOST(
      mkReq('http://localhost/api/settings', {
        method: 'POST',
        headers: { ...withAuth(token), 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          settings: {
            hours: [{ day: 0, open: '10:00', close: '20:00', closed: false }],
            acceptPickup: true,
          },
        }),
      })
    );

    const getRes = await settingsGET(
      mkReq('http://localhost/api/settings', { headers: withAuth(token) })
    );
    const body = await getRes.json();

    // The bug: data is there, but at the wrong key. The settings page reads
    // body.hours directly, so it sees undefined → empty hours table.
    expect(body.hours).toBeUndefined();
    expect(body.settings?.hours).toBeDefined();
    expect(body.settings.hours).toHaveLength(1);

    await prisma.setting.deleteMany({ where: { key: `business-${org.id}` } });
  });
});
