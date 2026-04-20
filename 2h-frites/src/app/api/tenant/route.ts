import { NextRequest, NextResponse } from 'next/server';
import { resolveOrganization, getTenantSlugFromHeaders } from '@/lib/tenant';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/tenant — Public endpoint, returns organization data from resolved tenant
export async function GET(req: NextRequest) {
  try {
    const tenantSlug = getTenantSlugFromHeaders(req.headers);
    const isPlatform = tenantSlug === '__platform__';

    // Platform landing (brizoapp.com root) — return platform info, no org needed
    if (isPlatform) {
      return NextResponse.json({
        isPlatform: true,
        name: 'BrizoApp',
        slug: '__platform__',
        branding: {
          brandName: 'BrizoApp',
          logoUrl: '/brizo-logo.svg',
          faviconUrl: '/brizo-favicon.png',
          primaryColor: '#9f32fd',
          primaryLight: '#c084fc',
          primaryDark: '#7c3aed',
        },
        modules: {},
      });
    }

    // Prefer the authenticated user's org when the hostname can't pin a tenant
    // (localhost, unknown host = __default__). Prevents the default fallback
    // from leaking another tenant's branding into a logged-in staff session.
    let org: Awaited<ReturnType<typeof resolveOrganization>> = null;
    if (tenantSlug === '__default__') {
      const auth = getAuthUser(req);
      if (auth?.organizationId) {
        org = await prisma.organization.findUnique({
          where: { id: auth.organizationId },
          select: {
            id: true, name: true, slug: true, customDomain: true,
            brandingJson: true, modulesJson: true, active: true,
            subscriptionStatus: true, trialEndsAt: true, cancelAt: true,
            onboarded: true,
          } as any,
        }) as any;
      }
    }
    if (!org) org = await resolveOrganization(req.headers);

    if (!org) {
      return NextResponse.json({ error: 'tenant_not_found' }, { status: 404 });
    }

    if (!org.active) {
      return NextResponse.json({ error: 'tenant_inactive' }, { status: 403 });
    }

    return NextResponse.json({
      isPlatform: false,
      id: org.id,
      name: org.name,
      slug: org.slug,
      branding: safeParseJson(org.brandingJson),
      modules: safeParseJson(org.modulesJson),
      subscriptionStatus: org.subscriptionStatus || 'trial',
      trialEndsAt: org.trialEndsAt?.toISOString() || null,
      cancelAt: org.cancelAt?.toISOString() || null,
      onboarded: (org as any).onboarded === true,
    });
  } catch (e: any) {
    console.error('Tenant resolution error:', e.message);
    return NextResponse.json({ error: 'tenant_resolution_failed' }, { status: 500 });
  }
}

function safeParseJson(str: string): any {
  try { return JSON.parse(str); } catch { return {}; }
}
