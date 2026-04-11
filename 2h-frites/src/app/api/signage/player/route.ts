export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'code parameter is required' }, { status: 400 });
  }

  try {
    // Find screen by code
    const screen = await prisma.signageScreen.findUnique({
      where: { code },
    });

    if (!screen || screen.status !== 'active') {
      return NextResponse.json({ error: 'not_found' });
    }

    // Find all active schedules for this screen
    const schedules = await prisma.signageSchedule.findMany({
      where: {
        screenId: screen.id,
        active: true,
      },
      include: {
        playlist: {
          include: {
            items: {
              include: { content: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
      orderBy: { priority: 'desc' },
    });

    // Filter schedules by current day/time/date
    const now = new Date();
    const currentDay = now.getDay(); // 0=Sunday
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDate = now.toISOString().slice(0, 10); // YYYY-MM-DD

    const matchingSchedules = schedules.filter((s) => {
      // Check day of week
      const days = s.daysOfWeek.split(',').map(Number);
      if (!days.includes(currentDay)) return false;

      // Check time range
      if (currentTime < s.startTime || currentTime > s.endTime) return false;

      // Check date range
      if (s.startDate && currentDate < s.startDate) return false;
      if (s.endDate && currentDate > s.endDate) return false;

      return true;
    });

    // Pick highest priority (already sorted desc)
    const bestSchedule = matchingSchedules[0] ?? null;

    const screenData = {
      name: screen.name,
      orientation: screen.orientation,
      resolution: screen.resolution,
    };

    if (!bestSchedule) {
      return NextResponse.json({ screen: screenData, playlist: null });
    }

    const playlist = bestSchedule.playlist;
    return NextResponse.json({
      screen: screenData,
      playlist: {
        name: playlist.name,
        loop: playlist.loop,
        items: playlist.items.map((item) => ({
          content: {
            type: item.content.type,
            name: item.content.name,
            duration: item.content.duration,
            configJson: item.content.configJson,
          },
          durationOverride: item.durationOverride,
        })),
      },
    });
  } catch (error) {
    console.error('[signage/player]', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
