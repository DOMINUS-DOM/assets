export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, getRequiredOrgId, getLocationIdsForOrg, resolveOrgFromRequest, ADMIN_ROLES, unauthorized, forbidden } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { env } from '@/lib/env';

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
    // Scope by tenant to prevent cross-tenant order enumeration
    const orgId = await resolveOrgFromRequest(req);
    const tenantLocationIds = orgId ? await getLocationIdsForOrg(orgId) : [];
    const baseWhere = orderId ? { id: orderId } : { orderNumber: orderNumber! };
    const where = tenantLocationIds.length > 0
      ? { ...baseWhere, locationId: { in: tenantLocationIds } }
      : baseWhere;
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
  const orgResult = getRequiredOrgId(req);
  if (!orgResult) return unauthorized();
  const { auth, orgId } = orgResult;
  if (!ADMIN_ROLES.includes(auth.role)) return forbidden();

  const orgLocationIds = await getLocationIdsForOrg(orgId);
  if (orgLocationIds.length === 0) return NextResponse.json([]);

  const requestedLocationId = req.nextUrl.searchParams.get('locationId');
  let where: any;
  if (requestedLocationId) {
    // Verify the requested locationId belongs to the user's org
    if (!orgLocationIds.includes(requestedLocationId)) return forbidden();
    where = { locationId: requestedLocationId };
  } else {
    where = { locationId: { in: orgLocationIds } };
  }

  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '200');
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
    const isKiosk = !!(kioskKey && kioskKey === env.KIOSK_API_KEY);
    // Client orders (from website) are allowed without auth
    const isClientOrder = body.customerPhone || body.customerEmail;
    if (!auth && !isKiosk && !isClientOrder) return unauthorized();

    // Resolve org and validate locationId
    let resolvedLocationId: string | null = body.locationId || null;
    const orgId = auth?.organizationId || await resolveOrgFromRequest(req);
    if (orgId) {
      const orgLocationIds = await getLocationIdsForOrg(orgId);
      if (resolvedLocationId) {
        if (!orgLocationIds.includes(resolvedLocationId)) {
          return NextResponse.json({ error: 'location_not_in_org' }, { status: 403 });
        }
      } else if (orgLocationIds.length > 0) {
        resolvedLocationId = orgLocationIds[0];
      }
    }

    // Validate userId exists before linking (prevents FK crash)
    let validUserId = null;
    if (body.userId) {
      const userExists = await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true } });
      if (userExists) validUserId = body.userId;
    }

    // Retry on unique-constraint collisions: nextOrderNumber() is a read-then-increment
    // without locking, so concurrent creates (rush hour!) race on the same number.
    // We regenerate and retry up to 20 times with exponential jitter — enough to let
    // a burst of ~15 simultaneous tills serialize cleanly without losing an order.
    let order;
    let lastErr: any = null;
    for (let attempt = 0; attempt < 20; attempt++) {
      const orderNumber = await nextOrderNumber();
      try {
        order = await prisma.order.create({
          data: {
            orderNumber,
            type: body.type,
            customerName: body.customerName || 'Client',
            customerPhone: body.customerPhone || '',
            customerEmail: body.customerEmail || null,
            deliveryStreet: body.deliveryStreet || null,
            deliveryCity: body.deliveryCity || null,
            deliveryPostal: body.deliveryPostal || null,
            deliveryNotes: body.deliveryNotes || null,
            pickupTime: body.pickupTime || null,
            paymentMethod: body.paymentMethod || 'on_pickup',
            paymentStatus: body.paymentStatus || 'pending',
            channel: isKiosk ? 'kiosk' : (body.channel || 'website'),
            total: body.total || 0,
            userId: validUserId,
            locationId: resolvedLocationId,
            items: { create: (body.items || []).map((item: any) => ({
              menuItemId: item.menuItemId || 'unknown',
              name: item.name || 'Article',
              price: item.price || 0,
              quantity: item.quantity || 1,
              sizeKey: item.sizeKey || null,
              categoryId: item.categoryId || 'unknown',
              extras: item.extras || '[]',
            })) },
            statusHistory: { create: { status: 'received' } },
          },
          include: { items: true, statusHistory: true },
        });
        break;
      } catch (e: any) {
        lastErr = e;
        // Prisma P2002 = unique constraint violation. Other errors = bail.
        const isUniqueViolation = e?.code === 'P2002' || /Unique constraint/i.test(e?.message || '');
        if (!isUniqueViolation) break;
        // Exponential backoff with jitter — widens the window as collisions persist,
        // so competing writers eventually pick distinct numbers.
        const base = 20 * Math.min(attempt + 1, 8);
        await new Promise((r) => setTimeout(r, base + Math.floor(Math.random() * base)));
      }
    }
    if (!order) {
      console.error('Order creation error:', lastErr?.message);
      return NextResponse.json({ error: 'order_creation_failed', details: (lastErr?.message || '').slice(0, 200) }, { status: 500 });
    }
    logAudit({ userId: auth?.userId, locationId: order.locationId, action: 'create', entity: 'Order', entityId: order.id, changes: { orderNumber: order.orderNumber, total: body.total, channel: isKiosk ? 'kiosk' : 'website' } });
    return NextResponse.json(order);
  }

  if (action === 'updateStatus') {
    if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();
    const { orderId, status } = body;
    const VALID_STATUSES = ['received', 'preparing', 'ready', 'delivering', 'delivered', 'picked_up', 'cancelled'];
    if (!orderId || !status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
    }
    // Verify order belongs to user's org
    if (auth.organizationId) {
      const orgLocationIds = await getLocationIdsForOrg(auth.organizationId);
      const existingOrder = await prisma.order.findUnique({ where: { id: orderId }, select: { locationId: true } });
      if (!existingOrder) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      if (!existingOrder.locationId || !orgLocationIds.includes(existingOrder.locationId)) return forbidden();
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
    // Verify order belongs to user's org
    if (auth.organizationId) {
      const orgLocationIds = await getLocationIdsForOrg(auth.organizationId);
      const existingOrder = await prisma.order.findUnique({ where: { id: orderId }, select: { locationId: true } });
      if (!existingOrder) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      if (!existingOrder.locationId || !orgLocationIds.includes(existingOrder.locationId)) return forbidden();
    }
    await prisma.order.update({ where: { id: orderId }, data: { driverId } });
    return NextResponse.json({ ok: true });
  }

  if (action === 'updatePayment') {
    if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();
    const { orderId, paymentStatus } = body;
    // Verify order belongs to user's org
    if (auth.organizationId) {
      const orgLocationIds = await getLocationIdsForOrg(auth.organizationId);
      const existingOrder = await prisma.order.findUnique({ where: { id: orderId }, select: { locationId: true } });
      if (!existingOrder) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      if (!existingOrder.locationId || !orgLocationIds.includes(existingOrder.locationId)) return forbidden();
    }
    await prisma.order.update({ where: { id: orderId }, data: { paymentStatus } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
