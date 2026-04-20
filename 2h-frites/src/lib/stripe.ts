import Stripe from 'stripe';
import { env } from '@/lib/env';

// Lazy init to avoid build-time errors when STRIPE_SECRET_KEY is not set
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
    _stripe = new Stripe(key, { apiVersion: '2026-03-25.dahlia' });
  }
  return _stripe;
}

// ─── Price IDs (configured in Stripe Dashboard) ───
// No fallbacks — fail hard if env vars are missing so we catch it at deploy time
function requirePrice(key: keyof typeof env): string {
  const val = env[key];
  if (!val) throw new Error(`Missing Stripe price env var: ${String(key)}`);
  return String(val);
}

// Lazy-evaluated to avoid build-time errors
let _prices: Record<string, string> | null = null;
export function getPrices() {
  if (!_prices) {
    _prices = {
      base: requirePrice('STRIPE_PRICE_BASE'),
      web: requirePrice('STRIPE_PRICE_WEB'),
      kiosk: requirePrice('STRIPE_PRICE_KIOSK'),
      kds: requirePrice('STRIPE_PRICE_KDS'),
      analytics: requirePrice('STRIPE_PRICE_ANALYTICS'),
      multiusers: requirePrice('STRIPE_PRICE_MULTIUSERS'),
    };
  }
  return _prices;
}

// Backward compat — lazy
export const PRICES = new Proxy({} as Record<string, string>, {
  get(_, key: string) { return getPrices()[key]; },
});

export type AddonKey = 'web' | 'kiosk' | 'kds' | 'analytics' | 'multiusers';

// ─── Addon → Module mapping ───
export const ADDON_TO_MODULE: Record<AddonKey, string> = {
  web: 'onlineOrdering',
  kiosk: 'kiosk',
  kds: 'kds',
  analytics: 'analytics',
  multiusers: 'multiusers',
};

/** Build modulesJson from addon list */
export function addonsToModulesJson(addons: string[]): string {
  const modules: Record<string, boolean> = {
    pos: true, // always included in base
  };
  for (const [key, moduleKey] of Object.entries(ADDON_TO_MODULE)) {
    modules[moduleKey] = addons.includes(key);
  }
  return JSON.stringify(modules);
}
