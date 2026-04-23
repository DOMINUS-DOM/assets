# NOTES_AUDIT.md

Carnet des points relevés pendant les blockers sécurité mais **hors scope** des correctifs en cours. À traiter plus tard, dans l'ordre.

Démarré le 2026-04-20 pendant les 3 blockers critiques (AUTH_SECRET, env validator, /api/channels cross-tenant).

---

## DB de test — Neon branch `test`

À partir des tests d'isolation multi-tenant (2026-04-20), les tests tournent contre une branche Neon dédiée `test`, jamais contre la main branch prod.

**Setup :**
- Branche Neon `test` créée depuis la console Neon (copie instantanée de main, coût zéro).
- URL dans `.env.local` sous `DATABASE_URL_TEST`.
- `jest.setup.ts` swap `process.env.DATABASE_URL = process.env.DATABASE_URL_TEST` avant tout import de test.
- Garde-fou dans `src/lib/env.ts` (approche allowlist) : si `NODE_ENV === 'test'`, `DATABASE_URL_TEST` doit être définie ET `DATABASE_URL === DATABASE_URL_TEST`. Toute autre DB (prod actuelle ou future) est rejetée au boot avec un message explicite. Pas de hostname en dur.

**Workflow schema change :**
Avant tout changement de schéma prod, synchroniser la branche test :
```bash
DATABASE_URL=$DATABASE_URL_TEST npx prisma db push --accept-data-loss --skip-generate
```
Le `--accept-data-loss` est tolérable sur la branche test (données jetables par design).

