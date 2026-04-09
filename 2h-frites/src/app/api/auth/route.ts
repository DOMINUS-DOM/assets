import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    // Simple token (in production: use JWT with secret)
    const token = Buffer.from(JSON.stringify({ userId: user.id, role: user.role, exp: Date.now() + 86400000 })).toString('base64');
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

    const token = Buffer.from(JSON.stringify({ userId: user.id, role: user.role, exp: Date.now() + 86400000 })).toString('base64');
    const { passwordHash: _, ...safeUser } = user;
    return NextResponse.json({ token, user: safeUser });
  }

  if (action === 'me') {
    const { token } = body;
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());
      if (payload.exp < Date.now()) return NextResponse.json({ error: 'expired' }, { status: 401 });
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user || !user.active) return NextResponse.json({ error: 'not_found' }, { status: 401 });
      const { passwordHash: _, ...safeUser } = user;
      return NextResponse.json({ user: safeUser });
    } catch { return NextResponse.json({ error: 'invalid' }, { status: 401 }); }
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
