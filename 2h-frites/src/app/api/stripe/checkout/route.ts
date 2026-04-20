export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { getStripe as stripe_init, PRICES, AddonKey } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !auth.organizationId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const addons: AddonKey[] = body.addons || [];

  // Get the organization
  const org = await prisma.organization.findUnique({ where: { id: auth.organizationId } });
  if (!org) return NextResponse.json({ error: 'org_not_found' }, { status: 404 });

  // Build line items: base + selected addons
  const lineItems: { price: string; quantity: number }[] = [
    { price: PRICES.base, quantity: 1 },
  ];
  for (const addon of addons) {
    const priceId = PRICES[addon];
    if (priceId) lineItems.push({ price: priceId, quantity: 1 });
  }

  // Calculate remaining trial days
  let trialEnd: number | undefined;
  if (org.subscriptionStatus === 'trial' && org.trialEndsAt) {
    const remaining = Math.floor((org.trialEndsAt.getTime() - Date.now()) / 1000);
    if (remaining > 86400) { // more than 1 day left
      trialEnd = Math.floor(org.trialEndsAt.getTime() / 1000);
    }
  }

  // Get or create Stripe customer
  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe_init().customers.create({
      email: body.email || undefined,
      name: org.name,
      metadata: { organizationId: org.id, slug: org.slug },
    });
    customerId = customer.id;
    await prisma.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customerId } });
  }

  // Determine success/cancel URLs
  const host = req.headers.get('host') || 'brizoapp.com';
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const protocol = forwardedProto || (isLocalhost ? 'http' : 'https');
  const successUrl = `${protocol}://${host}/admin/billing?success=true`;
  const cancelUrl = `${protocol}://${host}/admin/billing?cancelled=true`;

  // Create Checkout Session
  const session = await stripe_init().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: lineItems,
    subscription_data: trialEnd ? { trial_end: trialEnd } : undefined,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { organizationId: org.id, addons: JSON.stringify(addons) },
  });

  return NextResponse.json({ url: session.url });
}
