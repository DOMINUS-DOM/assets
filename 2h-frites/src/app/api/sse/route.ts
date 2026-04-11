import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUserOrQuery, ADMIN_ROLES, enforceLocation } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // SSE requires authentication (via Bearer header or ?token= query param)
  const auth = getAuthUserOrQuery(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get('channel') || 'orders';
  const requestedLocationId = searchParams.get('locationId');
  const locationId = enforceLocation(auth, requestedLocationId);

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { closed = true; }
      };

      const locFilter = locationId ? { locationId } : {};

      // Send initial data
      if (channel === 'orders' || channel === 'kitchen') {
        const orders = await prisma.order.findMany({
          where: locFilter,
          include: { items: true, statusHistory: { orderBy: { at: 'asc' } } },
          orderBy: { createdAt: 'desc' }, take: 50,
        });
        send({ type: 'init', orders });
      }

      if (channel === 'notifications') {
        const notifs = await prisma.notification.findMany({
          where: locFilter, orderBy: { createdAt: 'desc' }, take: 20,
        });
        send({ type: 'init', notifications: notifs });
      }

      if (channel === 'drivers') {
        const where = locationId ? { locationId, active: true } : { active: true };
        const drivers = await prisma.driver.findMany({ where });
        send({ type: 'init', drivers });
      }

      // Poll for updates — delta mode: only send when data changes
      let lastOrderHash = '';
      let lastDriverHash = '';

      const interval = setInterval(async () => {
        if (closed) { clearInterval(interval); return; }
        try {
          if (channel === 'orders' || channel === 'kitchen') {
            // Check for changes: count + latest status change
            const summary = await prisma.order.aggregate({
              where: { ...locFilter, status: { in: ['received', 'preparing', 'ready', 'delivering'] } },
              _count: true,
              _max: { createdAt: true },
            });
            const hash = `${summary._count}|${summary._max.createdAt?.toISOString() || ''}`;
            if (hash !== lastOrderHash) {
              lastOrderHash = hash;
              const orders = await prisma.order.findMany({
                where: locFilter,
                include: { items: true, statusHistory: { orderBy: { at: 'asc' } } },
                orderBy: { createdAt: 'desc' }, take: 50,
              });
              send({ type: 'update', orders });
            }
          }
          if (channel === 'drivers') {
            const where = locationId ? { locationId, active: true } : { active: true };
            const drivers = await prisma.driver.findMany({ where, select: { id: true, lastLat: true, lastLng: true, lastLocationAt: true, name: true } });
            const hash = JSON.stringify(drivers.map(d => `${d.id}:${d.lastLat}:${d.lastLng}`));
            if (hash !== lastDriverHash) {
              lastDriverHash = hash;
              const fullDrivers = await prisma.driver.findMany({ where });
              send({ type: 'update', drivers: fullDrivers });
            }
          }
        } catch { closed = true; clearInterval(interval); }
      }, 3000);

      // Keep connection alive
      const keepAlive = setInterval(() => {
        if (closed) { clearInterval(keepAlive); return; }
        try { controller.enqueue(encoder.encode(': keepalive\n\n')); } catch { closed = true; }
      }, 15000);

      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        clearInterval(keepAlive);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