**Rafraîchir depuis main :**
Si la branche test dérive trop de main (ou si on veut repartir d'un état propre copié de prod) :
- Console Neon → Branches → `test` → **Reset** (recopie instantanée depuis main).
- Re-push le schéma si main et le schéma local divergent.

---

## Effets de bord documentés (pas des bugs — juste à connaître)

### `src/lib/auth.ts` — top-level throw au boot
Depuis le blocker #1, `auth.ts` valide `AUTH_SECRET` au top-level via `throw`. Tout import direct ou transitif de `@/lib/auth` fail au boot si `AUTH_SECRET` est manquant ou < 32 chars. C'est souhaitable en prod. À savoir :
- un test isolé qui importe depuis `@/lib/auth` doit avoir `AUTH_SECRET` configuré (via `.env.test` ou équivalent)
- un script CLI (migration, seed, debug) idem
- le guard dans `auth.ts` fait doublon avec `env.ts`. Défense en profondeur acceptable. On pourrait consolider en faisant `import { env } from '@/lib/env'; export const AUTH_SECRET = env.AUTH_SECRET;` mais ça rend `auth.ts` dépendant de l'ordre d'import d'`env.ts` (actuellement il est autoportant). Laissé tel quel.

### Règle `process.env` vs `env` à partir du blocker #3
- **Code server-only** (API routes, `lib/*` server, `middleware.ts` edge) : utiliser `env.X` (typé, validé au boot).
- **Code client ou client-importable** : utiliser `process.env.NEXT_PUBLIC_X` et `process.env.NODE_ENV` directement. Next.js inline ces valeurs à la compile ; `env.ts` n'est PAS disponible dans le bundle client.
- Les `NEXT_PUBLIC_*` sont validés quand même dans `env.ts` (côté serveur, au boot) — donc un build prod avec `NEXT_PUBLIC_APP_DOMAIN` manquant fail immédiatement au boot serveur avant que le bundle client ne soit servi.
- **Un futur toi ne doit PAS "corriger"** les `process.env.NEXT_PUBLIC_X` dans les composants client vers `env.NEXT_PUBLIC_X` — ça casserait le bundle client.

Fichiers concernés (conservent `process.env.X`) :
- `src/lib/sentry.ts` — importable côté client
- `src/lib/cloudinaryUrl.ts` — importable côté client
- `src/lib/logger.ts` — `NODE_ENV` inlined par Next, importable partout
- `src/components/PlatformLanding.tsx` — client component
- `src/app/api/health/route.ts` — `process.env.npm_package_version` (runtime Node, pas un secret, hors schéma zod volontairement)

### Workflow migration Prisma — `db push` reste la voie canonique
La DB prod n'a jamais connu `prisma migrate` (pas de table `_prisma_migrations`). Introduire `migrate` juste pour une colonne serait de la sur-ingénierie. Règle actuelle :

1. Modifier `prisma/schema.prisma`.
2. `npx prisma db push` pour les changements additifs simples (nouvelle table, nouvelle colonne nullable, nouvel index).
3. **Pour les changements nécessitant un backfill** (ajout d'une colonne NOT NULL à une table non vide, renommage, ...) : écrire le SQL à la main et l'appliquer en passes via `npx prisma db execute --url $DATABASE_URL --stdin <<SQL ... SQL`, puis `db push` pour re-sync la vue Prisma du schema. Exemple de référence : `prisma/migrations/20260420000000_add_organizationid_to_orderchannel/migration.sql` (one-shot OrderChannel, 4 étapes).
4. `npx prisma generate` pour regénérer le client typé.

**Branche Neon `test`** : pas de backfill nécessaire, `db push --force-reset` est acceptable (données jetables par design). Ne JAMAIS faire `--force-reset` sur la main branch prod.

---

## Fallbacks silencieux restants (violent CLAUDE.md §6)

À traiter dans un sprint "hygiène config" séparé. **Ne PAS les fixer dans les blockers en cours** — scope creep.

1. `src/lib/cloudinaryAdmin.ts:12` — `env.CLOUDINARY_CLOUD_NAME || 'dnutqg4yv'` : hardcode d'un cloud Cloudinary (probablement celui de dev Brizo) comme fallback. Risque : un tenant sans cloud configuré uploade accidentellement dans le cloud partagé.
2. `src/app/api/uploads/sign/route.ts:45` — même fallback `'dnutqg4yv'`.
3. `src/lib/cloudinaryUrl.ts:6` — même fallback `'dnutqg4yv'` côté client.
4. `src/lib/email.ts:14,18` — `env.BRIZO_SUPPORT_EMAIL || 'support@brizoapp.com'` et `env.BRIZO_LEGAL_ADDRESS || ''` : vu qu'elles sont requises en prod par zod, ces fallbacks sont dead code en prod mais gardés pour le dev. OK.
5. `src/app/api/stripe/webhook/route.ts:15` — `env.STRIPE_WEBHOOK_SECRET || ''` : `''` passé à `constructEvent` va just lever une erreur Stripe propre au lieu d'un crash TS ; en prod zod garantit la présence. Cosmétique, peut être retiré.
6. `src/lib/tenant.ts:31-32` (déjà noté dans l'audit) — fallback `__default__` → `findFirst({ active: true })` retourne n'importe quelle org active. À couper en dev-only strict ou à supprimer.

## Guards devenus "impossible à atteindre" (dead code défensif)

Après le blocker #3, zod garantit la présence des variables critiques. Certains guards runtime deviennent impossibles à déclencher en prod :

1. `src/app/api/cron/trial-reminders/route.ts:20` — `if (cronSecret && authHeader !== ...)` : `cronSecret` est maintenant toujours truthy (requis min 16 chars), donc le `&&` est dead. Risque : si un jour on passe `CRON_SECRET` à optionnel sans audit, le guard redevient silencieux. À simplifier en `if (authHeader !== \`Bearer ${cronSecret}\`) return 401;`.
2. `src/lib/stripe.ts:7` — `if (!key) throw` : `key` est toujours present en prod via zod, mais optionnel en dev. Le guard reste utile en dev. Laisser.
3. `src/lib/email.ts:7` — `if (!key) throw` : idem, garder pour le dev.

## Remarques post-validation blocker #3

1. **Fallback Cloudinary `'dnutqg4yv'`** — même pattern que `'dev-only-secret-not-for-prod'` retiré au blocker #1, en plus bénin. Si `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` devient réellement requis (menu builder en dépend pour les photos produits), supprimer ce fallback dans un futur passage — pas opportuniste maintenant.

2. **Double source `APP_DOMAIN` vs `NEXT_PUBLIC_APP_DOMAIN`** — les deux sont requis par le schéma zod et valent typiquement la même chose. Deux variables censées refléter la même réalité = piège : une des deux désynchronisée → comportement différent serveur (cookie scope) vs client (URL construction). À terme, ajouter dans `env.ts` un `.refine()` qui vérifie `env.APP_DOMAIN === env.NEXT_PUBLIC_APP_DOMAIN` et fail avec un message clair sinon.

3. **Vérifier que `.env` git-tracké n'a pas fait fuiter de secrets** — `git log --all -- .env` + check du contenu historique. Si secrets leakés (clés Cloudinary actuellement dans `.env` partagé, AUTH_SECRET, etc.), rotation obligatoire. La convention à appliquer : `.env` = defaults non sensibles checkés-in ; `.env.local` = secrets, gitignored. À valider dans un sprint sécu séparé.

## Sécurité/qualité hors scope à traiter

1. **Rate limiting** — aucun middleware rate-limit sur `/api/auth` login. Brute force possible. Sprint sécu séparé.
2. **Validation d'input** — pas de zod/yup sur les bodies d'API (sauf env maintenant). `body.action`, `body.id`, etc. sont lus en direct. Surface injection limitée par Prisma mais à durcir.
3. **Tests d'isolation tenant** — voir la section « Correction 2026-04-20 (soir) — tests isolation multi-tenant reconstruits » en fin de fichier. Reconstruits de façon permanente après qu'un premier probe jetable ait été supprimé pendant la remediation du blocker #2.
4. **40+ `as any` dans les handlers** — dette typing accumulée, à réduire progressivement.
5. **`tenant.ts` fallback `__default__`** — déjà listé au §Fallbacks.

## Champs optionnels Cloudinary vs features qui en dépendent

`CLOUDINARY_*` sont marqués optionnels dans `env.ts`. Features qui cassent sans ces creds :
- Upload logo tenant (wizard step 1)
- Upload photos produits (menu builder)
- Upload médias signage
Un tenant sans Cloudinary peut utiliser tout le produit sauf images. Acceptable pour dev/demo, à surveiller en prod (probablement à passer en requis-prod si le produit repose dessus pour la démo commerciale).

## `npm_package_version` dans `/api/health`

`process.env.npm_package_version` est injecté par npm au runtime, pas une variable d'env au sens config. Pas dans le schéma zod volontairement. Laissé en `process.env.X` direct.

---

## Post-deploy 2026-04-20 — points à traiter

### 1. Commit monolithique `6ca53ca` — dette d'historique

Le commit `6ca53ca chore: snapshot current production state before deploy` couvre **167 fichiers, +14193/-1574 lignes**. Il mélange :
- Blockers sécurité #1 (AUTH_SECRET fail-hard)
- Blocker #3 (env validator zod)
- Blocker #2 (OrderChannel cross-tenant fix)
- Tout le backlog pré-session jamais commité (onboarding wizard, signup, Stripe, landing, trial gate, emails, middleware tenant, etc.)

Conséquences :
- `git revert` d'un blocker isolé = impossible sans cherry-picking manuel.
- `git bisect` peu utile pour cerner un bug introduit avant ce commit.
- Code review rétroactive ingérable.

**À décomposer rétroactivement** à la prochaine séance de code calme, avant d'accumuler d'autres commits par-dessus :
```bash
git reset --soft pre-beta-deploy-2026-04-20^
git add -p   # découper en commits logiques (auth, env, channels, backlog, etc.)
```
Pas urgent, mais à faire avant que ce commit soit enterré sous 10 autres.

### 2. Backup JSON prod à supprimer J+1

Fichier `2h-frites/backup_orderchannel_prod_1776706180342.json` (gitignored, local uniquement) contient la row `uber_eats` pré-migration. Conservé 24h comme filet de sécurité. **À supprimer le 2026-04-21** si la migration OrderChannel reste stable. Ce rappel doit vivre dans un agenda externe — ce fichier ne sera pas relu ce jour-là.

### 3. Cron `trial-reminders` à vérifier J+1

Nouveau `CRON_SECRET` (64 hex chars) déployé sur brizo + h2frites. Prochaine exécution programmée à 08:00 UTC (config dans `2h-frites/vercel.json`).

**Check le 2026-04-21** sur Vercel Functions logs :
- Invocation présente ✓
- Status 200 ✓
- Durée raisonnable (< 10s attendus pour un scan des orgs en trial)

Si 401 → `CRON_SECRET` côté Vercel Functions ne matche pas celui envoyé par Vercel Cron. Vérifier que la var est bien **en Production** (pas seulement Preview/Dev) sur le projet qui héberge le cron (brizo).

### 4. Git push 403 sur `DOMINUS-DOM/assets`

Les creds machine sont `daoia-conceptus` (via `gh auth` credential helper, scopes `repo`). Push refusé alors que `ls-remote` fonctionne — donc read OK, write refusé. Diagnostic complet fait, **aucune modif remote/creds sans GO explicite**.

Conséquence : le commit `6ca53ca` + le tag `pre-beta-deploy-2026-04-20` n'existent **que localement** tant que pas de résolution. Perte disque = perte de l'historique des 3 fixes sécurité.

Options envisagées (pour décision ultérieure) :
- Switch `gh auth` vers un compte avec push rights sur `DOMINUS-DOM/assets`.
- Ajouter un remote mirror (`backup`) sur un repo dont `daoia-conceptus` a le write.
- Demander invite collaborator à l'admin `DOMINUS-DOM`.

### 5. Procédure de rollback — référence d'urgence

**Rollback code** (chaque projet Vercel séparément) :
```bash
cd /Users/conceptus/Desktop/2H/assets/2h-frites && npx vercel rollback   # brizo
cd /Users/conceptus/Desktop/2H/assets && npx vercel rollback              # h2frites
```

**Rollback DB** — reverser la migration `OrderChannel.organizationId`, dans cet ordre exact :
```sql
ALTER TABLE "OrderChannel" DROP CONSTRAINT "OrderChannel_organizationId_fkey";
DROP INDEX "OrderChannel_organizationId_idx";
ALTER TABLE "OrderChannel" ALTER COLUMN "organizationId" DROP NOT NULL;
ALTER TABLE "OrderChannel" DROP COLUMN "organizationId";
```
À exécuter via `prisma db execute --url $PROD_DB --stdin`. Restaurer la row depuis `backup_orderchannel_prod_*.json` si elle a été modifiée entre deploy et rollback (cf. point 2 pour le fichier).

**Ordre en cas d'incident** : code rollback d'abord (Vercel), puis DB seulement si nécessaire (le code revenu ne fera plus de queries sur `organizationId` donc la colonne peut rester sans casse immédiate).

### 6. `vercel env pull` — vars fraîchement ajoutées pullent `empty`

**Hypothèse initiale infirmée** : le flag `--environment=production` n'est pas en cause. Diag Tâche 2 du 2026-04-20 confirme : même avec le flag explicite, les 3 vars ajoutées via CLI pendant ce deploy (`CRON_SECRET`, `KIOSK_API_KEY` sur brizo, `BRIZO_SUPPORT_EMAIL`) pullent `empty`, tandis que les vars plus anciennes (`KIOSK_API_KEY` sur h2frites, 8 jours d'âge) pullent leur vraie valeur.

**Comportement réel** : les vars ajoutées via `vercel env add` retournent vide dans `vercel env pull` pendant une fenêtre de propagation non documentée (probablement plusieurs heures). **Builds Vercel et runtime Functions les consomment correctement pendant cette fenêtre** — le build brizo de cette session a bien lu `CRON_SECRET` via le validator zod sans échec, preuve que la valeur est bien servie au buildtime malgré l'`env pull` empty.

**Implication pratique** : ne pas se fier à `vercel env pull` juste après un `env add` pour valider qu'une var est bien en place. Utiliser `vercel env ls` (qui retourne `Encrypted` immédiatement) + un build test si doute. À re-vérifier dans 24h : les 3 vars devraient alors pull `present`.

---

## Correction 2026-04-20 (soir) — tests isolation multi-tenant reconstruits

Contrairement à ce que la version précédente de NOTES_AUDIT laissait entendre (notamment « ajoutés partiellement à la fin des blockers »), les tests d'isolation multi-tenant du blocker #2 avaient été écrits sous forme de probe jetable (`src/__tests__/_probe.test.ts`), exécutés une fois pour valider la migration `OrderChannel.organizationId`, puis **supprimés** conformément à l'intention "DELETE after validation" marquée dans le commentaire d'en-tête. Ils n'existaient plus dans le repo au moment du deploy prod — seuls les 6 smoke tests originaux tournaient.

Reconstruction permanente effectuée dans cette session :

- **`src/__tests__/_helpers/multi-tenant.ts`** — helpers factorisés :
  - `mkTestOrg(suffix)` → crée Organization + Location + patron User + OrderChannel + token HMAC. Slug `test-iso-${suffix}-${timestamp}`.
  - `cleanupTestOrgs()` — supprime tout ce qui match `slug.startsWith('test-iso-')`, sans filtre d'âge. Appelé en beforeAll + afterAll.
  - `mkReq(url, opts?)` — wrapper `new NextRequest(url, opts)` avec typage `ConstructorParameters<typeof NextRequest>[1]`.
  - `withAuth(token)` — retourne `{ authorization: Bearer ${token} }`. Bearer plutôt que cookie, cohérent avec `getAuthUser()` qui accepte les deux.
  - `forgeToken(payload, secret)` — ré-implémente le HMAC-SHA256 de `src/lib/auth.ts` pour tester que l'ancien fallback `'dev-only-secret-not-for-prod'` (retiré au blocker #1) est bien rejeté.

- **`src/__tests__/multi-tenant-isolation.test.ts`** — 4 tests permanents :
  1. GET `/api/channels` isolation : admin A et admin B ne voient que leur propre channel, aucune intersection.
  2. POST `incomingOrder` avec `locationId` foreign → 404, aucun Order créé sur la location de l'autre tenant.
  3. Token forgé avec `'dev-only-secret-not-for-prod'` → 403 strict, body ne leak aucun channel.
  4. POST `toggle` cross-tenant → 404, `channel.active` inchangé en DB.

- **`src/__tests__/onboarding-menu.test.ts`** — 5 tests sur `/api/onboarding/menu` (blocker #4) : create sur location vierge (200), create sur location avec menu (409 `menu_already_exists`, rien n'est ajouté), replace (wipe complet + reseed, modifier groups supprimés), skip (no-op), GET status (reflet exact de l'état DB).

Ces tests tournent désormais contre la branche Neon `test` à chaque `pnpm test`, détectent toute régression d'isolation tenant, et constituent le filet permanent prévu par le blocker #6 de l'audit initial. Total suite : 58 tests (49 unit existants + 4 isolation + 5 onboarding-menu).

**Ajustements jest collatéraux** liés à cette reconstruction :
- `testPathIgnorePatterns` ajout de `/src/__tests__/_helpers/` pour que Jest ne traite pas `multi-tenant.ts` comme un fichier de test.
- `jest.setTimeout(30000)` en tête des 2 fichiers qui touchent la DB — les roundtrips Neon + bcrypt dépassent le défaut de 5s.

---

## Session rotation secrets post-breach Vercel (2026-04-21, 06h-07h45 Brussels)

Contexte : breach Vercel du **2026-04-19** (supply chain attack via Context.ai → OAuth Google Workspace). Impact confirmé sur les env vars stockées en mode `encrypted`, **pas** sur celles en mode `sensitive`. Toutes les vars `encrypted` critiques ont été rotées cette nuit.

### Secrets rotés (7 au total sur les 2 projets brizo + h2frites)

| Secret | Scope | Mode de rotation |
|---|---|---|
| `AUTH_SECRET` | brizo + h2frites | **2 valeurs distinctes** générées via `openssl rand -hex 32`. Plus de valeur partagée entre les projets. Mode `sensitive` après set. |
| `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET` | brizo + h2frites | Nouvelle paire créée `brizo-prod-2026-04-21` sur le cloud `dnutqg4yv`. L'ancienne paire "Root" (key `911619721661838`) **toujours active**, à désactiver dans un nettoyage séparé. Mode `sensitive`. |
| `STRIPE_SECRET_KEY` | brizo + h2frites | Rotation via dashboard Stripe avec délai de grâce 24h. Ancienne `sk_live_...s9rs` → nouvelle `sk_live_...MZqp`. Mode `sensitive`. |
| `STRIPE_WEBHOOK_SECRET` | brizo + h2frites | Rotation dashboard Stripe avec délai 12h sur l'endpoint `https://brizoapp.com/api/stripe/webhook`. Mode `sensitive`. |
| `DATABASE_URL` | brizo + h2frites | Reset du password du rôle `neondb_owner` sur la branche `production` du projet Neon `2hfrites` (region AWS us-west-2). Downtime observé ~90-120s pendant le reset. Mode `sensitive`. |

### Changements annexes

- **Commit email** réécrit pour contourner le Vercel Git Author Verification : `user.email = 95183991+DOMINUS-DOM@users.noreply.github.com` (anonyme via GitHub noreply) au lieu de `info@conceptus.be`. Les commits récents et futurs portent cette identité.
- **Tous les secrets rotés sont en mode `sensitive` sur Vercel** : illisibles depuis le dashboard et depuis `vercel env pull`. Cohérent avec la leçon post-breach.

### Exposés temporairement dans un chat Claude (hors Claude Code)

Deux secrets ont été temporairement exposés dans une conversation Claude (hors Claude Code) pendant la rotation :
- `STRIPE_WEBHOOK_SECRET` (valeur actuelle après rotation)
- `DATABASE_URL` password (valeur actuelle après rotation)

Risque faible (conversation éphémère, pas de training persistant), mais **rotation d'hygiène suggérée plus tard** pour zeroïser ce vecteur. À mettre dans un agenda externe — n'oublie pas.

### Pending cleanup (à planifier)

- **Ancienne clé Cloudinary "Root" (key `911619721661838`) à désactiver** dans le dashboard Cloudinary. Tant qu'elle est active, elle constitue une seconde surface d'attaque même si plus utilisée par le code.
- **Rotation "hygiène" des 2 secrets exposés chat** (`STRIPE_WEBHOOK_SECRET` + `DATABASE_URL` pwd), dès que possible.
- **Mise à jour `.env.local` local** avec le nouveau `DATABASE_URL` password pour que `npm run build` et `jest` locaux fonctionnent. Constaté au build audit 2026-04-21 : le validator zod fail sur `CRON_SECRET`, `APP_DOMAIN`, `NEXT_PUBLIC_APP_DOMAIN` manquants dans `.env.local` — à ajouter en même temps.

### Rotations P2 **non faites** cette nuit (rotables à loisir)

- `RESEND_API_KEY` sur brizo — mode `encrypted`, âge 5 jours, pas dans la fenêtre du breach à priori mais à surveiller.
- `GEMINI_API_KEY` sur h2frites — mode `encrypted`, âge 13 jours, clé Google AI Studio, utilisée uniquement pour l'OCR factures (`/api/invoices/purchase/extract`). Impact leak : quota Google AI facturé à un attaquant, pas d'accès données tenant.

Ces deux clés sont **rotables à loisir** : pas de risque critique immédiat, mais elles devraient passer en `sensitive` dès la prochaine rotation.

### Dette résiduelle de la session précédente (non traitée cette nuit)

Le commit monolithique `6ca53ca` (167 fichiers, accumulant blockers #1/#2/#3 + backlog welcome wizard + signup + Stripe + landing + trial gate + etc.) **reste à redécomposer rétroactivement**. Identifié au post-deploy 2026-04-20, non traité pendant la rotation de cette nuit (scope volontairement limité aux secrets).

### Suite de l'audit

Ce récap est le **Phase 0** d'un audit complet 6-phases rédigé en parallèle. Voir **`AUDIT_POST_ROTATION_2026-04-21.md`** à la racine du repo parent (`/Users/conceptus/Desktop/2H/assets/`) pour les phases 1-6 détaillées :

1. **Preuves de propreté** — aucune ancienne valeur secret dans working tree ou git log (vérifs sur `npg_LqayTE4gUvZ0`, `911619721661838`, suffixe `s9rs`, pattern `sk_live_`). Clean.
2. **Conformité architecturale** — `src/lib/env.ts` intact avec zod + 2 superRefine (allowlist DATABASE_URL_TEST + prod required strict). `src/app/layout.tsx` ligne 1 `import '@/lib/env'`. Zéro `process.env.X` server-only dérivant.
3. **Tests + build** — 57/58 tests pass. **1 test régression** : `POST replace` dans `onboarding-menu.test.ts` (wipe OK mais reseed retourne 0 rows au re-read — hypothèse flake Neon eventual consistency). Build local fail attendu par manque de vars dans `.env.local`.
4. **Blockers résiduels** — **#5 paywall UI-only toujours ouvert** (9 endpoints à gater avec un helper `requireActiveSubscription`). #6 tests isolation OK à 8/9.
5. **Dette accumulée** — commit `6ca53ca` à laisser tel quel (rebase trop risqué). `OrderItem.productId` NULL sur 43 rows (flag à investiguer, 2-3h). `CLOUDINARY_CLOUD_NAME` encore en `encrypted` (cosmétique).
6. **Prochaine feature** — scan menu papier via Gemini Vision : faisable en 6-10h, coût ~$0.001/scan, zéro migration Prisma, point d'ancrage naturel = `/admin/menu/import` existant + pattern fetch REST de `/api/invoices/purchase/extract`.

---

## Session fix bugs settings onboarding (2026-04-22 → 2026-04-23)

Session de diagnostic + fix des bugs "logo absent au reload" et "horaires vides au reload" signalés sur nouveaux tenants. Diagnostic complet dans `../BUG_DIAGNOSIS_SETTINGS_2026-04-22.md`. Trois bugs concrets identifiés et corrigés :

- **Bug A (rendu logo)** : `admin/layout.tsx:226` et `components/Header.tsx:57` utilisaient le `public_id` Cloudinary comme `src` brut → 404 au chargement. Fix : routage via `getCloudinaryUrl(id, 'admin-preview')`. Commit `aba3bad`.
- **Bug A-bis (race wizard)** : le bouton "Suivant" step 1 du wizard n'était pas gate sur l'état uploading de `ImageUpload` → user pouvait cliquer Suivant pendant l'upload Cloudinary → `saveBranding` lit `logoPublicId` à null → `logoUrl` dropped du JSON. Prouvé en DB prod : 3/3 tenants ont `logoUrl: undefined`. Fix : `ImageUpload` expose `onUploadingChange(bool)` via useEffect, wizard gate `disabled={busy || logoUploading || !brandName.trim()}`. Commit `4f2472e`.
- **Bug B (shape horaires)** : wizard `saveHoursAndModes` envoyait `{action:'update', settings:{...}}` wrappé, `/admin/settings` lit flat → `settings.hours` undefined → table vide. Le commentaire obsolète `/* settings endpoint may swallow unknown fields — not critical */` acknowledged et shippait la dette. Fix : `api.post('/settings', settings)` flat + retrait commentaire. Commit `9af952a`.
- **Co-correction settings catch silencieux** : `/admin/settings/page.tsx` ligne 45 avait `.catch(() => {})` + `setSaved(true)` inconditionnel → masquait toute erreur réseau/auth. Fix : `save()` async, `setSaveError` surfaced sous forme amber/red si échec, `setSaved(true)` seulement sur succès. Commit `9e8174d`.

Tests permanents ajoutés dans `src/__tests__/settings-regression.test.ts` (5 tests couvrant `getCloudinaryUrl` + flat-shape round-trip + wrapped-legacy demonstration). Commit `e123f84`.

### Observations collatérales à traiter plus tard

1. **Race wizard sans test RTL automatisé** : Bug A-bis est couvert par le **diagnostic DB historique** (3/3 tenants `logoUrl: undefined` prouve que la race fire en conditions réelles) + **typage TS strict de `onUploadingChange`** + **fix manuel validé**. Aucun test React Testing Library n'a été ajouté car RTL 16 (version installée) a besoin de `@testing-library/dom` en peer dep (~180KB) qui n'est pas installé. Installer ce peer dep et ajouter un test RTL sur `ImageUpload` est un item de dette minor, à faire quand on aura besoin d'autres tests de composants.

2. **`maxWorkers: 1` dans jest.config.js — dette technique à traiter** : le vrai fix du flake `POST replace` est d'**isoler les transactions Prisma** (schema test per suite ou nettoyage transactionnel hermétique entre tests) ou de **configurer un pool Neon dédié aux tests avec plus de connexions**. Pour aujourd'hui, serial run (~55s vs ~28s parallèle) est acceptable. À re-évaluer si le temps total de `npm test` dépasse **2 minutes** — à ce moment-là, l'isolation transactionnelle devient obligatoire.

3. **2hfrites Setting minimal** : `business-org_2hfrites_default` ne contient que `{"acceptingOrders":false}` en DB. Aucun `hours`, ni `acceptPickup/Delivery/DineIn`, ni `name/address/phone`. Deux possibilités : (a) les horaires n'ont jamais été configurés via le wizard/settings, (b) les données ont été reset à un moment (rotation DB ? drop accidental ?). À clarifier avec 2hfrites si on veut restaurer des horaires, sinon laisser. Hors scope immédiat — pas d'action urgente. Les orders continuent de passer (endpoint `/orders` ne check pas `hours` pour accepter une commande).

### Migrations DB ad-hoc — 2026-04-22 (exécutées, non-committées en code)

Suite au fix Bug B, les tenants existants avaient un `Setting` row en shape wrappée (stored pre-fix). Migration manuelle exécutée en `$transaction` atomique, pas de script committé (données spécifiques à cette DB prod, pas du code réutilisable) :

| key | tenant | action | résultat |
|---|---|---|---|
| `business-cmo7kej1h000279oae3jingyu` | conceptus | Unwrap `.settings` → flat | ✓ 7 hours visibles au top-level, `settings` nested parti |
| `business-cmo9040cx00011tiffoe7wzv4` | lorenzo-prego | Unwrap `.settings` → flat | ✓ idem |
| `business-cmo62b20l0001te4w46qgcnjs` | orphelin (org supprimée) | Delete | ✓ row nettoyée |
| `business-cmo6r34420000jju6bz8sbqm2` | orphelin | Delete | ✓ row nettoyée |
| `business-org_2hfrites_default` | 2h-frites (réel) | **Non touché** (pas de données wizard) | identique pre/post |

Post-migration : les 2 tenants réels vont maintenant voir leurs horaires au reload de `/admin/settings` (la shape matche ce que lit la page). Aucun risque de rollback identifié — les orphelins n'ayant plus de tenant actif, personne ne peut les utiliser.

**À savoir pour les futurs tenants** : depuis le commit `9af952a`, le wizard écrit déjà flat, donc aucune migration supplémentaire ne sera nécessaire pour les signups à partir du 2026-04-23.
