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

    const token = createToken(user.id, user.role as any);
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

    const token = createToken(user.id, user.role as any);
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

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
