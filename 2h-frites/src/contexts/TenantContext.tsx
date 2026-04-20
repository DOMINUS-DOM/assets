'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface TenantBranding {
  primaryColor?: string;
  primaryLight?: string;
  primaryDark?: string;
  logoUrl?: string;
  faviconUrl?: string;
  heroImageUrl?: string;
  brandName?: string;
  tagline?: string;
  socialLinks?: { facebook?: string; instagram?: string; tiktok?: string };
  businessName?: string;
  vatNumber?: string;
  // Demo tenant flag — true means this tenant is used as a public product showcase.
  // Enables soft "Démo Brizo" UI affordances (header badge, conversion CTAs).
  // Safe default: undefined/false = normal tenant, no demo UI.
  isDemo?: boolean;
}

export interface TenantModules {
  kiosk?: boolean;
  delivery?: boolean;
  reservations?: boolean;
  pos?: boolean;
  kds?: boolean;
  signage?: boolean;
  crm?: boolean;
  inventory?: boolean;
  payroll?: boolean;
  analytics?: boolean;
  onlineOrdering?: boolean;
  [key: string]: boolean | undefined;
}

export interface TenantData {
  id: string;
  name: string;
  slug: string;
  branding: TenantBranding;
  modules: TenantModules;
  subscriptionStatus?: string;  // trial | active | past_due | cancelled | expired
  trialEndsAt?: string;
  cancelAt?: string | null;  // ISO date set when user scheduled a cancel-at-period-end
  onboarded?: boolean;           // false = wizard not completed yet (first login flow)
}

interface TenantContextType {
  tenant: TenantData | null;
  orgId: string | null;
  isPlatform: boolean;
  loading: boolean;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  orgId: null,
  isPlatform: false,
  loading: true,
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [isPlatform, setIsPlatform] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tenant')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setIsPlatform(data.isPlatform === true);
          if (!data.isPlatform) setTenant(data);
          else setTenant(data); // platform data for branding
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, orgId: tenant?.id || null, isPlatform, loading }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}

// True only for tenants explicitly flagged via brandingJson.isDemo.
// Gates the soft conversion CTAs shown on 2hfrites.be (the product showcase).
export function useIsDemo(): boolean {
  const { tenant } = useTenant();
  return tenant?.branding?.isDemo === true;
}

// Modules that are OFF by default for every tenant unless explicitly enabled
// via `modulesJson`. Used for beta-masking of features that aren't stable yet.
// To re-enable system-wide, remove the key here; to enable per tenant, set
// `Organization.modulesJson.<key> = true` from the super admin UI.
// (Empty today — Reservations is surfaced in the sidebar with a "Beta" badge.)
const DISABLED_BY_DEFAULT: Set<string> = new Set();

export function useModule(key: keyof TenantModules): boolean {
  const { tenant } = useTenant();
  if (!tenant) return true; // default: all enabled (except the beta-masked set)
  const explicit = tenant.modules[key];
  if (explicit === false) return false;
  if (explicit === true) return true;
  // No explicit value: beta-masked modules default to off. All others default on,
  // including during the trial boost so freshly-signed-up tenants get full access.
  if (DISABLED_BY_DEFAULT.has(key as string)) return false;
  if (tenant.subscriptionStatus === 'trial') {
    const trialEnd = tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : null;
    if (!trialEnd || trialEnd > new Date()) return true;
  }
  return true;
}

/** Returns whether the tenant has access blocked (paywall active). */
export function useTrialStatus(): { isTrial: boolean; isExpired: boolean; daysLeft: number } {
  const { tenant } = useTenant();
  if (!tenant || !tenant.subscriptionStatus) return { isTrial: false, isExpired: false, daysLeft: 0 };

  const status = tenant.subscriptionStatus;
  if (status === 'active' || status === 'past_due') return { isTrial: false, isExpired: false, daysLeft: 0 };

  const trialEnd = tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : null;
  const now = new Date();
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000)) : 0;
  // Block access for: expired trial, explicitly cancelled, or trial that silently passed its end date.
  const isExpired =
    status === 'expired' ||
    status === 'cancelled' ||
    (status === 'trial' && trialEnd !== null && trialEnd <= now);

  return { isTrial: status === 'trial', isExpired, daysLeft };
}
