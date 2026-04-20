export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { getStripe as stripe_init } from '@/lib/stripe';

// POST /api/stripe/portal — Create a Stripe billing portal session for the current tenant.
// Scope (V1): payment method update, invoice download, subscription cancellation.
// Plan/addon changes stay in Brizo (not in the portal) to avoid module desync.
export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !auth.organizationId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: auth.organizationId },
    select: { id: true, stripeCustomerId: true },
  });
  if (!org) return NextResponse.json({ error: 'org_not_found' }, { status: 404 });
  if (!org.stripeCustomerId) {
    return NextResponse.json({ error: 'no_customer', message: 'Aucun abonnement actif à gérer.' }, { status: 400 });
  }

  const host = req.headers.get('host') || 'brizoapp.com';
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const protocol = forwardedProto || (isLocalhost ? 'http' : 'https');
  const returnUrl = `${protocol}://${host}/admin/billing`;

  const session = await stripe_init().billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: returnUrl,
  });

  return NextResponse.json({ url: session.url });
}
