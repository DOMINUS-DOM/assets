export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Driver updates their GPS position
export async function POST(req: NextRequest) {
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
export async function GET() {
  const drivers = await prisma.driver.findMany({
    where: { active: true, lastLat: { not: null } },
    select: { id: true, name: true, lastLat: true, lastLng: true, lastLocationAt: true, zone: true },
  });

  return NextResponse.json(drivers);
}
