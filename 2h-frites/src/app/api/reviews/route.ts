export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, ADMIN_ROLES, unauthorized, forbidden } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);

  // Admin: full list (including unpublished + phone)
  if (auth && ADMIN_ROLES.includes(auth.role)) {
    const reviews = await prisma.review.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(reviews);
  }

  // Public: only published reviews, no phone number
  const reviews = await prisma.review.findMany({
    where: { published: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, orderId: true, customerName: true, rating: true,
      comment: true, reply: true, published: true, createdAt: true,
    },
  });
  return NextResponse.json(reviews);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const auth = getAuthUser(req);

  if (body.action === 'create') {
    if (!auth) return unauthorized();
    const review = await prisma.review.create({
      data: {
        orderId: body.orderId, customerName: body.customerName,
        customerPhone: body.customerPhone, rating: body.rating,
        comment: body.comment || '',
      },
    });
    return NextResponse.json(review);
  }

  if (body.action === 'reply') {
    if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();
    await prisma.review.update({ where: { id: body.id }, data: { reply: body.reply } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'togglePublish') {
    if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();
    const r = await prisma.review.findUnique({ where: { id: body.id } });
    if (r) await prisma.review.update({ where: { id: body.id }, data: { published: !r.published } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
