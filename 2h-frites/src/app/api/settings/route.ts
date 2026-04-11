export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, ADMIN_ROLES, forbidden } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const setting = await prisma.setting.findUnique({ where: { key: 'business' } });
  const full = setting ? JSON.parse(setting.value) : {};

  // Admin: return everything
  const auth = getAuthUser(req);
  if (auth && ADMIN_ROLES.includes(auth.role)) {
    return NextResponse.json(full);
  }

  // Public: only safe subset (hours, address, delivery info)
  const { businessHours, name, address, phone, city, postalCode, deliveryZones, minimumOrder, closedDates } = full;
  return NextResponse.json({ businessHours, name, address, phone, city, postalCode, deliveryZones, minimumOrder, closedDates });
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  const body = await req.json();
  await prisma.setting.upsert({
    where: { key: 'business' },
    update: { value: JSON.stringify(body) },
    create: { key: 'business', value: JSON.stringify(body) },
  });
  return NextResponse.json({ ok: true });
}
