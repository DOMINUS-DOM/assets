export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Public endpoint — no auth required
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { locationId, date, timeSlot, partySize, customerName, customerPhone, customerEmail, notes } = body;

  if (!locationId || !date || !timeSlot || !partySize || !customerName || !customerPhone) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  // Calculate endTime (default 90 min)
  const duration = 90;
  const [h, m] = timeSlot.split(':').map(Number);
  const endMin = h * 60 + m + duration;
  const endTime = `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

  // Find available tables that fit the party size
  const tables = await prisma.floorTable.findMany({
    where: { locationId, active: true, capacity: { gte: partySize } },
    orderBy: { capacity: 'asc' }, // best-fit: smallest capacity first
  });

  // Get existing reservations overlapping this slot
  const reservations = await prisma.reservation.findMany({
    where: {
      locationId,
      date,
      status: { notIn: ['cancelled', 'no_show'] },
    },
    include: { tables: true },
  });

  const slotStart = h * 60 + m;
  const slotEnd = endMin;

  const occupiedTableIds = new Set<string>();
  for (const res of reservations) {
    const [rStartH, rStartM] = res.timeSlot.split(':').map(Number);
    const [rEndH, rEndM] = res.endTime.split(':').map(Number);
    const rStart = rStartH * 60 + rStartM;
    const rEnd = rEndH * 60 + rEndM;

    if (slotStart < rEnd && slotEnd > rStart) {
      for (const rt of res.tables) {
        occupiedTableIds.add(rt.tableId);
      }
    }
  }

  // Find best-fit table (smallest capacity >= partySize that is available)
  const bestTable = tables.find((t) => !occupiedTableIds.has(t.id));

  if (!bestTable) {
    return NextResponse.json({ error: 'no_tables_available' }, { status: 409 });
  }

  // Create reservation with auto-assigned table
  const reservation = await prisma.reservation.create({
    data: {
      locationId,
      date,
      timeSlot,
      endTime,
      duration,
      partySize,
      customerName,
      customerPhone,
      customerEmail: customerEmail || null,
      notes: notes || '',
      source: 'online',
      status: 'pending',
      tables: {
        create: [{ tableId: bestTable.id }],
      },
    },
    include: { tables: { include: { table: true } } },
  });

  // Mark table as reserved
  await prisma.floorTable.update({
    where: { id: bestTable.id },
    data: { status: 'reserved' },
  });

  return NextResponse.json({
    id: reservation.id,
    date: reservation.date,
    timeSlot: reservation.timeSlot,
    endTime: reservation.endTime,
    partySize: reservation.partySize,
    customerName: reservation.customerName,
    status: reservation.status,
    table: {
      number: bestTable.number,
      capacity: bestTable.capacity,
    },
  });
}
