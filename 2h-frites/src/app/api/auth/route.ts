export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createToken, getAuthUser, buildSessionCookie, buildSessionCookieClear, SESSION_COOKIE } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';
import { env } from '@/lib/env';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function buildPublicUrl(req: NextRequest, path: string): string {
  const host = req.headers.get('host') || 'brizoapp.com';
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const protocol = forwardedProto || (isLocalhost ? 'http' : 'https');
  return `${protocol}://${host}${path}`;
}

/** Detect if the request is on *.brizoapp.com to set domain-wide cookie */
function getSessionDomain(req: NextRequest): string | undefined {
  const host = req.headers.get('host') || '';
  const appDomain = env.NEXT_PUBLIC_APP_DOMAIN || env.APP_DOMAIN;
  if (appDomain && host.endsWith(appDomain)) return `.${appDomain}`;
  return undefined;
}

/** Create response with session cookie */
function withSessionCookie(data: any, token: string, req: NextRequest): NextResponse {
  const res = NextResponse.json(data);
  const domain = getSessionDomain(req);
  res.headers.set('Set-Cookie', buildSessionCookie(token, domain));
  return res;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === 'login') {
    const { email, password } = body;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.active) return NextResponse.json({ error: 'auth_badCredentials' }, { status: 401 });

    const valid = bcryptjs.compareSync(password, user.passwordHash);
    if (!valid) return NextResponse.json({ error: 'auth_badCredentials' }, { status: 401 });

    // Temp password workflow: refuse login if the invitation window has elapsed.
    // The user can still recover by using the public "forgot password" flow.
    if (user.mustChangePassword && user.tempPasswordExpiresAt && user.tempPasswordExpiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: 'auth_tempPasswordExpired' }, { status: 401 });
    }

    const token = createToken(user.id, user.role as any, user.locationId, user.organizationId);
    const { passwordHash: _, ...safeUser } = user;
    return withSessionCookie({ token, user: safeUser }, token, req);
  }

  if (action === 'register') {
    const { email, password, name, phone } = body;
    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) return NextResponse.json({ error: 'auth_emailTaken' }, { status: 409 });

    const hash = bcryptjs.hashSync(password, 10);
    const user = await prisma.user.create({
      data: { email: email.toLowerCase(), passwordHash: hash, name, phone, role: 'client' },
    });

    const token = createToken(user.id, user.role as any, user.locationId, user.organizationId);
    const { passwordHash: _, ...safeUser } = user;
    return withSessionCookie({ token, user: safeUser }, token, req);
  }

  if (action === 'me') {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'invalid' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user || !user.active) return NextResponse.json({ error: 'not_found' }, { status: 401 });
    const { passwordHash: _, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  }

  if (action === 'updateProfile') {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { name, phone, email } = body;
    const data: any = {};
    if (name) data.name = name;
    if (phone) data.phone = phone;
    if (email) data.email = email.toLowerCase();
    await prisma.user.update({ where: { id: auth.userId }, data });
    return NextResponse.json({ ok: true });
  }

  if (action === 'changePassword') {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { oldPassword, newPassword } = body;
    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const valid = bcryptjs.compareSync(oldPassword, user.passwordHash);
    if (!valid) return NextResponse.json({ error: 'auth_badCredentials' }, { status: 401 });
    const hash = bcryptjs.hashSync(newPassword, 10);
    await prisma.user.update({ where: { id: auth.userId }, data: { passwordHash: hash } });
    return NextResponse.json({ ok: true });
  }

  if (action === 'forceChangePassword') {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { newPassword } = body;
    if (!newPassword || newPassword.length < 8) return NextResponse.json({ error: 'password_too_short' }, { status: 400 });
    const hash = bcryptjs.hashSync(newPassword, 10);
    await prisma.user.update({ where: { id: auth.userId }, data: { passwordHash: hash, mustChangePassword: false } });
    return NextResponse.json({ ok: true });
  }

  if (action === 'updateAvatar') {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { avatarUrl } = body;
    await prisma.user.update({ where: { id: auth.userId }, data: { avatarUrl: avatarUrl || null } });
    return NextResponse.json({ ok: true });
  }

  if (action === 'logout') {
    const res = NextResponse.json({ ok: true });
    const domain = getSessionDomain(req);
    res.headers.set('Set-Cookie', buildSessionCookieClear(domain));
    return res;
  }

  // ─── Password reset: request a reset email ───
  // Always returns { ok: true } to avoid leaking whether the email exists.
  // Rate-limited per email to block inbox-flood attacks on a known victim.
  if (action === 'forgotPassword') {
    const { email } = body;
    if (typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ ok: true });
    }
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user && user.active) {
      const recentCount = await prisma.passwordResetToken.count({
        where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
      });
      if (recentCount < 3) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        await prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: hashToken(rawToken),
            expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
          },
        });
        const resetUrl = buildPublicUrl(req, `/reset-password?token=${rawToken}`);
        sendPasswordResetEmail(user.email, user.name, resetUrl).catch(() => {});
      } else {
        console.warn(`[Auth] forgotPassword rate-limited for user ${user.id} (${recentCount} tokens in last hour)`);
      }
    }
    return NextResponse.json({ ok: true });
  }

  // ─── Password reset: confirm with the one-time token ───
  if (action === 'resetPasswordWithToken') {
    const { token, newPassword } = body;
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ error: 'password_too_short' }, { status: 400 });
    }
    const tokenHash = hashToken(token);
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
    }
    const hash = bcryptjs.hashSync(newPassword, 10);
    // Single transaction: rotate password, consume the token, invalidate any other
    // active reset tokens for the same user (anyone else can't still reuse them).
    const now = new Date();
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: hash, mustChangePassword: false },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: now },
      }),
      prisma.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null, id: { not: record.id } },
        data: { usedAt: now },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
