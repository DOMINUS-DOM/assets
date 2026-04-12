export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, ADMIN_ROLES, unauthorized, forbidden } from '@/lib/auth';

// ─── Segment auto-calc ───
function calcSegment(totalOrders: number): string {
  if (totalOrders >= 5) return 'vip';
  if (totalOrders >= 2) return 'regular';
  return 'new';
}

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  const [customers, rewards, totalCustomers, pointsAgg, redeemedAgg] = await Promise.all([
    prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        loyaltyTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    }),
    prisma.loyaltyReward.findMany({ where: { active: true }, orderBy: { pointsCost: 'asc' } }),
    prisma.customer.count(),
    prisma.loyaltyTransaction.aggregate({
      _sum: { points: true },
      where: { points: { gt: 0 } },
    }),
    prisma.loyaltyTransaction.aggregate({
      _sum: { points: true },
      where: { points: { lt: 0 } },
    }),
  ]);

  const totalPointsIssued = pointsAgg._sum.points || 0;
  const totalRedeemed = Math.abs(redeemedAgg._sum.points || 0);
  const avgPoints = totalCustomers > 0 ? Math.round(totalPointsIssued / totalCustomers) : 0;

  return NextResponse.json({
    customers,
    rewards,
    stats: {
      totalCustomers,
      totalPointsIssued,
      totalRedeemed,
      avgPointsPerCustomer: avgPoints,
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  // ─── Public / semi-public actions ───
  if (action === 'getBalance') {
    const { phone } = body;
    if (!phone) return NextResponse.json({ error: 'phone_required' }, { status: 400 });
    const customer = await prisma.customer.findUnique({ where: { phone } });
    if (!customer) return NextResponse.json({ error: 'customer_not_found' }, { status: 404 });
    return NextResponse.json({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      loyaltyPoints: customer.loyaltyPoints,
      lifetimePoints: customer.lifetimePoints,
      totalOrders: customer.totalOrders,
      segment: customer.segment,
    });
  }

  // ─── Earn — called internally or by admin ───
  if (action === 'earn') {
    const { phone, name, email, orderId, amount } = body;
    if (!phone || !name || amount == null) {
      return NextResponse.json({ error: 'phone_name_amount_required' }, { status: 400 });
    }
    const points = Math.floor(amount);
    if (points <= 0) return NextResponse.json({ error: 'amount_too_low' }, { status: 400 });

    const customer = await prisma.customer.upsert({
      where: { phone },
      create: {
        phone,
        name,
        email: email || null,
        loyaltyPoints: points,
        lifetimePoints: points,
        totalOrders: 1,
        totalSpent: amount,
        lastOrderDate: new Date(),
        segment: 'new',
      },
      update: {
        name,
        ...(email ? { email } : {}),
        loyaltyPoints: { increment: points },
        lifetimePoints: { increment: points },
        totalOrders: { increment: 1 },
        totalSpent: { increment: amount },
        lastOrderDate: new Date(),
      },
    });

    // Recalc segment
    const segment = calcSegment(customer.totalOrders);
    if (segment !== customer.segment) {
      await prisma.customer.update({ where: { id: customer.id }, data: { segment } });
    }

    await prisma.loyaltyTransaction.create({
      data: {
        customerId: customer.id,
        type: 'earn',
        points,
        reason: orderId ? `order_${orderId}` : 'purchase',
        orderId: orderId || null,
      },
    });

    return NextResponse.json({ ok: true, customer: { ...customer, segment }, pointsEarned: points });
  }

  // ─── All actions below require admin auth ───
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  if (action === 'redeem') {
    const { phone, rewardId } = body;
    if (!phone || !rewardId) return NextResponse.json({ error: 'phone_rewardId_required' }, { status: 400 });

    const customer = await prisma.customer.findUnique({ where: { phone } });
    if (!customer) return NextResponse.json({ error: 'customer_not_found' }, { status: 404 });

    const reward = await prisma.loyaltyReward.findUnique({ where: { id: rewardId } });
    if (!reward || !reward.active) return NextResponse.json({ error: 'reward_not_found' }, { status: 404 });

    if (customer.loyaltyPoints < reward.pointsCost) {
      return NextResponse.json({ error: 'insufficient_points', required: reward.pointsCost, available: customer.loyaltyPoints }, { status: 400 });
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: { loyaltyPoints: { decrement: reward.pointsCost } },
    });

    await prisma.loyaltyTransaction.create({
      data: {
        customerId: customer.id,
        type: 'redeem',
        points: -reward.pointsCost,
        reason: `reward_${reward.name}`,
      },
    });

    await prisma.loyaltyReward.update({
      where: { id: rewardId },
      data: { timesRedeemed: { increment: 1 } },
    });

    return NextResponse.json({ ok: true, reward: reward.name, pointsDeducted: reward.pointsCost });
  }

  if (action === 'createReward') {
    const { name, description, pointsCost, discountType, discountValue } = body;
    if (!name || !pointsCost) return NextResponse.json({ error: 'name_pointsCost_required' }, { status: 400 });

    const reward = await prisma.loyaltyReward.create({
      data: {
        name,
        description: description || '',
        pointsCost,
        discountType: discountType || 'item',
        discountValue: discountValue || 0,
      },
    });
    return NextResponse.json(reward);
  }

  if (action === 'updateReward') {
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
    // Remove action from fields
    const { action: _, ...updateData } = fields;
    const reward = await prisma.loyaltyReward.update({ where: { id }, data: updateData });
    return NextResponse.json(reward);
  }

  if (action === 'deleteReward') {
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
    await prisma.loyaltyReward.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true });
  }

  if (action === 'updateCustomer') {
    const { id, notes, segment } = body;
    if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
    const data: Record<string, any> = {};
    if (notes !== undefined) data.notes = notes;
    if (segment !== undefined) data.segment = segment;
    const customer = await prisma.customer.update({ where: { id }, data });
    return NextResponse.json(customer);
  }

  if (action === 'bonus') {
    const { phone, points, reason } = body;
    if (!phone || !points || !reason) return NextResponse.json({ error: 'phone_points_reason_required' }, { status: 400 });

    const customer = await prisma.customer.findUnique({ where: { phone } });
    if (!customer) return NextResponse.json({ error: 'customer_not_found' }, { status: 404 });

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        loyaltyPoints: { increment: points },
        lifetimePoints: { increment: points },
      },
    });

    await prisma.loyaltyTransaction.create({
      data: {
        customerId: customer.id,
        type: 'bonus',
        points,
        reason,
      },
    });

    return NextResponse.json({ ok: true, pointsAwarded: points });
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
