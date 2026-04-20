import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { env } from '@/lib/env';

/**
 * Tenant Resolution Middleware
 *
 * Extracts the organization slug or custom domain from the request hostname
 * and passes it downstream via request headers.
 *
 * Patterns:
 *   slug.APP_DOMAIN       → x-tenant-slug = slug
 *   custom-domain.com     → x-tenant-domain = custom-domain.com
 *   APP_DOMAIN (bare)     → x-tenant-slug = __platform__ (landing page)
 *   localhost / no domain  → x-tenant-slug = __default__ (dev fallback)
 */

export function middleware(request: NextRequest) {
  const APP_DOMAIN = env.NEXT_PUBLIC_APP_DOMAIN || env.APP_DOMAIN;
  const hostname = request.headers.get('host') || '';
  const hostWithoutPort = hostname.split(':')[0];

  const requestHeaders = new Headers(request.headers);

  // Dev: localhost or 127.0.0.1 → default org
  if (hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1') {
    requestHeaders.set('x-tenant-slug', '__default__');
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // If APP_DOMAIN is not configured, everything falls back to default
  if (!APP_DOMAIN) {
    requestHeaders.set('x-tenant-slug', '__default__');
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Exact match: APP_DOMAIN or www.APP_DOMAIN → platform landing
  if (hostWithoutPort === APP_DOMAIN || hostWithoutPort === `www.${APP_DOMAIN}`) {
    requestHeaders.set('x-tenant-slug', '__platform__');
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Subdomain: slug.APP_DOMAIN → tenant slug
  if (hostWithoutPort.endsWith(`.${APP_DOMAIN}`)) {
    const slug = hostWithoutPort.replace(`.${APP_DOMAIN}`, '');
    if (slug && !slug.includes('.')) {
      requestHeaders.set('x-tenant-slug', slug);
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
  }

  // Custom domain: anything else → pass as domain for DB lookup
  requestHeaders.set('x-tenant-domain', hostWithoutPort);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|.*\\.(?:png|jpg|jpeg|svg|ico|webp|woff2?|ttf|json|txt|xml|webmanifest)).*)',
  ],
};
