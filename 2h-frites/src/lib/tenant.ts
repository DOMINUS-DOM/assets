import { prisma } from './prisma';

export interface TenantOrganization {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  brandingJson: string;
  modulesJson: string;
  active: boolean;
  subscriptionStatus: string;
  trialEndsAt: Date | null;
  cancelAt: Date | null;
  onboarded: boolean;
}

const ORG_SELECT = {
  id: true, name: true, slug: true, customDomain: true,
  brandingJson: true, modulesJson: true, active: true,
  subscriptionStatus: true, trialEndsAt: true, cancelAt: true,
  onboarded: true,
};

// ─── Resolve org from request headers (set by middleware) ───

export async function resolveOrganization(headers: Headers): Promise<TenantOrganization | null> {
  const slug = headers.get('x-tenant-slug');
  const domain = headers.get('x-tenant-domain');

  // Default fallback: return the first active org
  if (slug === '__default__' || slug === '__platform__') {
    return prisma.organization.findFirst({ where: { active: true }, select: ORG_SELECT });
  }

  // Resolve by slug
  if (slug) {
    return prisma.organization.findUnique({ where: { slug }, select: ORG_SELECT });
  }

  // Resolve by custom domain
  if (domain) {
    return prisma.organization.findUnique({ where: { customDomain: domain }, select: ORG_SELECT });
  }

  return null;
}

// ─── Extract org slug from headers (no DB query, for client-side forwarding) ───

export function getTenantSlugFromHeaders(headers: Headers): string | null {
  return headers.get('x-tenant-slug') || null;
}
