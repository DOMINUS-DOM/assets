export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, ADMIN_ROLES, forbidden } from '@/lib/auth';

export async function GET() {
  const setting = await prisma.setting.findUnique({ where: { key: 'business' } });
  return NextResponse.json(setting ? JSON.parse(setting.value) : {});
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  const body = await req.json();
  await prisma.setting.upsert({
    where: { key: 'business' },
    update: { value: JSON.stringify(body) },
    create: { key: 'business', value: JSON.stringify(body) },
  });
  return NextResponse.json({ ok: true });
}
