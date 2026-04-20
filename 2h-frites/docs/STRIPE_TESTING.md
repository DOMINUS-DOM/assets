# Tests Stripe — stratégie locale uniquement

## Règle

- **Webhook live Stripe** → `https://brizoapp.com/api/stripe/webhook` avec `STRIPE_WEBHOOK_SECRET` live (Vercel prod).
- **Webhook test Stripe** → **pas** sur brizoapp.com. Jamais. Tests locaux exclusivement via Stripe CLI.
- Aucun mélange live/test sur le webhook prod.

**À faire une fois** (admin Stripe) : supprimer la destination webhook test pointant sur `https://brizoapp.com/api/stripe/webhook` dans le Dashboard Stripe (mode Test → Developers → Webhooks).

## Setup local

### Prérequis

```bash
brew install stripe/stripe-cli/stripe
stripe login  # autorise une fois depuis le Dashboard
```

### `.env.local` pour le dev

```env
# Clés Stripe test mode
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Price IDs test mode
STRIPE_PRICE_BASE="price_..."
STRIPE_PRICE_WEB="price_..."
STRIPE_PRICE_KIOSK="price_..."
STRIPE_PRICE_KDS="price_..."
STRIPE_PRICE_ANALYTICS="price_..."
STRIPE_PRICE_MULTIUSERS="price_..."

# Webhook secret : fourni par `stripe listen` au démarrage
STRIPE_WEBHOOK_SECRET="whsec_..."
```

## Tester le flow complet

### 1. Démarrer Next.js

```bash
npm run dev
```

### 2. Forwarder les webhooks Stripe → local

Dans un second terminal :

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copier le `whsec_...` affiché au démarrage dans `STRIPE_WEBHOOK_SECRET` du `.env.local`, puis relancer `npm run dev`.

### 3. Scénarios de test

**Souscription** :
1. Connexion en tant que tenant d'essai
2. `/admin/billing` → choisir un plan → checkout Stripe
3. Carte test `4242 4242 4242 4242`, date future, CVC `123`
4. Webhook `checkout.session.completed` reçu → org passe `active`

**Paiement renouvelé** :
```bash
stripe trigger invoice.paid
```

**Paiement échoué** :
```bash
stripe trigger invoice.payment_failed
```
→ org passe `past_due`, email envoyé

**Annulation abonnement** :
Via le Customer Portal Brizo (bouton "Ouvrir le portail" sur `/admin/billing`) → annuler côté Stripe hosted → webhook `customer.subscription.deleted` → org passe `cancelled`

## Cartes test utiles

| Scénario | Numéro |
|---|---|
| Paiement réussi | `4242 4242 4242 4242` |
| Paiement refusé | `4000 0000 0000 0002` |
| Authentification 3DS requise | `4000 0027 6000 3184` |
| Insufficient funds | `4000 0000 0000 9995` |

## Customer Portal (B5)

Configuration Dashboard Stripe (une fois) :

- Test mode → Settings → Billing → **Customer portal** → Activate
- Autoriser : **mise à jour moyen de paiement**, **téléchargement factures**, **annulation abonnement**
- **Désactiver** : changement de plan, changement d'addons (la logique reste dans Brizo pour cohérence modules ↔ abonnement)
- Retour URL : `https://brizoapp.com/admin/billing` (prod) — la même logique dynamique est déjà gérée côté API

La même configuration est à répliquer en live mode.

## Rappel architecture

- Brizo = source de vérité pour plan + addons + modules (colonnes `modulesJson`, `addons`)
- Stripe Portal ne peut **jamais** modifier ces champs directement
- Les events webhook autorisés à muter la DB : `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`
