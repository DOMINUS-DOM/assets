import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const notifications = await prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
  return NextResponse.json(notifications);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === 'markRead') {
    await prisma.notification.update({ where: { id: body.id }, data: { read: true } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'markAllRead') {
    await prisma.notification.updateMany({ where: { read: false }, data: { read: true } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'create') {
    const notif = await prisma.notification.create({
      data: { type: body.type, title: body.title, message: body.message, link: body.link },
    });
    return NextResponse.json(notif);
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
