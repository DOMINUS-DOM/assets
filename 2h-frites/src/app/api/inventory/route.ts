export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, ADMIN_ROLES, forbidden } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();
  const [ingredients, suppliers, movements] = await Promise.all([
    prisma.ingredient.findMany({ orderBy: { name: 'asc' } }),
    prisma.supplier.findMany({ orderBy: { name: 'asc' } }),
    prisma.stockMovement.findMany({ orderBy: { date: 'desc' }, take: 50 }),
  ]);
  return NextResponse.json({ ingredients, suppliers, movements });
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  const body = await req.json();

  if (body.action === 'addMovement') {
    const { ingredientId, type, quantity, note, date } = body;
    const mv = await prisma.stockMovement.create({ data: { ingredientId, type, quantity, note, date } });
    const delta = type === 'in' ? quantity : -quantity;
    await prisma.ingredient.update({
      where: { id: ingredientId },
      data: { currentStock: { increment: delta } },
    });
    return NextResponse.json(mv);
  }

  if (body.action === 'addIngredient') {
    const ing = await prisma.ingredient.create({ data: body.data });
    return NextResponse.json(ing);
  }

  if (body.action === 'addSupplier') {
    const sup = await prisma.supplier.create({ data: body.data });
    return NextResponse.json(sup);
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
