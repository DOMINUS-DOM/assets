export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, ADMIN_ROLES, unauthorized, forbidden } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (!ADMIN_ROLES.includes(auth.role)) return forbidden();

  const screenId = req.nextUrl.searchParams.get('screenId');
  const locationId = req.nextUrl.searchParams.get('locationId');

  const where: Record<string, unknown> = {};
  if (screenId) {
    where.screenId = screenId;
  } else if (locationId) {
    where.screen = { locationId };
  }

  const schedules = await prisma.signageSchedule.findMany({
    where,
    include: {
      screen: { select: { id: true, name: true, locationId: true } },
      playlist: { select: { id: true, name: true } },
    },
    orderBy: { priority: 'desc' },
  });

  return NextResponse.json(schedules);
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (!ADMIN_ROLES.includes(auth.role)) return forbidden();

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'create': {
        const {
          screenId, playlistId, daysOfWeek, startTime, endTime,
          startDate, endDate, priority, active,
        } = body;
        if (!screenId || !playlistId) {
          return NextResponse.json({ error: 'screenId and playlistId are required' }, { status: 400 });
        }
        const schedule = await prisma.signageSchedule.create({
          data: {
            screenId,
            playlistId,
            daysOfWeek: daysOfWeek ?? '0,1,2,3,4,5,6',
            startTime: startTime ?? '00:00',
            endTime: endTime ?? '23:59',
            startDate: startDate ?? null,
            endDate: endDate ?? null,
            priority: priority ?? 0,
            active: active ?? true,
          },
          include: {
            screen: { select: { id: true, name: true } },
            playlist: { select: { id: true, name: true } },
          },
        });
        return NextResponse.json(schedule);
      }

      case 'update': {
        const { id, ...data } = body;
        if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
        const { action: _a, ...updateData } = data;
        const schedule = await prisma.signageSchedule.update({
          where: { id },
          data: updateData,
          include: {
            screen: { select: { id: true, name: true } },
            playlist: { select: { id: true, name: true } },
          },
        });
        return NextResponse.json(schedule);
      }

      case 'delete': {
        const { id } = body;
        if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
        await prisma.signageSchedule.delete({ where: { id } });
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: 'unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[signage/schedule]', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
