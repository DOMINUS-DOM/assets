export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, ADMIN_ROLES, forbidden, enforceLocation } from '@/lib/auth';

interface Alert {
  type: 'margin' | 'cost_spike' | 'low_stock';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  entityId: string;
  entityType: string;
}

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  const locationId = req.nextUrl.searchParams.get('locationId');
  const effectiveLocation = enforceLocation(auth, locationId);
  const locFilter = effectiveLocation ? { locationId: effectiveLocation } : {};

  const alerts: Alert[] = [];

  try {
    // ─── 1. MARGIN ALERTS ───
    // Load recipes with their ingredients + costs
    const recipes = await prisma.recipe.findMany({
      include: {
        items: { include: { ingredient: true } },
      },
    });

    // Load menu prices from settings
    let menuItems: any[] = [];
    try {
      const menuKey = effectiveLocation ? `menu-${effectiveLocation}` : 'menu';
      let menuRow = await prisma.setting.findUnique({ where: { key: menuKey } });
      if (!menuRow) menuRow = await prisma.setting.findUnique({ where: { key: 'menu' } });
      if (menuRow) {
        const categories = JSON.parse(menuRow.value);
        for (const cat of categories) {
          if (cat.items) {
            for (const item of cat.items) {
              menuItems.push(item);
            }
          }
        }
      }
    } catch {}

    for (const recipe of recipes) {
      // Calculate recipe cost from ingredients
      const recipeCost = recipe.items.reduce((sum, ri) => {
        return sum + ri.quantity * (ri.ingredient?.costPerUnit || 0);
      }, 0);

      // Find matching menu item for selling price
      const menuItem = menuItems.find((mi: any) => mi.id === recipe.menuItemId);
      if (!menuItem) continue;

      // Get selling price (use default size or first available)
      let sellingPrice = 0;
      if (menuItem.sizes && typeof menuItem.sizes === 'object') {
        const prices = Object.values(menuItem.sizes) as number[];
        sellingPrice = prices.length > 0 ? Math.max(...prices) : 0;
      } else if (menuItem.price) {
        sellingPrice = menuItem.price;
      }

      if (sellingPrice <= 0) continue;

      const margin = ((sellingPrice - recipeCost) / sellingPrice) * 100;

      if (margin < 60) {
        alerts.push({
          type: 'margin',
          severity: margin < 40 ? 'critical' : 'warning',
          title: `Marge faible: ${recipe.name}`,
          message: `Marge de ${margin.toFixed(1)}% (cout ${recipeCost.toFixed(2)} EUR, prix ${sellingPrice.toFixed(2)} EUR). Objectif: 60% min.`,
          entityId: recipe.id,
          entityType: 'recipe',
        });
      }
    }

    // ─── 2. COST SPIKE ALERTS ───
    // Compare current ingredient costPerUnit with average from last 3 purchase invoice lines
    const ingredients = await prisma.ingredient.findMany({
      where: locFilter,
    });

    for (const ing of ingredients) {
      const recentLines = await prisma.purchaseInvoiceLine.findMany({
        where: {
          ingredientId: ing.id,
          invoice: { status: { in: ['validated', 'paid'] } },
        },
        orderBy: { invoice: { invoiceDate: 'desc' } },
        take: 3,
        include: { invoice: true },
      });

      if (recentLines.length < 2) continue;

      const avgPrice = recentLines.reduce((s, l) => s + l.unitPrice, 0) / recentLines.length;
      const latestPrice = recentLines[0].unitPrice;
      const pctChange = avgPrice > 0 ? ((latestPrice - avgPrice) / avgPrice) * 100 : 0;

      if (pctChange > 15) {
        alerts.push({
          type: 'cost_spike',
          severity: pctChange > 30 ? 'critical' : 'warning',
          title: `Hausse de prix: ${ing.name}`,
          message: `+${pctChange.toFixed(1)}% vs moyenne (${latestPrice.toFixed(2)} EUR vs ${avgPrice.toFixed(2)} EUR moy.)`,
          entityId: ing.id,
          entityType: 'ingredient',
        });
      }
    }

    // ─── 3. LOW STOCK ALERTS ───
    const lowStockIngredients = await prisma.ingredient.findMany({
      where: {
        ...locFilter,
        currentStock: { lte: prisma.ingredient.fields.minStock } as any,
      },
    });

    // Fallback: filter manually since Prisma doesn't support field-to-field comparison easily
    const allIngredients = await prisma.ingredient.findMany({ where: locFilter });
    for (const ing of allIngredients) {
      if (ing.currentStock <= ing.minStock) {
        alerts.push({
          type: 'low_stock',
          severity: ing.currentStock <= 0 ? 'critical' : 'warning',
          title: `Stock bas: ${ing.name}`,
          message: `${ing.currentStock} ${ing.unit} restant (min: ${ing.minStock} ${ing.unit})`,
          entityId: ing.id,
          entityType: 'ingredient',
        });
      }
    }
  } catch (error: any) {
    console.error('[alerts] Error computing alerts:', error);
  }

  // Sort by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return NextResponse.json({ alerts });
}
