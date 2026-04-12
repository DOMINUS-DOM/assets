import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();
  const checks: Record<string, { status: string; ms?: number; error?: string }> = {};

  // Database check
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok', ms: Date.now() - dbStart };
  } catch (e: any) {
    checks.database = { status: 'error', error: e.message?.slice(0, 100) };
  }

  // Menu data check
  try {
    const menuStart = Date.now();
    const setting = await prisma.setting.findUnique({ where: { key: 'menu' } });
    checks.menu = { status: setting ? 'ok' : 'fallback', ms: Date.now() - menuStart };
  } catch {
    checks.menu = { status: 'error' };
  }

  // Count active entities
  try {
    const [orders, users, locations] = await Promise.all([
      prisma.order.count(),
      prisma.user.count({ where: { active: true } }),
      prisma.location.count({ where: { active: true } }),
    ]);
    checks.data = { status: 'ok', ms: 0 };
    (checks.data as any).orders = orders;
    (checks.data as any).users = users;
    (checks.data as any).locations = locations;
  } catch {
    checks.data = { status: 'error' };
  }

  const allOk = Object.values(checks).every((c) => c.status === 'ok' || c.status === 'fallback');

  return NextResponse.json({
    status: allOk ? 'healthy' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    responseMs: Date.now() - start,
    checks,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
  }, { status: allOk ? 200 : 503 });
}
// git-deploy-v2 1775994106
