export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, ADMIN_ROLES, forbidden } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  const menuItemId = req.nextUrl.searchParams.get('menuItemId');
  const where = menuItemId ? { menuItemId } : {};

  const recipes = await prisma.recipe.findMany({
    where,
    include: { items: { include: { ingredient: true } } },
    orderBy: { name: 'asc' },
  });

  const result = recipes.map((r) => {
    const totalCost = r.items.reduce((sum, item) => sum + item.quantity * item.ingredient.costPerUnit, 0);
    return { ...r, totalCost };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  const body = await req.json();

  if (body.action === 'create') {
    const { menuItemId, name, prepTime, notes, items } = body;
    if (!menuItemId || !name) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    const recipe = await prisma.recipe.create({
      data: {
        menuItemId,
        name,
        prepTime: prepTime || null,
        notes: notes || '',
        items: items?.length
          ? { create: items.map((i: any) => ({ ingredientId: i.ingredientId, quantity: i.quantity, unit: i.unit })) }
          : undefined,
      },
      include: { items: { include: { ingredient: true } } },
    });
    const totalCost = recipe.items.reduce((sum, item) => sum + item.quantity * item.ingredient.costPerUnit, 0);
    return NextResponse.json({ ...recipe, totalCost });
  }

  if (body.action === 'update') {
    const { id, name, prepTime, notes } = body;
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
    const recipe = await prisma.recipe.update({
      where: { id },
      data: { ...(name !== undefined && { name }), ...(prepTime !== undefined && { prepTime }), ...(notes !== undefined && { notes }) },
      include: { items: { include: { ingredient: true } } },
    });
    const totalCost = recipe.items.reduce((sum, item) => sum + item.quantity * item.ingredient.costPerUnit, 0);
    return NextResponse.json({ ...recipe, totalCost });
  }

  if (body.action === 'delete') {
    if (!body.id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
    await prisma.recipe.delete({ where: { id: body.id } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'addItem') {
    const { recipeId, ingredientId, quantity, unit } = body;
    if (!recipeId || !ingredientId) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    const item = await prisma.recipeItem.create({
      data: { recipeId, ingredientId, quantity: quantity || 0, unit: unit || '' },
      include: { ingredient: true },
    });
    return NextResponse.json(item);
  }

  if (body.action === 'removeItem') {
    if (!body.id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
    await prisma.recipeItem.delete({ where: { id: body.id } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'updateItem') {
    const { id, quantity, unit } = body;
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
    const item = await prisma.recipeItem.update({
      where: { id },
      data: { ...(quantity !== undefined && { quantity }), ...(unit !== undefined && { unit }) },
      include: { ingredient: true },
    });
    return NextResponse.json(item);
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
