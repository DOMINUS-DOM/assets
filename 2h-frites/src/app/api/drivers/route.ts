export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, ADMIN_ROLES, forbidden, enforceLocation } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();
  const locationId = req.nextUrl.searchParams.get('locationId');
  const effectiveLocation = enforceLocation(auth, locationId);
  const locFilter = effectiveLocation ? { locationId: effectiveLocation } : {};
  const [drivers, applications] = await Promise.all([
    prisma.driver.findMany({ where: locFilter, orderBy: { name: 'asc' } }),
    prisma.driverApplication.findMany({ orderBy: { createdAt: 'desc' } }),
  ]);
  return NextResponse.json({ drivers, applications });
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  const body = await req.json();

  if (body.action === 'addDriver') {
    const driver = await prisma.driver.create({ data: body.data });
    return NextResponse.json(driver);
  }

  if (body.action === 'toggleActive') {
    const driver = await prisma.driver.findUnique({ where: { id: body.id } });
    if (driver) await prisma.driver.update({ where: { id: body.id }, data: { active: !driver.active } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'updateDriver') {
    const { id, ...data } = body.data || {};
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
    const driver = await prisma.driver.update({ where: { id }, data });
    return NextResponse.json(driver);
  }

  if (body.action === 'deleteDriver') {
    await prisma.driver.update({ where: { id: body.id }, data: { active: false } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'addApplication') {
    const app = await prisma.driverApplication.create({ data: body.data });
    return NextResponse.json(app);
  }

  if (body.action === 'updateApplicationStatus') {
    await prisma.driverApplication.update({ where: { id: body.id }, data: { status: body.status } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
