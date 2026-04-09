import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const channels = await prisma.orderChannel.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(channels);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === 'create') {
    const ch = await prisma.orderChannel.create({ data: body.data });
    return NextResponse.json(ch);
  }

  if (body.action === 'toggle') {
    const ch = await prisma.orderChannel.findUnique({ where: { id: body.id } });
    if (ch) await prisma.orderChannel.update({ where: { id: body.id }, data: { active: !ch.active } });
    return NextResponse.json({ ok: true });
  }

  // Simulate incoming order from 3rd party platform
  if (body.action === 'incomingOrder') {
    let orderCounter = await prisma.order.count() + 100;
    const order = await prisma.order.create({
      data: {
        orderNumber: `EXT-${++orderCounter}`,
        type: body.type || 'delivery',
        channel: body.channel, // uber_eats, deliveroo, etc.
        customerName: body.customerName,
        customerPhone: body.customerPhone || '',
        deliveryStreet: body.deliveryStreet,
        deliveryCity: body.deliveryCity,
        paymentMethod: 'online',
        paymentStatus: 'paid', // 3rd party handles payment
        total: body.total,
        locationId: body.locationId,
        items: { create: body.items },
        statusHistory: { create: { status: 'received' } },
      },
      include: { items: true },
    });

    // Create notification
    await prisma.notification.create({
      data: { type: 'order', title: `📱 ${body.channel}`, message: `Nouvelle commande ${order.orderNumber}`, link: '/admin/orders', locationId: body.locationId },
    });

    return NextResponse.json(order);
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
