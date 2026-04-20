export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { getStripe as stripe_init } from '@/lib/stripe';

// POST /api/stripe/reactivate — undo a scheduled cancel-at-period-end.
// No-op if the subscription isn't scheduled to cancel.
export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !auth.organizationId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: auth.organizationId },
    select: { id: true, stripeSubscriptionId: true },
  });
  if (!org) return NextResponse.json({ error: 'org_not_found' }, { status: 404 });
  if (!org.stripeSubscriptionId) {
    return NextResponse.json({ error: 'no_subscription' }, { status: 400 });
  }

  try {
    const sub = await stripe_init().subscriptions.update(org.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    // Mirror in DB immediately so the UI updates without waiting for the webhook.
    await prisma.organization.update({
      where: { id: org.id },
      data: { cancelAt: null },
    });

    return NextResponse.json({ ok: true, status: sub.status });
  } catch (e: any) {
    console.error('[Stripe] reactivate failed:', e?.message || e);
    if (e?.code === 'resource_missing') {
      return NextResponse.json({ error: 'subscription_not_found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'reactivate_failed' }, { status: 502 });
  }
}
