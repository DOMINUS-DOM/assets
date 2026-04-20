export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, getRequiredOrgId, resolveOrgFromRequest, ADMIN_ROLES, unauthorized, forbidden } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);

  // Public access: return only active locations with minimal fields (for reserve page, etc.)
  if (!auth || !ADMIN_ROLES.includes(auth.role)) {
    const orgId = await resolveOrgFromRequest(req);
    if (!orgId) return NextResponse.json([]);
    const locations = await prisma.location.findMany({
      where: { organizationId: orgId, active: true },
      select: { id: true, name: true, slug: true, address: true, city: true, phone: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(locations);
  }

  // Admin: return full location data scoped to org
  const result = getRequiredOrgId(req);
  if (!result) return unauthorized();
  const { orgId } = result;
  const locations = await prisma.location.findMany({
    where: orgId ? { organizationId: orgId } : undefined,
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(locations);
}

export async function POST(req: NextRequest) {
  const result = getRequiredOrgId(req);
  if (!result) return unauthorized();
  const { auth, orgId } = result;
  if (!ADMIN_ROLES.includes(auth.role)) return forbidden();
  if (!orgId) return forbidden(); // org must be resolvable for all POST actions

  const body = await req.json();

  if (body.action === 'create') {
    const loc = await prisma.location.create({ data: { ...body.data, organizationId: orgId } });
    return NextResponse.json(loc);
  }

  if (body.action === 'update') {
    const existing = await prisma.location.findUnique({ where: { id: body.id } });
    if (!existing || existing.organizationId !== orgId) return forbidden();
    const loc = await prisma.location.update({ where: { id: body.id }, data: body.data });
    return NextResponse.json(loc);
  }

  if (body.action === 'toggleActive') {
    const loc = await prisma.location.findUnique({ where: { id: body.id } });
    if (!loc || loc.organizationId !== orgId) return forbidden();
    await prisma.location.update({ where: { id: body.id }, data: { active: !loc.active } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'getStats') {
    const locations = await prisma.location.findMany({ where: { organizationId: orgId, active: true } });
    const stats = await Promise.all(locations.map(async (loc) => {
      const orderCount = await prisma.order.count({ where: { locationId: loc.id } });
      const revenue = await prisma.order.aggregate({ where: { locationId: loc.id, paymentStatus: 'paid' }, _sum: { total: true } });
      const staffCount = await prisma.employee.count({ where: { locationId: loc.id, active: true } });
      return { ...loc, orderCount, revenue: revenue._sum.total || 0, staffCount };
    }));
    return NextResponse.json(stats);
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
