'use client';

import Link from 'next/link';
import { useTrialStatus } from '@/contexts/TenantContext';

export default function TrialBanner() {
  const { isTrial, isExpired, daysLeft } = useTrialStatus();

  if (!isTrial && !isExpired) return null;

  if (isExpired) {
    return (
      <div className="bg-red-600 text-white text-center py-2.5 px-4 text-sm font-semibold">
        ⚠ Votre essai est terminé — votre accès est limité.{' '}
        <Link href="/admin/billing" className="underline font-bold hover:text-red-100">
          Souscrire maintenant
        </Link>
      </div>
    );
  }

  // Graduated urgency
  const isUrgent = daysLeft <= 3;
  const isCritical = daysLeft <= 1;

  const bgClass = isCritical
    ? 'bg-red-500'
    : isUrgent
    ? 'bg-amber-500'
    : 'bg-gradient-to-r from-violet-600 to-blue-500';

  const message = isCritical
    ? `⏰ Dernier jour d'essai !`
    : isUrgent
    ? `⚠ Plus que ${daysLeft} jour${daysLeft > 1 ? 's' : ''} d'essai gratuit.`
    : `Essai gratuit — ${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}.`;

  return (
    <div className={`${bgClass} text-white text-center py-2 px-4 text-sm font-medium`}>
      {message}{' '}
      <Link href="/admin/billing" className="underline font-bold">
        Choisir un plan
      </Link>
    </div>
  );
}
