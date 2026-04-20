export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, getRequiredOrgId, resolveOrgFromRequest, ADMIN_ROLES, forbidden } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);

  // Admin: return everything, scoped to org
  if (auth && ADMIN_ROLES.includes(auth.role)) {
    const orgResult = getRequiredOrgId(req);
    if (!orgResult) return forbidden();
    const { orgId } = orgResult;
    const settingKey = `business-${orgId}`;
    const setting = await prisma.setting.findUnique({ where: { key: settingKey } });
    const full = setting ? JSON.parse(setting.value) : {};
    return NextResponse.json(full);
  }

  // Public: resolve org from slug, return safe subset
  const resolvedOrgId = await resolveOrgFromRequest(req);
  if (!resolvedOrgId) {
    return NextResponse.json({});
  }
  const settingKey = `business-${resolvedOrgId}`;
  const setting = await prisma.setting.findUnique({ where: { key: settingKey } });
  const full = setting ? JSON.parse(setting.value) : {};
  const { businessHours, name, address, phone, city, postalCode, deliveryZones, minimumOrder, closedDates } = full;
  return NextResponse.json({ businessHours, name, address, phone, city, postalCode, deliveryZones, minimumOrder, closedDates });
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  const orgResult = getRequiredOrgId(req);
  if (!orgResult) return forbidden();
  const { orgId } = orgResult;
  const settingKey = `business-${orgId}`;

  const body = await req.json();
  await prisma.setting.upsert({
    where: { key: settingKey },
    update: { value: JSON.stringify(body) },
    create: { key: settingKey, value: JSON.stringify(body) },
  });
  return NextResponse.json({ ok: true });
}
