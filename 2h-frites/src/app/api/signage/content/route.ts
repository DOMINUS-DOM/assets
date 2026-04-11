export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, ADMIN_ROLES, unauthorized, forbidden } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (!ADMIN_ROLES.includes(auth.role)) return forbidden();

  const locationId = req.nextUrl.searchParams.get('locationId');
  const where = locationId ? { locationId } : {};

  const contents = await prisma.signageContent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(contents);
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
        const { name, locationId, type, duration, configJson, status } = body;
        if (!name || !locationId || !type) {
          return NextResponse.json({ error: 'name, locationId, and type are required' }, { status: 400 });
        }
        const content = await prisma.signageContent.create({
          data: {
            name,
            locationId,
            type,
            duration: duration ?? 10,
            configJson: configJson ?? '{}',
            status: status ?? 'draft',
          },
        });
        return NextResponse.json(content);
      }

      case 'update': {
        const { id, ...data } = body;
        if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
        const { action: _a, ...updateData } = data;
        const content = await prisma.signageContent.update({
          where: { id },
          data: updateData,
        });
        return NextResponse.json(content);
      }

      case 'delete': {
        const { id } = body;
        if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
        await prisma.signageContent.delete({ where: { id } });
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: 'unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[signage/content]', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
