'use client';

import Link from 'next/link';
import { useTrialStatus } from '@/contexts/TenantContext';
import { usePathname } from 'next/navigation';
import { useApiData } from '@/hooks/useApiData';

/**
 * Paywall gate for expired trials.
 * Wraps admin content — blocks POS, orders, kitchen, menu editing when trial is expired.
 * Always allows: /admin/billing, /admin (dashboard, read-only)
 *
 * UX: emotional trigger (not technical block) — uses real tenant data to show what was built.
 */

const ALLOWED_PATHS = [
  '/admin/billing',
  '/admin/platform',
];

const ALLOWED_EXACT = [
  '/admin',
];

export default function TrialExpiredGate({ children }: { children: React.ReactNode }) {
  const { isExpired } = useTrialStatus();
  const pathname = usePathname();

  // Always fetch hooks (no conditional hooks) — only used when blocked
  const { data: menuCategories } = useApiData<any[]>('/menu/v2?full=1', []);
  const { data: orders } = useApiData<any[]>('/orders', []);

  if (!isExpired) return <>{children}</>;

  // Allow billing page and dashboard
  const isAllowed =
    ALLOWED_EXACT.includes(pathname) ||
    ALLOWED_PATHS.some((p) => pathname.startsWith(p));

  if (isAllowed) return <>{children}</>;

  // Compute real proof
  const productCount = (Array.isArray(menuCategories) ? menuCategories : []).reduce(
    (sum: number, c: any) => sum + (c.items?.length || 0),
    0
  );
  const orderCount = orders.length;
  const revenue = orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);

  const hasProof = productCount > 0 || orderCount > 0 || revenue > 0;

  const checkIcon = (
    <span className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
      <svg className="w-2.5 h-2.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );

  const pauseIcon = (
    <span className="w-4 h-4 rounded-full bg-[#1A1A1A]/5 flex items-center justify-center shrink-0">
      <svg className="w-2.5 h-2.5 text-[#8A8A8A]" fill="currentColor" viewBox="0 0 24 24">
        <rect x="6" y="5" width="4" height="14" rx="1" />
        <rect x="14" y="5" width="4" height="14" rx="1" />
      </svg>
    </span>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-[#F5F3EF] overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">

          <div className="flex justify-center mb-6">
            <img src="/brizo-logo.svg" alt="Brizo" className="h-8 w-auto" />
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-black/5 p-8 sm:p-12 space-y-8">

            <div className="flex justify-center">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-100">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-red-700">
                  Essai terminé
                </span>
              </span>
            </div>

            <div className="text-center space-y-3">
              <h1 className="text-[26px] sm:text-[32px] font-extrabold text-[#1A1A1A] tracking-tight leading-[1.15]">
                Votre essai est terminé.
              </h1>
              <p className="text-[15px] text-[#6B6B6B] leading-relaxed">
                Réactivez votre restaurant pour reprendre les commandes.
              </p>
            </div>

            <div className="bg-[#FAFAF8] border border-[#EDEBE7] rounded-2xl p-6 space-y-4">
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#7C3AED]">
                Ce que vous avez construit
              </p>
              {hasProof ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {productCount > 0 && (
                    <div>
                      <p className="text-3xl font-extrabold text-[#1A1A1A] tracking-tight">{productCount}</p>
                      <p className="text-[12px] text-[#8A8A8A] mt-0.5">produit{productCount > 1 ? 's' : ''} configuré{productCount > 1 ? 's' : ''}</p>
                    </div>
                  )}
                  {orderCount > 0 && (
                    <div>
                      <p className="text-3xl font-extrabold text-[#1A1A1A] tracking-tight">{orderCount}</p>
                      <p className="text-[12px] text-[#8A8A8A] mt-0.5">commande{orderCount > 1 ? 's' : ''} traitée{orderCount > 1 ? 's' : ''}</p>
                    </div>
                  )}
                  {revenue > 0 && (
                    <div>
                      <p className="text-3xl font-extrabold text-[#1A1A1A] tracking-tight">{revenue.toFixed(0)} €</p>
                      <p className="text-[12px] text-[#8A8A8A] mt-0.5">de chiffre d&apos;affaires</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[14px] text-[#1A1A1A] leading-relaxed">
                  Votre restaurant est prêt — POS, menu et kiosk configurés.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-[13px] font-semibold text-[#1A1A1A]">
                En attendant, voici ce qui est en pause :
              </p>
              <ul className="space-y-2.5">
                <li className="flex items-center gap-3 text-[13px] text-[#6B6B6B]">
                  {pauseIcon}
                  POS en caisse
                </li>
                <li className="flex items-center gap-3 text-[13px] text-[#6B6B6B]">
                  {pauseIcon}
                  Commande en ligne
                </li>
                <li className="flex items-center gap-3 text-[13px] text-[#6B6B6B]">
                  {pauseIcon}
                  KDS — tickets cuisine
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <Link
                href="/admin/billing"
                className="block w-full py-4 rounded-2xl bg-[#1A1A1A] text-white font-bold text-[15px] text-center hover:bg-[#333] transition-colors active:scale-[0.99]"
              >
                Réactiver mon restaurant
              </Link>
              <p className="text-center text-[12px] text-[#8A8A8A]">
                Activation instantanée après paiement
              </p>
            </div>

            <div className="text-center space-y-1">
              <p className="text-[15px] text-[#1A1A1A]">
                <span className="font-bold">49 €/mois</span> — tous modules inclus
              </p>
              <p className="text-[12px] text-[#8A8A8A]">
                Moins qu&apos;une portion de frites par jour
              </p>
            </div>

            <div className="pt-6 border-t border-[#EDEBE7]">
              <ul className="space-y-2.5">
                <li className="flex items-center gap-3 text-[13px] text-[#6B6B6B]">
                  {checkIcon}
                  Vos données sont conservées
                </li>
                <li className="flex items-center gap-3 text-[13px] text-[#6B6B6B]">
                  {checkIcon}
                  Sans engagement — annulable en 1 clic
                </li>
                <li className="flex items-center gap-3 text-[13px] text-[#6B6B6B]">
                  {checkIcon}
                  Paiement sécurisé Stripe
                </li>
              </ul>
            </div>

          </div>

          <p className="text-center text-[11px] text-[#B0ADA6] mt-6">
            Une question ? <a href="mailto:support@brizoapp.com" className="underline hover:text-[#1A1A1A]">support@brizoapp.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
