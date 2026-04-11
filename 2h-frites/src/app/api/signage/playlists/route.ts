export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, ADMIN_ROLES, unauthorized, forbidden, enforceLocation } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (!ADMIN_ROLES.includes(auth.role)) return forbidden();

  const locationId = req.nextUrl.searchParams.get('locationId');
  const effectiveLocation = enforceLocation(auth, locationId);
  const where = effectiveLocation ? { locationId: effectiveLocation } : {};

  const playlists = await prisma.signagePlaylist.findMany({
    where,
    include: {
      items: {
        include: { content: true },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(playlists);
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
        const { name, locationId, loop, status } = body;
        if (!name || !locationId) {
          return NextResponse.json({ error: 'name and locationId are required' }, { status: 400 });
        }
        const playlist = await prisma.signagePlaylist.create({
          data: {
            name,
            locationId,
            loop: loop ?? true,
            status: status ?? 'draft',
          },
        });
        return NextResponse.json(playlist);
      }

      case 'update': {
        const { id, name, loop, status } = body;
        if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (loop !== undefined) updateData.loop = loop;
        if (status !== undefined) updateData.status = status;

        const playlist = await prisma.signagePlaylist.update({
          where: { id },
          data: updateData,
        });
        return NextResponse.json(playlist);
      }

      case 'delete': {
        const { id } = body;
        if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
        // Items are cascade-deleted via Prisma schema
        await prisma.signagePlaylist.delete({ where: { id } });
        return NextResponse.json({ ok: true });
      }

      case 'setItems': {
        const { playlistId, items } = body;
        if (!playlistId || !Array.isArray(items)) {
          return NextResponse.json({ error: 'playlistId and items array are required' }, { status: 400 });
        }

        // Transaction: delete existing items then create new ones
        await prisma.$transaction([
          prisma.signagePlaylistItem.deleteMany({ where: { playlistId } }),
          ...items.map((item: { contentId: string; order: number; durationOverride?: number }) =>
            prisma.signagePlaylistItem.create({
              data: {
                playlistId,
                contentId: item.contentId,
                order: item.order,
                durationOverride: item.durationOverride ?? null,
              },
            })
          ),
        ]);

        // Return updated playlist with items
        const playlist = await prisma.signagePlaylist.findUnique({
          where: { id: playlistId },
          include: {
            items: {
              include: { content: true },
              orderBy: { order: 'asc' },
            },
          },
        });
        return NextResponse.json(playlist);
      }

      default:
        return NextResponse.json({ error: 'unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[signage/playlists]', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
