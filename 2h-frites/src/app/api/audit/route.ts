import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get('locationId');
  const limit = parseInt(searchParams.get('limit') || '50');

  const logs = await prisma.auditLog.findMany({
    where: locationId ? { locationId } : {},
    include: { user: { select: { name: true, email: true, role: true } }, location: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const log = await prisma.auditLog.create({ data: body });
  return NextResponse.json(log);
}
