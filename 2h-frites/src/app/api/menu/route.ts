export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { categories as staticMenu } from '@/data/menu';
import { getAuthUser, ADMIN_ROLES, forbidden, enforceLocation } from '@/lib/auth';

// Menu key: global or per-location
function menuKey(locationId?: string | null): string {
  return locationId ? `menu-${locationId}` : 'menu';
}

export async function GET(req: NextRequest) {
  const locationId = req.nextUrl.searchParams.get('locationId');

  // Try location-specific menu first, then global, then static
  if (locationId) {
    const locMenu = await prisma.setting.findUnique({ where: { key: menuKey(locationId) } });
    if (locMenu) return NextResponse.json(JSON.parse(locMenu.value));
  }

  // Global menu
  const row = await prisma.setting.findUnique({ where: { key: 'menu' } });
  if (row) return NextResponse.json(JSON.parse(row.value));

  // First time: return static menu data as default
  return NextResponse.json(staticMenu);
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
