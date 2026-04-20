import '@/lib/env'; // must be first — validates env at boot, throws if invalid
import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import Providers from '@/components/Providers';
import ErrorBoundary from '@/components/ErrorBoundary';

export async function generateMetadata(): Promise<Metadata> {
  const hdrs = headers();
  const tenantSlug = hdrs.get('x-tenant-slug');
  const isPlatform = tenantSlug === '__platform__';

  if (isPlatform) {
    return {
      title: 'BrizoApp — Plateforme SaaS pour restaurants',
      description: 'Caisse, commande en ligne, kiosk, KDS, analytics. Tout ce dont votre restaurant a besoin.',
      icons: { icon: '/brizo-favicon.png', apple: '/brizo-apple-touch-icon.png' },
      openGraph: { title: 'BrizoApp', description: 'La plateforme tout-en-un pour votre restaurant.', type: 'website', siteName: 'BrizoApp' },
      robots: { index: true, follow: true },
    };
  }

  // Tenant or default — resolve org name + favicon from DB.
  // Fallback is the neutral Brizo favicon (NOT the legacy 2H one) so unbranded
  // tenants don't leak 2H Frites imagery into the browser tab.
  let orgName = 'Restaurant';
  let iconUrl = '/brizo-favicon.png';
  try {
    const { resolveOrganization } = await import('@/lib/tenant');
    let org: any = null;
    // When hostname is unknown (__default__, localhost), prefer the logged-in
    // user's org — same guarantee applied to /api/tenant.
    if (tenantSlug === '__default__') {
      const { cookies } = await import('next/headers');
      const { verifyToken, SESSION_COOKIE } = await import('@/lib/auth');
      const sessionCookie = cookies().get(SESSION_COOKIE)?.value;
      const payload = sessionCookie ? verifyToken(sessionCookie) : null;
      if (payload?.organizationId) {
        const { prisma } = await import('@/lib/prisma');
        org = await prisma.organization.findUnique({ where: { id: payload.organizationId }, select: { name: true, brandingJson: true } });
      }
    }
    if (!org) org = await resolveOrganization(hdrs);
    if (org?.name) orgName = org.name;
    if (org?.brandingJson) {
      try {
        const b = JSON.parse(org.brandingJson);
        if (b?.faviconUrl) iconUrl = b.faviconUrl;
        else if (b?.logoUrl) iconUrl = b.logoUrl;
      } catch { /* noop */ }
    }
  } catch {}

  return {
    title: orgName,
    description: `${orgName} — Menu et commande en ligne`,
    manifest: '/manifest.json',
    icons: { icon: iconUrl, apple: iconUrl },
    openGraph: { title: orgName, type: 'website', siteName: orgName },
    robots: { index: true, follow: true },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const hdrs = headers();
  const tenantSlug = hdrs.get('x-tenant-slug');
  const isPlatform = tenantSlug === '__platform__';

  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    viewportFit: 'cover',
    themeColor: isPlatform ? '#F5F3EF' : '#09090b',
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const hdrs = headers();
  const tenantSlug = hdrs.get('x-tenant-slug');
  const isPlatform = tenantSlug === '__platform__';

  // Customer-facing (tenant storefront) is now light by default. Internal
  // routes (admin / pos / kiosk / driver / display) apply their own dark
  // theme on their root wrapper, which keeps Tailwind dark: utilities working.
  const bodyBg = isPlatform ? 'bg-[#F5F3EF]' : 'bg-[#FAFAF8]';
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`font-sans transition-colors text-[#1A1A1A] ${bodyBg}`}>
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
