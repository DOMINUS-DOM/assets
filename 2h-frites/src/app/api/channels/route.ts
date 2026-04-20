export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, ADMIN_ROLES, forbidden } from '@/lib/auth';
import type { TokenPayload } from '@/lib/auth';

/**
 * Resolve the target organizationId for a mutation.
 * - Tenant admin (patron, manager, ...): their bound org.
 * - Platform super admin: must pass body.organizationId explicitly.
 * Returns null if no valid org context → caller should 403.
 */
function resolveOrgForMutation(auth: TokenPayload, body: { organizationId?: string }): string | null {
  if (auth.role === 'platform_super_admin') {
    return body.organizationId || null;
  }
  return auth.organizationId || null;
}

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  // Platform super admin without org binding: allow cross-org read, optionally
  // scoped via ?organizationId=. Tenant admins are always scoped to their org.
  let orgId = auth.organizationId;
  if (auth.role === 'platform_super_admin' && !orgId) {
    orgId = req.nextUrl.searchParams.get('organizationId') || '';
    const where = orgId ? { organizationId: orgId } : {};
    const channels = await prisma.orderChannel.findMany({ where, orderBy: { name: 'asc' } });
    return NextResponse.json(channels);
  }
  if (!orgId) return forbidden();

  const channels = await prisma.orderChannel.findMany({
    where: { organizationId: orgId },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(channels);
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  const body = await req.json();
  const orgId = resolveOrgForMutation(auth, body);
  if (!orgId) return forbidden();

  if (body.action === 'create') {
    const ch = await prisma.orderChannel.create({
      data: { ...(body.data || {}), organizationId: orgId },
    });
    return NextResponse.json(ch);
  }

  if (body.action === 'toggle') {
    const ch = await prisma.orderChannel.findUnique({ where: { id: body.id } });
    // Return 404 (not 403) on both "missing" and "not yours" to avoid leaking
    // the existence of channels in other tenants.
    if (!ch || ch.organizationId !== orgId) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    await prisma.orderChannel.update({ where: { id: body.id }, data: { active: !ch.active } });
    return NextResponse.json({ ok: true });
  }

  // Simulate incoming order from 3rd party platform
  if (body.action === 'incomingOrder') {
    // NEVER trust body.locationId blindly — resolve through the authenticated
    // org context so a tenant-A admin cannot inject an order into tenant-B's
    // location by passing a foreign locationId.
    const location = await prisma.location.findFirst({
      where: { id: body.locationId, organizationId: orgId },
      select: { id: true },
    });
    if (!location) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // Also verify body.channel corresponds to an OrderChannel that exists AND
    // belongs to this org. Prevents injecting a fake or foreign-channel order
    // (e.g. claiming the order came from a channel tenant-A never enabled).
    const channel = await prisma.orderChannel.findFirst({
      where: { name: body.channel, organizationId: orgId },
      select: { id: true },
    });
    if (!channel) return NextResponse.json({ error: 'channel_not_found' }, { status: 404 });

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
        locationId: location.id,
        items: { create: body.items },
        statusHistory: { create: { status: 'received' } },
      },
      include: { items: true },
    });

    // Create notification
    await prisma.notification.create({
      data: { type: 'order', title: `📱 ${body.channel}`, message: `Nouvelle commande ${order.orderNumber}`, link: '/admin/orders', locationId: location.id },
    });

    return NextResponse.json(order);
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
