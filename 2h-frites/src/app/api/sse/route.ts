import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const channel = searchParams.get('channel') || 'orders'; // orders, kitchen, notifications
  const locationId = searchParams.get('locationId');

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

      // Send initial data
      if (channel === 'orders' || channel === 'kitchen') {
        const where = locationId ? { locationId } : {};
        const orders = await prisma.order.findMany({
          where, include: { items: true, statusHistory: { orderBy: { at: 'asc' } } },
          orderBy: { createdAt: 'desc' }, take: 50,
        });
        send({ type: 'init', orders });
      }

      if (channel === 'notifications') {
        const where = locationId ? { locationId } : {};
        const notifs = await prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 20 });
        send({ type: 'init', notifications: notifs });
      }

      if (channel === 'drivers') {
        const where = locationId ? { locationId, active: true } : { active: true };
        const drivers = await prisma.driver.findMany({ where });
        send({ type: 'init', drivers });
      }

      // Poll for updates every 3 seconds (replace with DB triggers in production)
      const interval = setInterval(async () => {
        if (closed) { clearInterval(interval); return; }
        try {
          if (channel === 'orders' || channel === 'kitchen') {
            const where = locationId ? { locationId } : {};
            const orders = await prisma.order.findMany({
              where, include: { items: true, statusHistory: { orderBy: { at: 'asc' } } },
              orderBy: { createdAt: 'desc' }, take: 50,
            });
            send({ type: 'update', orders });
          }
          if (channel === 'drivers') {
            const where = locationId ? { locationId, active: true } : { active: true };
            const drivers = await prisma.driver.findMany({ where });
            send({ type: 'update', drivers });
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
