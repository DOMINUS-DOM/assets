export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { categories as staticMenu } from '@/data/menu';

export async function GET() {
  const row = await prisma.setting.findUnique({ where: { key: 'menu' } });
  if (row) {
    return NextResponse.json(JSON.parse(row.value));
  }
  // First time: return static menu data as default
  return NextResponse.json(staticMenu);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  await prisma.setting.upsert({
    where: { key: 'menu' },
    update: { value: JSON.stringify(body) },
    create: { key: 'menu', value: JSON.stringify(body) },
  });
  return NextResponse.json({ ok: true });
}
