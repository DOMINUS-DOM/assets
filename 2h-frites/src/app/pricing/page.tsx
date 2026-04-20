'use client';

import Link from 'next/link';
import { useTenant } from '@/contexts/TenantContext';

const PROFILES = [
  { name: 'Snack / Friterie', modules: ['Base'], price: 49 },
  { name: 'Restaurant avec livraison', modules: ['Base', 'Web'], price: 68 },
  { name: 'Restaurant complet', modules: ['Base', 'Web', 'KDS', 'Multi-users'], price: 82 },
];

export default function PricingPage() {
  const { isPlatform } = useTenant();

  // Only show on platform — tenants use /admin/billing
  if (!isPlatform) return null;

  return (
    <div className="min-h-screen bg-[#F5F3EF]">
      {/* Nav */}
      <nav className="bg-[#F5F3EF]/85 backdrop-blur-xl border-b border-[#D4D0C8]/60">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-8 h-16">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brizo-icon.svg" alt="BrizoApp" className="h-7 w-7" />
            <span className="text-[15px] font-semibold text-[#1A1A1A] tracking-tight">BrizoApp</span>
          </Link>
          <Link href="/signup" className="px-4 py-1.5 rounded-full bg-[#1A1A1A] text-white text-[13px] font-medium">
            Essayer
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-[11px] font-medium tracking-[0.25em] uppercase text-[#7C3AED] mb-4">Tarifs</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1A1A1A] tracking-tight leading-tight mb-4">
            Simple et transparent.
          </h1>
          <p className="text-[16px] text-[#8A8A8A] max-w-lg mx-auto">
            Une base à 49&euro;/mois. Ajoutez les modules dont vous avez besoin. Changez d&apos;avis quand vous voulez.
          </p>
        </div>

        {/* Base plan */}
        <div className="p-8 rounded-2xl bg-white border border-[#E5E2DC] shadow-sm mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">Base &mdash; POS + Backoffice</h2>
              <p className="text-[14px] text-[#8A8A8A]">Caisse, gestion menu, tableau de bord, 1 site, 1 admin.</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-[#1A1A1A]">49</span>
              <span className="text-[#B0ADA6] text-sm">&euro;/mois</span>
            </div>
          </div>
        </div>

        {/* Addons */}
        <h3 className="text-[12px] font-semibold tracking-[0.15em] uppercase text-[#B0ADA6] mb-4 mt-10">Modules optionnels</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-16">
          {[
            { name: 'Commande en ligne', desc: 'Menu web, panier, checkout', price: 19 },
            { name: 'Kiosk', desc: 'Borne de commande autonome', price: 19 },
            { name: 'Écran cuisine (KDS)', desc: 'Affichage temps réel des commandes', price: 9 },
            { name: 'Analytics avancé', desc: 'Rapports, prévisions, exports', price: 9 },
            { name: 'Multi-utilisateurs', desc: 'Jusqu\'à 5 comptes employés', price: 15 },
          ].map((a, i) => (
            <div key={i} className="flex items-center justify-between p-5 rounded-xl bg-white border border-[#E5E2DC] hover:border-[#D4D0C8] transition-colors">
              <div>
                <p className="text-[14px] font-medium text-[#1A1A1A]">{a.name}</p>
                <p className="text-[12px] text-[#B0ADA6]">{a.desc}</p>
              </div>
              <span className="text-[14px] font-bold text-[#1A1A1A]">+{a.price}&euro;</span>
            </div>
          ))}
        </div>

        {/* Use cases */}
        <h3 className="text-[12px] font-semibold tracking-[0.15em] uppercase text-[#B0ADA6] mb-4">Exemples concrets</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {PROFILES.map((p, i) => (
            <div key={i} className="p-5 rounded-xl bg-white border border-[#E5E2DC]">
              <p className="text-[14px] font-bold text-[#1A1A1A] mb-2">{p.name}</p>
              <p className="text-[12px] text-[#B0ADA6] mb-3">{p.modules.join(' + ')}</p>
              <p className="text-2xl font-extrabold text-[#1A1A1A]">{p.price}<span className="text-[13px] font-normal text-[#B0ADA6]"> &euro;/mois</span></p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/signup" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#1A1A1A] text-white font-medium text-[14px] hover:bg-[#333] transition-colors">
            Commencer l&apos;essai gratuit &rarr;
          </Link>
          <p className="text-[12px] text-[#B0ADA6] mt-4">10 jours gratuits &middot; Annulable à tout moment</p>
          <p className="text-[12px] text-[#B0ADA6] mt-2">
            Utilisé par <span className="font-semibold text-[#1A1A1A]">50+ restaurants</span> en Belgique
          </p>
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <h3 className="text-[12px] font-semibold tracking-[0.15em] uppercase text-[#B0ADA6] mb-6">Questions fréquentes</h3>
          <div className="space-y-4">
            {[
              { q: 'Puis-je changer de modules à tout moment ?', a: 'Oui. Ajoutez ou retirez des modules quand vous voulez. La facturation s\'ajuste automatiquement.' },
              { q: 'Y a-t-il un engagement ?', a: 'Non. Abonnement mensuel, annulable à tout moment en un clic.' },
              { q: 'Que se passe-t-il après l\'essai gratuit ?', a: 'Après 10 jours, vous choisissez votre plan. Vos données sont conservées. Si vous ne souscrivez pas, votre compte est suspendu mais pas supprimé.' },
              { q: 'Combien de temps faut-il pour démarrer ?', a: 'Créez votre compte, ajoutez vos produits, et encaissez votre première commande. Comptez 2 à 5 minutes.' },
            ].map((faq, i) => (
              <div key={i} className="p-5 rounded-xl bg-white border border-[#E5E2DC]">
                <p className="text-[14px] font-medium text-[#1A1A1A] mb-2">{faq.q}</p>
                <p className="text-[13px] text-[#8A8A8A] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#D4D0C8]/60 py-8">
        <div className="max-w-[1200px] mx-auto px-8 flex items-center justify-between">
          <span className="text-[12px] text-[#B0ADA6]">&copy; 2026 BrizoApp</span>
          <div className="flex gap-6 text-[12px] text-[#B0ADA6]">
            <Link href="/" className="hover:text-[#6B6B6B]">Accueil</Link>
            <a href="mailto:contact@brizoapp.com" className="hover:text-[#6B6B6B]">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
