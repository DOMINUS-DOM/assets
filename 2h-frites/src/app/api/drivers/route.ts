import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const [drivers, applications] = await Promise.all([
    prisma.driver.findMany({ orderBy: { name: 'asc' } }),
    prisma.driverApplication.findMany({ orderBy: { createdAt: 'desc' } }),
  ]);
  return NextResponse.json({ drivers, applications });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === 'addDriver') {
    const driver = await prisma.driver.create({ data: body.data });
    return NextResponse.json(driver);
  }

  if (body.action === 'toggleActive') {
    const driver = await prisma.driver.findUnique({ where: { id: body.id } });
    if (driver) await prisma.driver.update({ where: { id: body.id }, data: { active: !driver.active } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'addApplication') {
    const app = await prisma.driverApplication.create({ data: body.data });
    return NextResponse.json(app);
  }

  if (body.action === 'updateApplicationStatus') {
    await prisma.driverApplication.update({ where: { id: body.id }, data: { status: body.status } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
