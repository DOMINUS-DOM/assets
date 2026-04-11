import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// ─── Types ───
export type UserRole = 'franchisor_admin' | 'franchisee_owner' | 'location_manager' | 'patron' | 'manager' | 'employe' | 'livreur' | 'client';

export interface TokenPayload {
  userId: string;
  role: UserRole;
  locationId?: string | null;
  exp: number;
}

export const ADMIN_ROLES: UserRole[] = ['patron', 'manager', 'franchisor_admin', 'location_manager'];

// ─── Helpers ───
function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
      console.warn('WARNING: AUTH_SECRET not set — using fallback. Set AUTH_SECRET in production!');
    }
    return 'dev-only-secret-not-for-prod';
  }
  return secret;
}

function toBase64url(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function fromBase64url(b64: string): string {
  return Buffer.from(b64, 'base64url').toString();
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

// ─── Token Creation ───
export function createToken(userId: string, role: UserRole, locationId?: string | null): string {
  const payload = toBase64url(JSON.stringify({
    userId,
    role,
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

// ─── Request Auth Helpers ───
export function getAuthUser(req: NextRequest): TokenPayload | null {
  const header = req.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) return null;
  return verifyToken(header.slice(7));
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

/** Returns 401 JSON response if not authenticated */
export function unauthorized() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

/** Returns 403 JSON response if not authorized */
export function forbidden() {
  return NextResponse.json({ error: 'forbidden' }, { status: 403 });
}
