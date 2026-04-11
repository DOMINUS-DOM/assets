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
  const tables = await prisma.floorTable.findMany({
    where: locFilter,
    orderBy: { number: 'asc' },
  });
  return NextResponse.json(tables);
}

const VALID_STATUSES = ['free', 'occupied', 'reserved', 'cleaning'];

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  const body = await req.json();

  if (body.action === 'create') {
    const { number, capacity, zone, locationId } = body;
    if (!number || !locationId) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    const table = await prisma.floorTable.create({
      data: { number, capacity: capacity || 4, zone: zone || 'main', locationId },
    });
    return NextResponse.json(table);
  }

  if (body.action === 'update') {
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
    const table = await prisma.floorTable.update({ where: { id }, data });
    return NextResponse.json(table);
  }

  if (body.action === 'delete') {
    if (!body.id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
    await prisma.floorTable.delete({ where: { id: body.id } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'updateStatus') {
    const { id, status } = body;
    if (!id || !status) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'invalid_status', valid: VALID_STATUSES }, { status: 400 });
    }
    const table = await prisma.floorTable.update({ where: { id }, data: { status } });
    return NextResponse.json(table);
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
