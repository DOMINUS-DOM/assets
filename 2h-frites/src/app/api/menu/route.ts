export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, ADMIN_ROLES, forbidden, enforceLocation } from '@/lib/auth';

// Menu key: global or per-location
function menuKey(locationId?: string | null): string {
  return locationId ? `menu-${locationId}` : 'menu';
}

// Legacy endpoint kept only for backward compatibility with persistToApi writes.
// Reads NEVER fall back to a static or cross-tenant menu — return an empty array
// instead so a new tenant sees an empty catalogue (primary reads go through
// /api/menu/v2 which is fully tenant-scoped).
export async function GET(req: NextRequest) {
  const locationId = req.nextUrl.searchParams.get('locationId');

  if (locationId) {
    const locMenu = await prisma.setting.findUnique({ where: { key: menuKey(locationId) } });
    if (locMenu) return NextResponse.json(JSON.parse(locMenu.value));
  }

  // No location-specific menu — return empty, do not leak any global menu.
  return NextResponse.json([]);
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  const body = await req.json();
  const locationId = req.nextUrl.searchParams.get('locationId');
  const effectiveLocation = enforceLocation(auth, locationId);

  // Validate menu structure
  if (!Array.isArray(body) || body.length === 0) {
    return NextResponse.json({ error: 'invalid_menu_structure' }, { status: 400 });
  }

  const key = menuKey(effectiveLocation);
  await prisma.setting.upsert({
    where: { key },
    update: { value: JSON.stringify(body) },
    create: { key, value: JSON.stringify(body) },
  });
  return NextResponse.json({ ok: true });
}
