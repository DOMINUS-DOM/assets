# CLAUDE.md — BrizoApp

## Vision produit

BrizoApp est une plateforme SaaS automatisee pour restaurants.

Objectif principal :
- permettre a un restaurant de s'inscrire, payer et etre operationnel immediatement, sans intervention humaine.

## Objectif business

Creer une machine de vente autonome :
- inscription en ligne
- paiement en ligne (Stripe, essai gratuit 10 jours)
- creation automatique du restaurant (Organization + Location + User)
- activation immediate des modules
- acces instantane au backoffice client

## Architecture

### 1. Plateforme (brizoapp.com)
- Landing page premium (fond clair, design Stripe-like)
- Signup self-service (/signup)
- Login (/login)
- Pricing (a venir)
- Cookie de session HttpOnly sur .brizoapp.com

### 2. Backoffice Brizo (SUPER ADMIN UNIQUEMENT)
- Gestion des clients (organizations)
- Gestion des abonnements
- Analytics global
- Role: `platform_super_admin`

### 3. Tenant (restaurant)
- Subdomain: slug.brizoapp.com
- Custom domain possible (ex: www.2hfrites.be)
- Admin restaurant
- POS / Kiosk / Web / KDS
- Branding propre (couleurs, logo, nom)

## Multi-Tenant

- Modele Organization = frontiere tenant
- Middleware `src/middleware.ts` : resout le slug depuis le hostname
- TenantContext : fournit org + branding + modules a tous les composants
- TenantThemeProvider : injecte CSS variables depuis brandingJson
- Isolation : `enforceOrganization()` dans auth.ts

## Modules activables par tenant

Stockes dans `Organization.modulesJson` :
- POS, Kiosk, Commande en ligne, KDS, Analytics
- Reservations, Delivery, CRM, Inventory, Payroll, Signage
- Default: tout active (`{}` = tous true)
- FeatureGate component pour le gating UI + route

## Roles

| Role | Scope | Acces |
|------|-------|-------|
| `platform_super_admin` | Plateforme | Tout, cross-org |
| `franchisor_admin` | Multi-org | Gestion franchise |
| `patron` | 1 org | Admin restaurant |
| `manager` | 1 location | Gestion site |
| `employe` | 1 location | Usage operationnel |
| `livreur` | 1 location | App livreur |
| `client` | Public | Commande en ligne |

## Stack technique

- Next.js 14 App Router + TypeScript
- Prisma ORM + PostgreSQL (Neon)
- Tailwind CSS avec CSS variables (`--brand`, `--brand-light`, `--brand-dark`)
- Vercel (2 projets: `brizo` pour brizoapp.com, `h2frites` pour 2hfrites.be)
- Auth custom HMAC-SHA256 tokens + cookie de session HttpOnly

## Convention de code

### Structure des fichiers
- `src/app/` : pages et API routes (App Router)
- `src/components/` : composants reutilisables
- `src/contexts/` : React contexts (Auth, Tenant, Cart, Location, Theme, Language)
- `src/lib/` : utilitaires serveur (auth, prisma, tenant, api)
- `src/hooks/` : custom hooks
- `src/types/` : types TypeScript
- `src/i18n/` : traductions (FR, EN, ES, NL)

### Conventions
- Composants: PascalCase, un fichier par composant
- API routes: `route.ts` avec actions via `body.action`
- Couleurs: utiliser `brand`, `brand-light`, `brand-dark` (pas `amber-500` en dur)
- Branding: toujours lire depuis `useTenant()`, jamais hardcoder "2H Frites"
- Auth: `getAuthUser(req)` lit le Bearer header OU le cookie `brizo-session`
- Deploy: `vercel deploy --prod` depuis le repertoire 2h-frites, linke au bon projet

## Regles critiques

- Ne jamais casser un tenant existant
- Toujours respecter le multi-tenant
- Aucune donnee hardcodee (noms, URLs, couleurs)
- Aucun acces global pour un tenant
- Priorite = stabilite + automatisation
- Chaque feature doit repondre a : "Est-ce que ca permet de vendre et deployer automatiquement ?"

## Securite

- Mots de passe hashes avec bcryptjs
- Cookie de session HttpOnly, Secure, SameSite=Lax
- `mustChangePassword` flag pour les comptes temporaires
- `enforceOrganization()` pour l'isolation tenant
- Pas de token dans les URLs
- Pas de mot de passe de production dans le code source

## Design

Brizo = SaaS premium :
- Fond clair (#fafbfc) pour les pages plateforme
- Fond sombre (zinc-950) pour les dashboards restaurant
- Gradient Brizo: from-[#108eff] via-[#9f32fd] to-[#fe646c]
- Typographie: font-extrabold tracking-tight pour les titres
- Espaces genereux (py-24 sections, gap-8 grids)
- Cartes blanches avec border-slate-200 shadow-sm rounded-2xl

## Deploiement

### Projet Vercel `brizo` (brizoapp.com)
- Domaines: brizoapp.com, www.brizoapp.com, *.brizoapp.com
- APP_DOMAIN=brizoapp.com
- Nameservers Vercel (ns1/ns2.vercel-dns.com)

### Projet Vercel `h2frites` (2hfrites.be)
- Domaines: 2hfrites.be, www.2hfrites.be
- C'est un CLIENT reel, ne pas modifier son branding

### Procedure de deploy
```bash
cd /Users/conceptus/Desktop/2H/assets/2h-frites

# Deploy sur brizo
cp -r .vercel .vercel-backup
npx vercel link --project brizo --scope dominus-doms-projects --yes
npx vercel deploy --prod --yes
rm -rf .vercel && mv .vercel-backup .vercel

# Deploy sur h2frites (meme code)
cd /Users/conceptus/Desktop/2H/assets
npx vercel deploy --prod --yes
```

## Priorites actuelles

1. Nettoyage traces 2H Frites sur la plateforme Brizo
2. Stripe Checkout + essai gratuit 10 jours
3. Backoffice Brizo (dashboard super admin)
4. Gestion abonnements + expiration trial
5. Email transactionnel (bienvenue, expiration)
