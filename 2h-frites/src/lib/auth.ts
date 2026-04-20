import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// ─── Types ───
export type UserRole = 'platform_super_admin' | 'franchisor_admin' | 'franchisee_owner' | 'location_manager' | 'patron' | 'manager' | 'employe' | 'livreur' | 'client';

export interface TokenPayload {
  userId: string;
  role: UserRole;
  organizationId?: string | null;
  locationId?: string | null;
  exp: number;
}

export const ADMIN_ROLES: UserRole[] = ['platform_super_admin', 'patron', 'manager', 'franchisor_admin', 'location_manager'];

// ─── Auth Secret (fail-hard on boot) ───
const rawAuthSecret = process.env.AUTH_SECRET;
if (!rawAuthSecret) {
  throw new Error('AUTH_SECRET is required. Generate: openssl rand -hex 32');
}
if (rawAuthSecret.length < 32) {
  throw new Error('AUTH_SECRET must be at least 32 characters');
}
export const AUTH_SECRET: string = rawAuthSecret;

// ─── Helpers ───
function toBase64url(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function fromBase64url(b64: string): string {
  return Buffer.from(b64, 'base64url').toString();
}

function sign(payload: string): string {
  return createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
}

// ─── Token Creation ───
export function createToken(userId: string, role: UserRole, locationId?: string | null, organizationId?: string | null): string {
  const payload = toBase64url(JSON.stringify({
    userId,
    role,
    organizationId: organizationId || null,
    locationId: locationId || null,
    exp: Date.now() + 86400000, // 24h
  }));
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

// ─── Token Verification ───
export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payload, sig] = parts;

    // Verify signature (timing-safe)
    const expected = sign(payload);
    const sigBuf = Buffer.from(sig, 'base64url');
    const expectedBuf = Buffer.from(expected, 'base64url');
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    // Decode and check expiry
    const data: TokenPayload = JSON.parse(fromBase64url(payload));
    if (data.exp < Date.now()) return null;

    return data;
  } catch {
    return null;
  }
}

// ─── Session Cookie Config ───
export const SESSION_COOKIE = 'brizo-session';
export const SESSION_MAX_AGE = 86400; // 24h

/** Build Set-Cookie header for session token */
export function buildSessionCookie(token: string, domain?: string): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${SESSION_MAX_AGE}`,
  ];
  if (domain) parts.push(`Domain=${domain}`);
  return parts.join('; ');
}

/** Build cookie deletion header */
export function buildSessionCookieClear(domain?: string): string {
  const parts = [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (domain) parts.push(`Domain=${domain}`);
  return parts.join('; ');
}

// ─── Request Auth Helpers ───
export function getAuthUser(req: NextRequest): TokenPayload | null {
  // 1. Bearer header (API clients, legacy)
  const header = req.headers.get('authorization');
  if (header && header.startsWith('Bearer ')) {
    return verifyToken(header.slice(7));
  }
  // 2. Session cookie (browser, cross-subdomain)
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (cookie) {
    return verifyToken(cookie);
  }
  return null;
}

/** Get auth from Bearer header OR ?token= query param (for SSE/EventSource) */
export function getAuthUserOrQuery(req: NextRequest): TokenPayload | null {
  const fromHeader = getAuthUser(req);
  if (fromHeader) return fromHeader;
  const tokenParam = req.nextUrl.searchParams.get('token');
  if (tokenParam) return verifyToken(tokenParam);
  return null;
}

/** Enforce multi-site isolation. Returns the allowed locationId or null. */
export function enforceLocation(auth: TokenPayload, requestedLocationId: string | null): string | null {
  // Franchisor admin can access any site
  if (auth.role === 'franchisor_admin') return requestedLocationId;
  // User bound to a location can only access their own
  if (auth.locationId) return auth.locationId;
  // No location restriction (e.g. patron without locationId)
  return requestedLocationId;
}

/** Enforce tenant isolation. Returns the allowed organizationId or null.
 *  Platform admins (franchisor_admin without org) can access any org. */
export function enforceOrganization(auth: TokenPayload, requestedOrgId: string | null): string | null {
  // Platform super-admin can access any org
  if (auth.role === 'platform_super_admin') return requestedOrgId;
  if (auth.role === 'franchisor_admin' && !auth.organizationId) return requestedOrgId;
  // User bound to an org can only access their own
  if (auth.organizationId) return auth.organizationId;
  // Fallback
  return requestedOrgId;
}

// ─── Tenant Isolation Helpers ───

import { prisma } from './prisma';

/**
 * Get the authenticated user's organizationId. Rejects if not authenticated or no org bound.
 * platform_super_admin can optionally specify an orgId via query param.
 */
export function getRequiredOrgId(req: NextRequest): { auth: TokenPayload; orgId: string } | null {
  const auth = getAuthUser(req);
  if (!auth) return null;
  if (auth.role === 'platform_super_admin') {
    const reqOrg = req.nextUrl.searchParams.get('organizationId');
    return { auth, orgId: reqOrg || '' }; // empty string = cross-org access
  }
  if (!auth.organizationId) return null;
  return { auth, orgId: auth.organizationId };
}

/**
 * Get all locationIds belonging to an organization.
 */
export async function getLocationIdsForOrg(orgId: string): Promise<string[]> {
  if (!orgId) return [];
  const locs = await prisma.location.findMany({
    where: { organizationId: orgId },
    select: { id: true },
  });
  return locs.map((l) => l.id);
}

/**
 * Resolve organizationId from the tenant slug header (for public/unauthenticated requests).
 */
export async function resolveOrgFromRequest(req: NextRequest): Promise<string | null> {
  const slug = req.headers.get('x-tenant-slug');
  const domain = req.headers.get('x-tenant-domain');
  if (slug && slug !== '__platform__' && slug !== '__default__') {
    const org = await prisma.organization.findUnique({ where: { slug }, select: { id: true } });
    return org?.id || null;
  }
  if (domain) {
    const org = await prisma.organization.findFirst({ where: { customDomain: domain }, select: { id: true } });
    return org?.id || null;
  }
  return null;
}

/** Returns 401 JSON response if not authenticated */
export function unauthorized() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

/** Returns 403 JSON response if not authorized */
export function forbidden() {
  return NextResponse.json({ error: 'forbidden' }, { status: 403 });
}
