export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const orders = await prisma.order.findMany({
    where: { status: { in: ['delivered', 'picked_up'] } },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });

  // Build customer profiles from orders
  const map: Record<string, any> = {};
  for (const o of orders) {
    const key = o.customerPhone;
    if (!map[key]) {
      map[key] = {
        id: key, name: o.customerName, phone: o.customerPhone, email: o.customerEmail,
        address: o.deliveryStreet ? `${o.deliveryStreet}, ${o.deliveryCity}` : null,
        totalOrders: 0, totalSpent: 0, loyaltyPoints: 0, segment: 'new', lastOrderDate: null,
      };
    }
    const p = map[key];
    p.totalOrders++;
    p.totalSpent += o.total;
    p.loyaltyPoints += Math.floor(o.total);
    if (!p.lastOrderDate || o.createdAt > p.lastOrderDate) p.lastOrderDate = o.createdAt;
  }

  const customers = Object.values(map).map((p: any) => ({
    ...p,
    segment: p.totalOrders >= 5 ? 'vip' : p.totalOrders >= 2 ? 'regular' : 'new',
    totalSpent: Math.round(p.totalSpent * 100) / 100,
  })).sort((a: any, b: any) => b.totalSpent - a.totalSpent);

  return NextResponse.json({ customers });
}
