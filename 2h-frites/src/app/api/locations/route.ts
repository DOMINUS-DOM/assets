export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, ADMIN_ROLES, forbidden } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);

  // Public access: return only active locations with minimal fields (for reserve page, etc.)
  if (!auth || !ADMIN_ROLES.includes(auth.role)) {
    const locations = await prisma.location.findMany({
      where: { active: true },
      select: { id: true, name: true, slug: true, address: true, city: true, phone: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(locations);
  }

  // Admin: return full location data
  const locations = await prisma.location.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(locations);
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  const body = await req.json();

  if (body.action === 'create') {
    const loc = await prisma.location.create({ data: body.data });
    return NextResponse.json(loc);
  }

  if (body.action === 'update') {
    const loc = await prisma.location.update({ where: { id: body.id }, data: body.data });
    return NextResponse.json(loc);
  }

  if (body.action === 'toggleActive') {
    const loc = await prisma.location.findUnique({ where: { id: body.id } });
    if (loc) await prisma.location.update({ where: { id: body.id }, data: { active: !loc.active } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'getStats') {
    const locations = await prisma.location.findMany({ where: { active: true } });
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
