export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, ADMIN_ROLES, unauthorized, forbidden, enforceLocation } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// Generate unique order number from DB (no in-memory counter)
async function nextOrderNumber(): Promise<string> {
  const latest = await prisma.order.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { orderNumber: true },
  });
  let num = 101;
  if (latest?.orderNumber) {
    const match = latest.orderNumber.match(/ORD-(\d+)/);
    if (match) num = parseInt(match[1], 10) + 1;
  }
  return `ORD-${String(num).padStart(3, '0')}`;
}

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

    const orderNumber = await nextOrderNumber();
    const order = await prisma.order.create({
      data: {
        orderNumber,
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
    logAudit({ userId: auth?.userId, locationId: order.locationId, action: 'create', entity: 'Order', entityId: order.id, changes: { orderNumber, total: body.total, channel: isKiosk ? 'kiosk' : 'website' } });
    return NextResponse.json(order);
  }

  if (action === 'updateStatus') {
    if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();
    const { orderId, status } = body;
    const VALID_STATUSES = ['received', 'preparing', 'ready', 'delivering', 'delivered', 'picked_up', 'cancelled'];
    if (!orderId || !status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
    }
    await prisma.order.update({ where: { id: orderId }, data: { status } });
    await prisma.statusEntry.create({ data: { orderId, status } });
    logAudit({ userId: auth.userId, action: 'status_change', entity: 'Order', entityId: orderId, changes: { status } });

    // ─── Loyalty: award points on delivery/pickup ───
    if (status === 'delivered' || status === 'picked_up') {
      try {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          select: { customerPhone: true, customerName: true, customerEmail: true, total: true, orderNumber: true },
        });
        if (order?.customerPhone && order.total > 0) {
          const points = Math.floor(order.total);
          if (points > 0) {
            const customer = await prisma.customer.upsert({
              where: { phone: order.customerPhone },
              create: {
                phone: order.customerPhone,
                name: order.customerName || order.customerPhone,
                email: order.customerEmail || null,
                loyaltyPoints: points,
                lifetimePoints: points,
                totalOrders: 1,
                totalSpent: order.total,
                lastOrderDate: new Date(),
                segment: 'new',
              },
              update: {
                ...(order.customerName ? { name: order.customerName } : {}),
                ...(order.customerEmail ? { email: order.customerEmail } : {}),
                loyaltyPoints: { increment: points },
                lifetimePoints: { increment: points },
                totalOrders: { increment: 1 },
                totalSpent: { increment: order.total },
                lastOrderDate: new Date(),
              },
            });
            // Auto-recalc segment
            const segment = customer.totalOrders >= 5 ? 'vip' : customer.totalOrders >= 2 ? 'regular' : 'new';
            if (segment !== customer.segment) {
              await prisma.customer.update({ where: { id: customer.id }, data: { segment } });
            }
            await prisma.loyaltyTransaction.create({
              data: {
                customerId: customer.id,
                type: 'earn',
                points,
                reason: `order_${order.orderNumber}`,
                orderId,
              },
            });
          }
        }
      } catch (e) {
        // Loyalty errors should not block the status update response
        console.error('Loyalty earn error:', e);
      }
    }

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
