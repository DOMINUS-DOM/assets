export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, ADMIN_ROLES, unauthorized, forbidden } from '@/lib/auth';

// Driver updates their GPS position
export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || (auth.role !== 'livreur' && !ADMIN_ROLES.includes(auth.role))) return forbidden();

  const { driverId, lat, lng } = await req.json();

  if (!driverId || lat == null || lng == null) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  await prisma.driver.update({
    where: { id: driverId },
    data: { lastLat: lat, lastLng: lng, lastLocationAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

// Get all active drivers with their last known location
export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();
  const drivers = await prisma.driver.findMany({
    where: { active: true, lastLat: { not: null } },
    select: { id: true, name: true, lastLat: true, lastLng: true, lastLocationAt: true, zone: true },
  });

  return NextResponse.json(drivers);
}
