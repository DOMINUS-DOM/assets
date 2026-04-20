import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTrialEndingSoonEmail } from '@/lib/email';
import { env } from '@/lib/env';

/**
 * Cron job: Send trial reminder emails.
 * Runs daily via Vercel Cron.
 *
 * - J-3: "Il vous reste 3 jours"
 * - J-1: "Il vous reste 1 jour"
 * - J0 (expired): "Votre essai est terminé" + mark as expired
 *
 * Protected by CRON_SECRET header to prevent unauthorized calls.
 */

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  const cronSecret = env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const results = { sent: 0, expired: 0, errors: 0 };

  try {
    // Find all trial organizations with trialEndsAt set
    const trialOrgs = await prisma.organization.findMany({
      where: {
        subscriptionStatus: 'trial',
        trialEndsAt: { not: null },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        trialEndsAt: true,
        users: {
          where: { role: 'patron' },
          select: { email: true },
          take: 1,
        },
      },
    });

    for (const org of trialOrgs) {
      if (!org.trialEndsAt || !org.users[0]?.email) continue;

      const trialEnd = new Date(org.trialEndsAt);
      const diffMs = trialEnd.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffMs / 86400000);

      const email = org.users[0].email;

      try {
        if (daysLeft === 3) {
          // J-3 reminder
          await sendTrialEndingSoonEmail(email, org.name, org.slug, 3);
          results.sent++;
        } else if (daysLeft === 1) {
          // J-1 reminder
          await sendTrialEndingSoonEmail(email, org.name, org.slug, 1);
          results.sent++;
        } else if (daysLeft <= 0) {
          // Expired — mark as expired + send final email
          await prisma.organization.update({
            where: { id: org.id },
            data: { subscriptionStatus: 'expired' },
          });
          await sendTrialEndingSoonEmail(email, org.name, org.slug, 0);
          results.expired++;
          results.sent++;
        }
      } catch (e) {
        console.error(`[Cron] Error for ${org.slug}:`, e);
        results.errors++;
      }
    }
  } catch (e) {
    console.error('[Cron] Trial reminders failed:', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    ...results,
    timestamp: now.toISOString(),
  });
}
