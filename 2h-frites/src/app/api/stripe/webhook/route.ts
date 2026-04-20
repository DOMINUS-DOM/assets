export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStripe as stripe_init, addonsToModulesJson } from '@/lib/stripe';
import { sendPaymentSuccessEmail, sendPaymentFailedEmail } from '@/lib/email';
import { env } from '@/lib/env';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) return NextResponse.json({ error: 'missing_signature' }, { status: 400 });

  let event;
  try {
    event = stripe_init().webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  // ─── Handle events ───

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const orgId = session.metadata?.organizationId;
    const addons: string[] = JSON.parse(session.metadata?.addons || '[]');

    if (orgId) {
      await prisma.organization.update({
        where: { id: orgId },
        data: {
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          subscriptionStatus: 'active',
          planType: 'starter',
          addons: JSON.stringify(addons),
          modulesJson: addonsToModulesJson(addons),
        },
      });
      console.log(`[Stripe] Checkout completed for org ${orgId}, addons: ${addons.join(', ')}`);
    }
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as any;
    const subId = invoice.subscription;
    const custId = invoice.customer;

    // Lookup by subscriptionId first, fallback to customerId.
    // The customerId fallback covers the race where the very first `invoice.paid`
    // lands before `checkout.session.completed` has written `stripeSubscriptionId`
    // (stripeCustomerId is written earlier in the checkout route).
    let org =
      subId ? await prisma.organization.findFirst({ where: { stripeSubscriptionId: subId } }) : null;
    if (!org && custId) {
      org = await prisma.organization.findFirst({ where: { stripeCustomerId: custId } });
    }

    if (org) {
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          subscriptionStatus: 'active',
          // Backfill stripeSubscriptionId if we found via customer before checkout completed it.
          ...(subId && !org.stripeSubscriptionId ? { stripeSubscriptionId: subId } : {}),
        },
      });
      console.log(`[Stripe] Invoice paid for org ${org.id}`);
      const admin = await prisma.user.findFirst({ where: { organizationId: org.id, role: 'patron' } });
      if (admin) {
        const amountCents =
          typeof invoice.amount_paid === 'number' ? invoice.amount_paid :
          typeof invoice.total === 'number' ? invoice.total :
          typeof invoice.amount_due === 'number' ? invoice.amount_due :
          null;
        if (amountCents === null) {
          console.warn(`[Stripe] invoice.paid missing amount fields for invoice ${invoice.id}`);
        } else {
          const hostedInvoiceUrl = typeof invoice.hosted_invoice_url === 'string' ? invoice.hosted_invoice_url : null;
          sendPaymentSuccessEmail(admin.email, org.name, Math.round(amountCents / 100), hostedInvoiceUrl).catch(() => {});
        }
      }
    } else {
      console.warn(`[Stripe] invoice.paid: no org found (sub=${subId}, cust=${custId})`);
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as any;
    const subId = invoice.subscription;
    if (subId) {
      const org = await prisma.organization.findFirst({ where: { stripeSubscriptionId: subId } });
      if (org) {
        await prisma.organization.update({
          where: { id: org.id },
          data: { subscriptionStatus: 'past_due' },
        });
        console.log(`[Stripe] Payment failed for org ${org.id}`);
        // Send payment failed email
        const admin = await prisma.user.findFirst({ where: { organizationId: org.id, role: 'patron' } });
        if (admin) {
          sendPaymentFailedEmail(admin.email, org.name, org.slug).catch(() => {});
        }
      }
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as any;
    const org = await prisma.organization.findFirst({ where: { stripeSubscriptionId: subscription.id } });
    if (org) {
      const cancelAt = subscription.cancel_at_period_end && subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000)
        : null;
      await prisma.organization.update({
        where: { id: org.id },
        data: { cancelAt },
      });
      console.log(`[Stripe] Subscription updated for org ${org.id}, cancelAt=${cancelAt?.toISOString() ?? 'null'}`);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as any;
    const org = await prisma.organization.findFirst({ where: { stripeSubscriptionId: subscription.id } });
    if (org) {
      await prisma.organization.update({
        where: { id: org.id },
        data: { subscriptionStatus: 'cancelled', cancelAt: null },
      });
      console.log(`[Stripe] Subscription cancelled for org ${org.id}`);
    }
  }

  return NextResponse.json({ received: true });
}
