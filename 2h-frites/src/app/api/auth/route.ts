export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createToken, getAuthUser } from '@/lib/auth';
import bcryptjs from 'bcryptjs';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === 'login') {
    const { email, password } = body;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.active) return NextResponse.json({ error: 'auth_badCredentials' }, { status: 401 });

    const valid = bcryptjs.compareSync(password, user.passwordHash);
    if (!valid) return NextResponse.json({ error: 'auth_badCredentials' }, { status: 401 });

    const token = createToken(user.id, user.role as any, user.locationId);
    const { passwordHash: _, ...safeUser } = user;
    return NextResponse.json({ token, user: safeUser });
  }

  if (action === 'register') {
    const { email, password, name, phone } = body;
    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) return NextResponse.json({ error: 'auth_emailTaken' }, { status: 409 });

    const hash = bcryptjs.hashSync(password, 10);
    const user = await prisma.user.create({
      data: { email: email.toLowerCase(), passwordHash: hash, name, phone, role: 'client' },
    });

    const token = createToken(user.id, user.role as any, user.locationId);
    const { passwordHash: _, ...safeUser } = user;
    return NextResponse.json({ token, user: safeUser });
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

  if (action === 'updateAvatar') {
    const auth = getAuthUser(req);
    if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { avatarUrl } = body;
    await prisma.user.update({ where: { id: auth.userId }, data: { avatarUrl: avatarUrl || null } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
