'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { BRIZO_VERSION_LABEL } from '@/lib/version';

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const els = ref.current.querySelectorAll('[data-reveal]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('brizo-animate');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return ref;
}

// Social proof is derived from the live 2hfrites.be tenant — no hardcoded
// cohort count to avoid claims we can't verify.

export default function PlatformLanding() {
  const pageRef = useReveal();

  return (
    <div ref={pageRef} className="min-h-screen bg-[#F5F3EF] text-[#1A1A1A]">

      {/* ═══ NAV ═══ */}
      <nav className="fixed top-0 w-full z-50 bg-[#F5F3EF]/85 backdrop-blur-xl">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-8 h-16">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brizo-icon.svg" alt="BrizoApp" className="h-7 w-7" />
            <span className="text-[15px] font-semibold tracking-tight">BrizoApp</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-md bg-[#1A1A1A]/5 text-[10px] font-medium text-[#6B6B6B] tracking-wide">BETA</span>
          </Link>
          <div className="flex items-center gap-6">
            <a href="#comparatif" className="hidden md:block text-[13px] text-[#8A8A8A] hover:text-[#1A1A1A] transition-colors">Pourquoi Brizo</a>
            <a href="#etapes" className="hidden md:block text-[13px] text-[#8A8A8A] hover:text-[#1A1A1A] transition-colors">Comment ça marche</a>
            <a href="#prix" className="hidden md:block text-[13px] text-[#8A8A8A] hover:text-[#1A1A1A] transition-colors">Tarif</a>
            <Link href="/login" className="text-[13px] text-[#8A8A8A] hover:text-[#1A1A1A] transition-colors">Connexion</Link>
            <Link href="/signup" className="px-4 py-1.5 rounded-full bg-[#1A1A1A] text-white text-[13px] font-medium hover:bg-[#333] transition-colors">
              Essayer
            </Link>
          </div>
        </div>
        <div className="h-px bg-[#D4D0C8]/60" />
      </nav>

      {/* ═══ 1. HERO ═══ */}
      <section className="pt-32 pb-16 px-8">
        <div className="max-w-[1000px] mx-auto text-center">
          <div
            data-reveal
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E5E2DC] text-[12px] text-[#6B6B6B] mb-8"
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {BRIZO_VERSION_LABEL} · en production sur 2hfrites.be
          </div>

          <p data-reveal className="text-[14px] md:text-[15px] font-semibold tracking-tight text-[#fe646c] mb-5">
            Arrêtez de donner 30 % aux marketplaces.
          </p>

          <h1 data-reveal className="text-[44px] md:text-[64px] font-extrabold tracking-[-0.03em] leading-[1.02] mb-7">
            Votre resto en ligne.<br />
            En 10 minutes.<br />
            <span className="bg-gradient-to-r from-[#108eff] via-[#9f32fd] to-[#fe646c] bg-clip-text text-transparent">Sans commission.</span>
          </h1>

          <p data-reveal className="text-[17px] md:text-[19px] text-[#1A1A1A] max-w-[640px] mx-auto mb-3 leading-relaxed">
            Collez votre carte <span className="text-[#9f32fd]">→</span> Brizo crée votre menu automatiquement.
          </p>
          <p data-reveal className="text-[15px] md:text-[16px] italic text-[#6B6B6B] max-w-[640px] mx-auto mb-10 leading-relaxed">
            Dans 10 minutes, vos clients peuvent déjà commander chez vous.
          </p>

          <div data-reveal className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-[#108eff] via-[#9f32fd] to-[#fe646c] text-white font-medium text-[15px] hover:shadow-xl hover:shadow-violet-500/20 transition-all duration-300 hover:-translate-y-0.5"
            >
              Tester gratuitement
              <span>→</span>
            </Link>
            <a href="#etapes" className="text-[14px] text-[#6B6B6B] hover:text-[#1A1A1A] underline underline-offset-4 decoration-[#D4D0C8]">
              Voir comment ça marche
            </a>
          </div>

          <p data-reveal className="text-[12px] text-[#B0ADA6]">
            10 jours d'essai · Sans carte bancaire · Sans engagement
          </p>
        </div>
      </section>

      {/* ═══ 2. PROOF BAR ═══ */}
      <section className="pb-16 px-8">
        <div data-reveal className="max-w-[900px] mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[13px] text-[#8A8A8A]">
          <a href="https://www.2hfrites.be" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-[#1A1A1A] transition-colors">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <strong className="text-[#1A1A1A] font-semibold">2hfrites.be</strong> utilise Brizo en production
            <span>↗</span>
          </a>
          <span className="text-[#D4D0C8]">·</span>
          <span>Testé en rush, sur mobile, en service réel</span>
        </div>
      </section>

      {/* ═══ 3. COMPARATIF MARKETPLACE ═══ */}
      <section id="comparatif" className="py-24 px-8 bg-white">
        <div className="max-w-[1000px] mx-auto">
          <div data-reveal className="max-w-[700px] mb-14">
            <p className="text-[13px] font-semibold tracking-[0.15em] uppercase text-[#9f32fd] mb-3">Pourquoi Brizo</p>
            <h2 className="text-[36px] md:text-[44px] font-bold tracking-[-0.02em] leading-[1.1] mb-4">
              Les marketplaces prennent 30 %. Et vos clients ne sont même pas à vous.
            </h2>
            <p className="text-[16px] text-[#6B6B6B] leading-relaxed">
              Uber Eats, Deliveroo, Takeaway font vendre — mais à quel prix ? Brizo renverse le modèle :
              vous digitalisez votre resto sans perdre ce qui fait tourner votre affaire.
            </p>
          </div>

          <div data-reveal className="rounded-2xl border border-[#E5E2DC] overflow-hidden shadow-sm">
            <div className="grid grid-cols-[1fr_1fr_1fr]">
              <div className="bg-[#FAFAF8] p-5 border-b border-r border-[#E5E2DC]"></div>
              <div className="bg-red-50/60 p-5 border-b border-r border-[#E5E2DC] text-[13px] font-semibold text-red-700">
                Marketplace type Uber Eats
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-50/40 p-5 border-b border-[#E5E2DC] text-[13px] font-semibold text-emerald-800">
                Avec Brizo
              </div>

              {[
                { label: 'Commission', bad: '25 à 30 % par commande', good: '0 %, jamais' },
                { label: 'Vos clients', bad: 'Propriété de la plateforme', good: 'À vous, avec leurs coordonnées' },
                { label: 'Votre marque', bad: 'Noyée parmi des centaines', good: 'Votre logo, votre URL, votre site' },
                { label: 'Règles du jeu', bad: 'Changent sans prévenir', good: 'Vous décidez du prix et des promos' },
                { label: 'Onboarding', bad: 'Équipe commerciale, semaines d\'attente', good: '10 minutes, en autonomie' },
              ].map((row, i, arr) => {
                const last = i === arr.length - 1;
                return (
                  <div key={row.label} className="contents">
                    <div className={`p-5 text-[13px] font-medium text-[#1A1A1A] bg-[#FAFAF8] border-r border-[#E5E2DC] ${last ? '' : 'border-b'}`}>
                      {row.label}
                    </div>
                    <div className={`p-5 text-[14px] text-red-800/80 bg-red-50/30 border-r border-[#E5E2DC] ${last ? '' : 'border-b'}`}>
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500/10 text-red-600 text-[10px] mr-2 align-middle">✕</span>
                      <span className="line-through decoration-red-400/60 decoration-1">{row.bad}</span>
                    </div>
                    <div className={`p-5 text-[14px] text-[#1A1A1A] font-medium bg-emerald-50/40 ${last ? '' : 'border-b border-[#E5E2DC]'}`}>
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-700 text-[10px] mr-2 align-middle">✓</span>
                      {row.good}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 4. COMMENT ÇA MARCHE ═══ */}
      <section id="etapes" className="py-24 px-8">
        <div className="max-w-[1000px] mx-auto">
          <div data-reveal className="text-center max-w-[700px] mx-auto mb-16">
            <p className="text-[13px] font-semibold tracking-[0.15em] uppercase text-[#108eff] mb-3">En 10 minutes chrono</p>
            <h2 className="text-[36px] md:text-[44px] font-bold tracking-[-0.02em] leading-[1.1] mb-4">
              De votre carte à votre première commande en ligne.
            </h2>
            <p className="text-[16px] text-[#6B6B6B] leading-relaxed">
              Pas de technique. Pas d'agence. Pas de rendez-vous commercial.
            </p>
          </div>

          {/* Démo vidéo — source de vérité de la conversion.
              Affichée si NEXT_PUBLIC_DEMO_VIDEO_URL est définie côté Vercel.
              Placeholder élégant sinon pour ne jamais casser le layout. */}
          <div data-reveal className="mb-14 max-w-[860px] mx-auto">
            {process.env.NEXT_PUBLIC_DEMO_VIDEO_URL ? (
              <div className="aspect-video rounded-2xl overflow-hidden border border-[#EDEBE7] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.25)]">
                <iframe
                  src={process.env.NEXT_PUBLIC_DEMO_VIDEO_URL}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                  title="Démo produit Brizo"
                />
              </div>
            ) : (
              <div className="aspect-video rounded-2xl bg-gradient-to-br from-[#108eff]/10 via-[#9f32fd]/10 to-[#fe646c]/10 border border-[#EDEBE7] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white text-[20px] leading-none">▶</div>
                  <p className="text-[15px] font-semibold text-[#1A1A1A]">Démo produit 90 sec</p>
                  <p className="text-[12px] text-[#8A8A8A] mt-1">Disponible très prochainement</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Étape 01 — avec mini-mockup avant/après (le vrai différenciateur) */}
            <div data-reveal className="bg-white border border-[#E5E2DC] rounded-2xl p-7 hover:border-[#D4D0C8] transition-colors">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#108eff] to-[#9f32fd] text-white font-bold text-[13px] mb-5">01</div>
              <h3 className="text-[18px] font-semibold tracking-tight mb-2">Collez votre carte</h3>
              <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-5">
                Word, PDF, notes iPhone, photo re-tapée — Brizo détecte catégories et prix automatiquement.
              </p>
              {/* Mini before/after mockup: raw text → clean product chip */}
              <div className="rounded-xl bg-[#FAFAF8] border border-[#E5E2DC] p-3 space-y-2">
                <div className="font-mono text-[11px] text-[#8A8A8A] leading-relaxed whitespace-pre-line">{'BURGERS\nCheeseburger 9.50\nHamburger 8'}</div>
                <div className="flex items-center justify-center text-[#9f32fd] text-[12px] font-semibold tracking-wider py-1">↓</div>
                <div className="space-y-1.5">
                  <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#9f32fd]">Burgers</div>
                  <div className="flex items-center justify-between rounded-lg bg-white border border-[#E5E2DC] px-2.5 py-1.5">
                    <span className="text-[12px] font-medium text-[#1A1A1A]">Cheeseburger</span>
                    <span className="text-[12px] font-semibold text-[#1A1A1A]">9,50 €</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-white border border-[#E5E2DC] px-2.5 py-1.5">
                    <span className="text-[12px] font-medium text-[#1A1A1A]">Hamburger</span>
                    <span className="text-[12px] font-semibold text-[#1A1A1A]">8,00 €</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Étape 02 — preview produit branding */}
            <div data-reveal className="bg-white border border-[#E5E2DC] rounded-2xl p-7 hover:border-[#D4D0C8] transition-colors">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#9f32fd] to-[#fe646c] text-white font-bold text-[13px] mb-5">02</div>
              <h3 className="text-[18px] font-semibold tracking-tight mb-2">Ajoutez votre identité</h3>
              <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-5">
                Logo, couleurs, tagline. Votre site ressemble à vous — pas à un template.
              </p>
              {/* Mini mockup: sample restaurant homepage */}
              <div className="rounded-xl bg-[#FAFAF8] border border-[#E5E2DC] p-4 space-y-3 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-br from-[#9f32fd] to-[#fe646c] flex items-center justify-center text-white font-bold text-[13px]">B</div>
                <p className="text-[14px] font-extrabold text-[#1A1A1A] leading-tight">Bistrot du Coin</p>
                <p className="text-[11px] text-[#8A8A8A]">Cuisine maison · Bruxelles</p>
                <div className="flex gap-1.5 justify-center">
                  <span className="w-4 h-4 rounded-full bg-[#9f32fd]" />
                  <span className="w-4 h-4 rounded-full bg-[#fe646c]" />
                  <span className="w-4 h-4 rounded-full bg-[#F59E0B]" />
                </div>
              </div>
            </div>

            {/* Étape 03 — commandes qui arrivent */}
            <div data-reveal className="bg-white border border-[#E5E2DC] rounded-2xl p-7 hover:border-[#D4D0C8] transition-colors">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#fe646c] to-[#108eff] text-white font-bold text-[13px] mb-5">03</div>
              <h3 className="text-[18px] font-semibold tracking-tight mb-2">Partagez votre URL</h3>
              <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-5">
                Instagram bio, QR code, Google Business. Les commandes arrivent sur votre caisse.
              </p>
              {/* Mini mockup: live incoming orders */}
              <div className="rounded-xl bg-[#FAFAF8] border border-[#E5E2DC] p-3 space-y-2">
                <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#9f32fd] px-1">Commandes en direct</p>
                <div className="flex items-center justify-between rounded-lg bg-white border border-[#E5E2DC] px-2.5 py-2">
                  <div>
                    <p className="text-[11px] font-bold text-[#1A1A1A]">ORD-102</p>
                    <p className="text-[10px] text-[#8A8A8A]">il y a 1 min · Retrait</p>
                  </div>
                  <span className="text-[12px] font-bold text-[#1A1A1A] tabular-nums">11,90 €</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white border border-[#E5E2DC] px-2.5 py-2">
                  <div>
                    <p className="text-[11px] font-bold text-[#1A1A1A]">ORD-101</p>
                    <p className="text-[10px] text-[#8A8A8A]">il y a 4 min · Livraison</p>
                  </div>
                  <span className="text-[12px] font-bold text-[#1A1A1A] tabular-nums">45,40 €</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 pt-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-[#6B6B6B]">En temps réel</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 5. CE QUE VOUS AVEZ (bento) ═══ */}
      <section className="py-24 px-8 bg-white">
        <div className="max-w-[1000px] mx-auto">
          <div data-reveal className="text-center max-w-[700px] mx-auto mb-14">
            <p className="text-[13px] font-semibold tracking-[0.15em] uppercase text-[#fe646c] mb-3">Un outil. Quatre usages.</p>
            <h2 className="text-[36px] md:text-[44px] font-bold tracking-[-0.02em] leading-[1.1]">
              Tout ce qu'il faut pour tourner. Rien de plus.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {[
              {
                icon: '📲',
                title: 'Site de commande en ligne',
                desc: 'URL à vous, branding à vous, mobile-first. Retrait ou livraison, paiement sur place ou en ligne.',
              },
              {
                icon: '💳',
                title: 'Caisse (POS)',
                desc: 'iPad ou laptop. Tickets, remises, encaissement, mode hors ligne. Utilisée en rush chez 2H Frites.',
              },
              {
                icon: '📋',
                title: 'Menu unifié',
                desc: 'Une modification — site, caisse et kiosk se mettent à jour. Import par collage de votre carte.',
              },
              {
                icon: '📊',
                title: 'Tableau de bord',
                desc: 'Ventes du jour, articles populaires, heures de pointe, export comptable. Pas de graphiques inutiles.',
              },
            ].map((f) => (
              <div
                key={f.title}
                data-reveal
                className="bg-[#FAFAF8] border border-[#E5E2DC] rounded-2xl p-6 hover:bg-white transition-colors"
              >
                <div className="text-[28px] mb-3">{f.icon}</div>
                <h3 className="text-[16px] font-semibold tracking-tight mb-1.5">{f.title}</h3>
                <p className="text-[14px] text-[#6B6B6B] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 6. BETA / SOCIAL PROOF ═══ */}
      <section className="py-24 px-8">
        <div className="max-w-[720px] mx-auto text-center">
          <div data-reveal>
            <p className="text-[13px] font-semibold tracking-[0.15em] uppercase text-[#9f32fd] mb-3">Construit avec vous</p>
            <h2 className="text-[36px] md:text-[44px] font-bold tracking-[-0.02em] leading-[1.1] mb-6">
              Un produit vivant, guidé par ses utilisateurs.
            </h2>
            <p className="text-[16px] text-[#6B6B6B] leading-relaxed mb-4">
              Brizo est en bêta active ({BRIZO_VERSION_LABEL.replace('Brizo Beta ', '')}). Ça veut dire :
            </p>
            <ul className="space-y-3 text-[15px] text-[#1A1A1A] text-left max-w-[480px] mx-auto mb-8">
              <li className="flex gap-3"><span className="text-[#9f32fd] font-bold">→</span> Vos retours deviennent des décisions produit, pas un post-it</li>
              <li className="flex gap-3"><span className="text-[#9f32fd] font-bold">→</span> Vous parlez directement au fondateur, pas à un call center</li>
              <li className="flex gap-3"><span className="text-[#9f32fd] font-bold">→</span> Des mises à jour chaque semaine, sans rupture de service</li>
            </ul>
          </div>

          {/* Live signal — concrete and verifiable, no invented counts */}
          <a
            data-reveal
            href="https://www.2hfrites.be"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-white border border-[#EDEBE7] hover:border-[#1A1A1A]/30 transition-colors"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-[14px] text-[#1A1A1A]">
              <strong className="font-semibold">2hfrites.be</strong> utilise Brizo en production
            </span>
            <span className="text-[#6B6B6B]">↗</span>
          </a>
        </div>
      </section>

      {/* ═══ 7. PRIX + CTA FINAL ═══ */}
      <section id="prix" className="py-24 px-8 bg-white">
        <div className="max-w-[700px] mx-auto text-center">
          <div data-reveal>
            <p className="text-[13px] font-semibold tracking-[0.15em] uppercase text-[#108eff] mb-3">Un prix. Pas de piège.</p>
            <h2 className="text-[36px] md:text-[48px] font-bold tracking-[-0.02em] leading-[1.05] mb-8">
              49 € par mois. Tout inclus.
            </h2>
          </div>

          <ul data-reveal className="space-y-3 text-left max-w-[440px] mx-auto mb-10">
            {[
              'Site de commande en ligne + caisse + menu + analytics',
              'Zéro commission sur vos ventes, jamais',
              'Pas de frais d\'installation, pas d\'engagement',
              '10 jours d\'essai gratuits, sans carte bancaire',
            ].map((b) => (
              <li key={b} className="flex items-start gap-3 text-[15px] text-[#1A1A1A]">
                <span className="mt-1 text-emerald-600 shrink-0">✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <div data-reveal className="flex flex-col items-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#108eff] via-[#9f32fd] to-[#fe646c] text-white font-medium text-[15px] hover:shadow-xl hover:shadow-violet-500/20 transition-all duration-300 hover:-translate-y-0.5"
            >
              Tester gratuitement
              <span>→</span>
            </Link>
            <a href="https://calendly.com/brizoapp" target="_blank" rel="noopener noreferrer" className="text-[13px] text-[#6B6B6B] hover:text-[#1A1A1A] underline underline-offset-4 decoration-[#D4D0C8]">
              Parler avec le fondateur (15 min)
            </a>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-12 px-8 border-t border-[#D4D0C8]/60">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brizo-icon.svg" alt="" className="h-5 w-5 opacity-30" />
            <span className="text-[12px] text-[#B0ADA6]">&copy; 2026 BrizoApp</span>
            <span className="ml-3 text-[11px] text-[#C8C5BE] font-mono">{BRIZO_VERSION_LABEL}</span>
          </div>
          <div className="flex gap-8 text-[12px] text-[#B0ADA6]">
            <a href="/legal" className="hover:text-[#6B6B6B] transition-colors">Mentions légales</a>
            <a href="mailto:contact@brizoapp.com" className="hover:text-[#6B6B6B] transition-colors">Contact</a>
            <Link href="/login" className="hover:text-[#6B6B6B] transition-colors">Connexion</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
