export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Public endpoint — no auth required
export async function GET(req: NextRequest) {
  const locationId = req.nextUrl.searchParams.get('locationId');
  const date = req.nextUrl.searchParams.get('date');
  const partySizeParam = req.nextUrl.searchParams.get('partySize');

  if (!locationId || !date) {
    return NextResponse.json({ error: 'locationId and date are required' }, { status: 400 });
  }

  const partySize = partySizeParam ? parseInt(partySizeParam, 10) : 2;

  // Get location settings for business hours
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { settingsJson: true },
  });

  if (!location) {
    return NextResponse.json({ error: 'location_not_found' }, { status: 404 });
  }

  let settings: any = {};
  try { settings = JSON.parse(location.settingsJson); } catch {}

  // Determine opening hours for the given day
  const dayOfWeek = new Date(date + 'T12:00:00').getDay(); // 0=Sun
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek];

  // Default hours if not configured
  let openTime = '11:00';
  let closeTime = '22:00';

  if (settings.hours) {
    const dayHours = settings.hours[dayName] || settings.hours.default;
    if (dayHours) {
      if (dayHours.closed) {
        return NextResponse.json({ slots: [], closed: true });
      }
      openTime = dayHours.open || openTime;
      closeTime = dayHours.close || closeTime;
    }
  }

  // Get all tables for this location that can fit the party
  const tables = await prisma.floorTable.findMany({
    where: { locationId, active: true, capacity: { gte: partySize } },
    select: { id: true, capacity: true },
  });

  // Get existing reservations for this date (excluding cancelled/no_show)
  const reservations = await prisma.reservation.findMany({
    where: {
      locationId,
      date,
      status: { notIn: ['cancelled', 'no_show'] },
    },
    include: { tables: true },
  });

  // Generate 30-minute slots
  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;

  // Last seating 90 min before close
  const lastSeatingMin = closeMin - 90;

  const slots: { time: string; available: boolean; tablesAvailable: number }[] = [];

  for (let min = openMin; min <= lastSeatingMin; min += 30) {
    const slotTime = `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
    const slotEndMin = min + 90; // default reservation duration
    const slotEnd = `${String(Math.floor(slotEndMin / 60) % 24).padStart(2, '0')}:${String(slotEndMin % 60).padStart(2, '0')}`;

    // Find tables that are NOT occupied by an overlapping reservation
    const occupiedTableIds = new Set<string>();
    for (const res of reservations) {
      const [rStartH, rStartM] = res.timeSlot.split(':').map(Number);
      const [rEndH, rEndM] = res.endTime.split(':').map(Number);
      const rStart = rStartH * 60 + rStartM;
      const rEnd = rEndH * 60 + rEndM;

      // Check overlap: slot [min, slotEndMin) overlaps reservation [rStart, rEnd)
      if (min < rEnd && slotEndMin > rStart) {
        for (const rt of res.tables) {
          occupiedTableIds.add(rt.tableId);
        }
      }
    }

    const availableTables = tables.filter((t) => !occupiedTableIds.has(t.id));
    slots.push({
      time: slotTime,
      available: availableTables.length > 0,
      tablesAvailable: availableTables.length,
    });
  }

  return NextResponse.json({ slots });
}
