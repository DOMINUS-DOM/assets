export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, ADMIN_ROLES, unauthorized, forbidden } from '@/lib/auth';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (!ADMIN_ROLES.includes(auth.role)) return forbidden();

  const locationId = req.nextUrl.searchParams.get('locationId');
  const where = locationId ? { locationId } : {};

  const screens = await prisma.signageScreen.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(screens);
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
        const { name, locationId, orientation, resolution } = body;
        if (!name || !locationId) {
          return NextResponse.json({ error: 'name and locationId are required' }, { status: 400 });
        }
        // Generate a unique code, retry if collision
        let code = generateCode();
        let exists = await prisma.signageScreen.findUnique({ where: { code } });
        while (exists) {
          code = generateCode();
          exists = await prisma.signageScreen.findUnique({ where: { code } });
        }

        const screen = await prisma.signageScreen.create({
          data: {
            name,
            locationId,
            orientation: orientation || 'landscape',
            resolution: resolution || '1920x1080',
            code,
          },
        });
        return NextResponse.json(screen);
      }

      case 'update': {
        const { id, ...data } = body;
        if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
        // Remove action and id from update data
        const { action: _a, ...updateData } = data;
        const screen = await prisma.signageScreen.update({
          where: { id },
          data: updateData,
        });
        return NextResponse.json(screen);
      }

      case 'delete': {
        const { id } = body;
        if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
        await prisma.signageScreen.delete({ where: { id } });
        return NextResponse.json({ ok: true });
      }

      case 'toggleStatus': {
        const { id, status } = body;
        if (!id || !status) {
          return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
        }
        const screen = await prisma.signageScreen.update({
          where: { id },
          data: { status },
        });
        return NextResponse.json(screen);
      }

      default:
        return NextResponse.json({ error: 'unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[signage/screens]', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
