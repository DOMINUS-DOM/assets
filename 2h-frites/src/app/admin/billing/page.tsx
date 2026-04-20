'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTenant, useTrialStatus } from '@/contexts/TenantContext';
import { api } from '@/lib/api';

interface Addon {
  key: string;
  label: string;
  description: string;
  price: number;
}

const ADDONS: Addon[] = [
  { key: 'web', label: 'Vente en ligne', description: 'Menu web, panier et checkout', price: 19 },
  { key: 'kiosk', label: 'Kiosk', description: 'Borne de commande autonome', price: 19 },
  { key: 'kds', label: 'Écran cuisine (KDS)', description: 'Affichage temps réel des commandes', price: 9 },
  { key: 'analytics', label: 'Analytics avancé', description: 'Rapports, prévisions, exports', price: 9 },
  { key: 'multiusers', label: 'Multi-utilisateurs', description: "Jusqu'à 5 comptes employés", price: 15 },
];

const BASE_PRICE = 49;

export default function BillingPage() {
  const { tenant } = useTenant();
  const { isTrial, isExpired, daysLeft } = useTrialStatus();
  const searchParams = useSearchParams();
  const success = searchParams.get('success');

  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [reactivateLoading, setReactivateLoading] = useState(false);

  const toggleAddon = (key: string) => {
    setSelectedAddons((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  const total = BASE_PRICE + ADDONS.filter((a) => selectedAddons.includes(a.key)).reduce((s, a) => s + a.price, 0);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { url } = await api.post<{ url: string }>('/stripe/checkout', { addons: selectedAddons });
      if (url) window.location.href = url;
    } catch (e) {
      alert('Erreur. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const handleManagePortal = async () => {
    setPortalLoading(true);
    try {
      const { url } = await api.post<{ url: string }>('/stripe/portal', {});
      if (url) window.location.href = url;
    } catch (e) {
      alert('Impossible d\u2019ouvrir le portail. R\u00e9essayez.');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!confirm('Réactiver votre abonnement ? Il reprendra au prochain cycle comme prévu.')) return;
    setReactivateLoading(true);
    try {
      await api.post<{ ok: boolean }>('/stripe/reactivate', {});
      window.location.reload();
    } catch (e) {
      alert('Impossible de réactiver. Réessayez ou passez par le portail.');
    } finally {
      setReactivateLoading(false);
    }
  };

  const status = tenant?.subscriptionStatus;
  const isActive = status === 'active';
  const isPastDue = status === 'past_due';
  const hasStripeSub = isActive || isPastDue;
  const cancelAt = tenant?.cancelAt ? new Date(tenant.cancelAt) : null;
  const cancelAtLabel = cancelAt
    ? cancelAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white">Abonnement</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {isActive ? 'Votre abonnement est actif.' :
           isExpired ? 'Votre essai est terminé. Choisissez un plan pour continuer.' :
           isTrial ? `Essai gratuit — ${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}.` :
           'Choisissez votre plan.'}
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
          Paiement enregistré ! Votre abonnement est actif.
        </div>
      )}

      {isPastDue && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
          Votre dernier paiement a échoué. Mettez à jour votre moyen de paiement pour continuer.
        </div>
      )}

      {isActive && cancelAtLabel && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-amber-400">Abonnement programmé pour annulation</h2>
            <p className="text-xs text-amber-300/80 mt-1">
              Votre accès reste actif jusqu&apos;au <span className="font-semibold">{cancelAtLabel}</span>. Passé cette date, le paywall s&apos;activera.
            </p>
          </div>
          <button
            onClick={handleReactivate}
            disabled={reactivateLoading}
            className="shrink-0 px-5 py-2.5 rounded-xl bg-amber-400 text-zinc-950 font-bold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {reactivateLoading ? 'Réactivation…' : 'Réactiver'}
          </button>
        </div>
      )}

      {hasStripeSub && (
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800/50 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white">Gérer mon abonnement</h2>
            <p className="text-xs text-zinc-500 mt-1">
              Moyen de paiement, factures, annulation. Le changement de plan ou d&apos;addons se fait ici, sur Brizo.
            </p>
          </div>
          <button
            onClick={handleManagePortal}
            disabled={portalLoading}
            className="shrink-0 px-5 py-2.5 rounded-xl bg-white text-zinc-950 font-bold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {portalLoading ? 'Ouverture…' : 'Ouvrir le portail'}
          </button>
        </div>
      )}

      {!hasStripeSub && (
        <>
          {/* Base plan */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Base — POS + Backoffice</h2>
                <p className="text-xs text-zinc-500 mt-1">Caisse, gestion menu, tableau de bord, 1 site, 1 admin</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-brand-light">{BASE_PRICE}</span>
                <span className="text-xs text-zinc-500 ml-1">EUR/mois</span>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-zinc-600 bg-zinc-800/50 rounded-lg px-3 py-1.5 inline-block">
              Inclus dans tous les plans
            </div>
          </div>

          {/* Addons */}
          <div>
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Modules optionnels</h2>
            <div className="space-y-3">
              {ADDONS.map((addon) => {
                const selected = selectedAddons.includes(addon.key);
                return (
                  <button key={addon.key} onClick={() => toggleAddon(addon.key)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                      selected ? 'bg-brand/10 border-brand/30' : 'bg-zinc-900 border-zinc-800/50 hover:border-zinc-700'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                        selected ? 'bg-brand border-brand' : 'border-zinc-600'
                      }`}>
                        {selected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{addon.label}</p>
                        <p className="text-xs text-zinc-500">{addon.description}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-brand-light">+{addon.price} EUR</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Total + CTA */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800/50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-zinc-400">Total mensuel</span>
              <span className="text-2xl font-extrabold text-white">{total} <span className="text-sm text-zinc-500">EUR/mois</span></span>
            </div>
            <button onClick={handleSubscribe} disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand to-orange-500 text-zinc-950 font-bold text-sm active:scale-[0.98] transition-transform disabled:opacity-50">
              {loading ? 'Redirection...' : isTrial ? `Souscrire — ${total} EUR/mois` : `Choisir ce plan — ${total} EUR/mois`}
            </button>
            {isTrial && daysLeft > 0 && (
              <p className="text-xs text-zinc-500 text-center mt-3">
                Vous ne serez pas débité avant la fin de votre essai ({daysLeft} jour{daysLeft > 1 ? 's' : ''}).
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
