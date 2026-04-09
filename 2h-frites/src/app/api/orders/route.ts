export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

let orderCounter = 100;

export async function GET() {
  const orders = await prisma.order.findMany({
    include: { items: true, statusHistory: { orderBy: { at: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === 'create') {
    orderCounter++;
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-${String(orderCounter).padStart(3, '0')}`,
        type: body.type,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail,
        deliveryStreet: body.deliveryStreet,
        deliveryCity: body.deliveryCity,
        deliveryPostal: body.deliveryPostal,
        deliveryNotes: body.deliveryNotes,
        pickupTime: body.pickupTime,
        paymentMethod: body.paymentMethod,
        paymentStatus: body.paymentStatus || 'pending',
        total: body.total,
        userId: body.userId,
        items: { create: body.items },
        statusHistory: { create: { status: 'received' } },
      },
      include: { items: true, statusHistory: true },
    });
    return NextResponse.json(order);
  }

  if (action === 'updateStatus') {
    const { orderId, status } = body;
    await prisma.order.update({ where: { id: orderId }, data: { status } });
    await prisma.statusEntry.create({ data: { orderId, status } });
    return NextResponse.json({ ok: true });
  }

  if (action === 'assignDriver') {
    const { orderId, driverId } = body;
    await prisma.order.update({ where: { id: orderId }, data: { driverId } });
    return NextResponse.json({ ok: true });
  }

  if (action === 'updatePayment') {
    const { orderId, paymentStatus } = body;
    await prisma.order.update({ where: { id: orderId }, data: { paymentStatus } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
