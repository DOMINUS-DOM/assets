export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, getRequiredOrgId, getLocationIdsForOrg, ADMIN_ROLES, unauthorized, forbidden, enforceLocation } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  // Tenant isolation
  const orgResult = getRequiredOrgId(req);
  if (!orgResult) return forbidden();
  const { orgId } = orgResult;
  const orgLocationIds = await getLocationIdsForOrg(orgId);

  const locationId = req.nextUrl.searchParams.get('locationId');
  const effectiveLocation = enforceLocation(auth, locationId);
  const date = req.nextUrl.searchParams.get('date');
  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');

  const where: any = {};
  if (effectiveLocation) {
    // Verify the effective location belongs to the org
    if (!orgLocationIds.includes(effectiveLocation)) return forbidden();
    where.locationId = effectiveLocation;
  } else {
    where.locationId = { in: orgLocationIds };
  }
  if (date) where.date = date;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = from;
    if (to) where.date.lte = to;
  }

  const reservations = await prisma.reservation.findMany({
    where,
    include: { tables: { include: { table: true } } },
    orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
  });

  return NextResponse.json(reservations);
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  // Tenant isolation
  const orgResult = getRequiredOrgId(req);
  if (!orgResult) return forbidden();
  const { orgId } = orgResult;
  const orgLocationIds = await getLocationIdsForOrg(orgId);

  const body = await req.json();
  const { action } = body;

  if (action === 'create') {
    const {
      locationId, date, timeSlot, endTime, duration, partySize,
      customerName, customerPhone, customerEmail, notes, source, tableIds,
    } = body;

    const effectiveLocation = enforceLocation(auth, locationId);
    if (!effectiveLocation) {
      return NextResponse.json({ error: 'location_required' }, { status: 400 });
    }

    // Validate location belongs to org
    if (!orgLocationIds.includes(effectiveLocation)) {
      return NextResponse.json({ error: 'location_not_in_org' }, { status: 403 });
    }

    // Calculate endTime if not provided
    const dur = duration || 90;
    let computedEnd = endTime;
    if (!computedEnd && timeSlot) {
      const [h, m] = timeSlot.split(':').map(Number);
      const totalMin = h * 60 + m + dur;
      computedEnd = `${String(Math.floor(totalMin / 60) % 24).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
    }

    const reservation = await prisma.reservation.create({
      data: {
        locationId: effectiveLocation,
        date,
        timeSlot,
        endTime: computedEnd || timeSlot,
        duration: dur,
        partySize,
        customerName,
        customerPhone: customerPhone || '',
        customerEmail: customerEmail || null,
        notes: notes || '',
        source: source || 'admin',
        tables: tableIds?.length
          ? { create: tableIds.map((tableId: string) => ({ tableId })) }
          : undefined,
      },
      include: { tables: { include: { table: true } } },
    });

    // Update assigned tables status to 'reserved'
    if (tableIds?.length) {
      await prisma.floorTable.updateMany({
        where: { id: { in: tableIds } },
        data: { status: 'reserved' },
      });
    }

    return NextResponse.json(reservation);
  }

  if (action === 'updateStatus') {
    const { id, status } = body;
    const VALID = ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'];
    if (!id || !status || !VALID.includes(status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
    }

    // Tenant isolation: verify reservation belongs to org
    const existing = await prisma.reservation.findUnique({ where: { id }, select: { locationId: true } });
    if (!existing || !orgLocationIds.includes(existing.locationId)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data: { status },
      include: { tables: true },
    });

    const tableIds = reservation.tables.map((rt) => rt.tableId);
    if (tableIds.length > 0) {
      if (status === 'seated') {
        await prisma.floorTable.updateMany({
          where: { id: { in: tableIds } },
          data: { status: 'occupied' },
        });
      } else if (['completed', 'cancelled', 'no_show'].includes(status)) {
        await prisma.floorTable.updateMany({
          where: { id: { in: tableIds } },
          data: { status: 'free' },
        });
      }
    }

    return NextResponse.json({ ok: true });
  }

  if (action === 'update') {
    const { id, ...fields } = body;
    delete fields.action;

    // Tenant isolation: verify reservation belongs to org
    const existingUpd = await prisma.reservation.findUnique({ where: { id }, select: { locationId: true } });
    if (!existingUpd || !orgLocationIds.includes(existingUpd.locationId)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data: fields,
      include: { tables: { include: { table: true } } },
    });
    return NextResponse.json(reservation);
  }

  if (action === 'delete') {
    const { id } = body;
    // Free assigned tables before deleting
    const existing = await prisma.reservation.findUnique({
      where: { id },
      include: { tables: true },
    });

    // Tenant isolation: verify reservation belongs to org
    if (!existing || !orgLocationIds.includes(existing.locationId)) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    if (existing) {
      const tableIds = existing.tables.map((rt) => rt.tableId);
      if (tableIds.length > 0) {
        await prisma.floorTable.updateMany({
          where: { id: { in: tableIds } },
          data: { status: 'free' },
        });
      }
    }
    await prisma.reservation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  if (action === 'getSettings') {
    const effectiveLocation = enforceLocation(auth, body.locationId);
    if (!effectiveLocation) return NextResponse.json({ error: 'location_required' }, { status: 400 });
    if (!orgLocationIds.includes(effectiveLocation)) return forbidden();
    const location = await prisma.location.findUnique({ where: { id: effectiveLocation }, select: { settingsJson: true } });
    const settings = (() => { try { return JSON.parse(location?.settingsJson || '{}'); } catch { return {}; } })();
    return NextResponse.json(settings.reservations || {
      enabled: false,
      minPartySize: 1,
      maxPartySize: 12,
      slotDurationMinutes: 30,
      minAdvanceHours: 2,
      maxAdvanceDays: 30,
      maxReservationsPerSlot: 3,
      autoConfirm: true,
      requirePhone: true,
      closedDays: [],
      customSlots: {},
      confirmationMessage: '',
    });
  }

  if (action === 'saveSettings') {
    const effectiveLocation = enforceLocation(auth, body.locationId);
    if (!effectiveLocation) return NextResponse.json({ error: 'location_required' }, { status: 400 });
    if (!orgLocationIds.includes(effectiveLocation)) return forbidden();
    const location = await prisma.location.findUnique({ where: { id: effectiveLocation }, select: { settingsJson: true } });
    const settings = (() => { try { return JSON.parse(location?.settingsJson || '{}'); } catch { return {}; } })();
    settings.reservations = body.settings;
    await prisma.location.update({ where: { id: effectiveLocation }, data: { settingsJson: JSON.stringify(settings) } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
