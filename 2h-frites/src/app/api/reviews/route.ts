import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const reviews = await prisma.review.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(reviews);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === 'create') {
    const review = await prisma.review.create({
      data: { orderId: body.orderId, customerName: body.customerName, customerPhone: body.customerPhone, rating: body.rating, comment: body.comment || '' },
    });
    return NextResponse.json(review);
  }

  if (body.action === 'reply') {
    await prisma.review.update({ where: { id: body.id }, data: { reply: body.reply } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'togglePublish') {
    const r = await prisma.review.findUnique({ where: { id: body.id } });
    if (r) await prisma.review.update({ where: { id: body.id }, data: { published: !r.published } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
