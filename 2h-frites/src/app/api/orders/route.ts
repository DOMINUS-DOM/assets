export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, ADMIN_ROLES, unauthorized, forbidden, enforceLocation, verifyToken } from '@/lib/auth';

let orderCounter = 100;

export async function GET(req: NextRequest) {
  const orderNumber = req.nextUrl.searchParams.get('orderNumber');
  const orderId = req.nextUrl.searchParams.get('orderId');

  // Public path: single order lookup for tracking (no PII)
  if (orderNumber || orderId) {
    const where = orderId ? { id: orderId } : { orderNumber: orderNumber! };
    const order = await prisma.order.findFirst({
      where,
      include: { items: true, statusHistory: { orderBy: { at: 'asc' } } },
    });
    if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    // Strip PII for public access
    const { customerPhone, customerEmail, ...safeOrder } = order;
    return NextResponse.json(safeOrder);
  }

  // Authenticated path: list all orders (admin only)
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  const locationId = req.nextUrl.searchParams.get('locationId');
  const effectiveLocation = enforceLocation(auth, locationId);
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '200');
  const where = effectiveLocation ? { locationId: effectiveLocation } : {};

  const orders = await prisma.order.findMany({
    where,
    include: { items: true, statusHistory: { orderBy: { at: 'asc' } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  const auth = getAuthUser(req);

  if (action === 'create') {
    // Kiosk: authenticate via X-Kiosk-Key header
    const kioskKey = req.headers.get('x-kiosk-key');
    const isKiosk = !!(kioskKey && process.env.KIOSK_API_KEY && kioskKey === process.env.KIOSK_API_KEY);
    // Client orders (from website) are allowed without auth
    const isClientOrder = body.customerPhone || body.customerEmail;
    if (!auth && !isKiosk && !isClientOrder) return unauthorized();

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
        channel: isKiosk ? 'kiosk' : (body.channel || 'website'),
        total: body.total,
        userId: body.userId,
        locationId: body.locationId || null,
        items: { create: body.items },
        statusHistory: { create: { status: 'received' } },
      },
      include: { items: true, statusHistory: true },
    });
    return NextResponse.json(order);
  }

  if (action === 'updateStatus') {
    if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();
    const { orderId, status } = body;
    await prisma.order.update({ where: { id: orderId }, data: { status } });
    await prisma.statusEntry.create({ data: { orderId, status } });
    return NextResponse.json({ ok: true });
  }

  if (action === 'assignDriver') {
    if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();
    const { orderId, driverId } = body;
    await prisma.order.update({ where: { id: orderId }, data: { driverId } });
    return NextResponse.json({ ok: true });
  }

  if (action === 'updatePayment') {
    if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();
    const { orderId, paymentStatus } = body;
    await prisma.order.update({ where: { id: orderId }, data: { paymentStatus } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
