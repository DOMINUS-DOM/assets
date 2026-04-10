export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized } from '@/lib/auth';

function generateCode(): string {
  return '2H-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function GET() {
  const referrals = await prisma.referral.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(referrals);
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const body = await req.json();

  if (body.action === 'create') {
    const ref = await prisma.referral.create({
      data: { referrerPhone: body.phone, referrerName: body.name, code: generateCode() },
    });
    return NextResponse.json(ref);
  }

  if (body.action === 'redeem') {
    const ref = await prisma.referral.findUnique({ where: { code: body.code } });
    if (!ref) return NextResponse.json({ error: 'invalid_code' }, { status: 404 });
    if (ref.usedBy) return NextResponse.json({ error: 'already_used' }, { status: 400 });

    await prisma.referral.update({
      where: { code: body.code },
      data: { usedBy: body.phone, usedAt: new Date(), rewardGiven: true },
    });
    return NextResponse.json({ ok: true, discount: 3 }); // 3€ discount
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
