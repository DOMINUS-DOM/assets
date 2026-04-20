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
3. **Tests d'isolation tenant** — 6 fichiers smoke tests existants, zéro test cross-tenant. Ajoutés partiellement à la fin des blockers.
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
