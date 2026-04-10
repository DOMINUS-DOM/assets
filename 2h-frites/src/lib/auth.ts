import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// ─── Types ───
export type UserRole = 'franchisor_admin' | 'franchisee_owner' | 'location_manager' | 'patron' | 'manager' | 'employe' | 'livreur' | 'client';

export interface TokenPayload {
  userId: string;
  role: UserRole;
  exp: number;
}

export const ADMIN_ROLES: UserRole[] = ['patron', 'manager', 'franchisor_admin', 'location_manager'];

// ─── Helpers ───
const SECRET = process.env.AUTH_SECRET || 'fallback-dev-secret-change-me';

function toBase64url(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function fromBase64url(b64: string): string {
  return Buffer.from(b64, 'base64url').toString();
}

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('base64url');
}

// ─── Token Creation ───
export function createToken(userId: string, role: UserRole): string {
  const payload = toBase64url(JSON.stringify({
    userId,
    role,
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

/** Returns 401 JSON response if not authenticated */
export function unauthorized() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

/** Returns 403 JSON response if not authorized */
export function forbidden() {
  return NextResponse.json({ error: 'forbidden' }, { status: 403 });
}
