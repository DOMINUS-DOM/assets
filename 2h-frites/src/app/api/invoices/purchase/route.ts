export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, ADMIN_ROLES, forbidden, enforceLocation } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  const locationId = req.nextUrl.searchParams.get('locationId');
  const status = req.nextUrl.searchParams.get('status');
  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');

  const effectiveLocation = enforceLocation(auth, locationId);

  const where: any = {};
  if (effectiveLocation) where.locationId = effectiveLocation;
  if (status) where.status = status;
  if (from || to) {
    where.invoiceDate = {};
    if (from) where.invoiceDate.gte = from;
    if (to) where.invoiceDate.lte = to;
  }

  const invoices = await prisma.purchaseInvoice.findMany({
    where,
    include: {
      lines: { include: { ingredient: true } },
      supplier: true,
    },
    orderBy: { invoiceDate: 'desc' },
  });

  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

  const body = await req.json();

  // ─── CREATE ───
  if (body.action === 'create') {
    const { locationId, supplierId, invoiceNumber, invoiceDate, dueDate, lines, imageUrl, notes, aiExtracted } = body;
    const effectiveLocation = enforceLocation(auth, locationId || null);

    // Calculate totals from lines
    let subtotal = 0;
    let totalVat = 0;
    const lineData = (lines || []).map((l: any) => {
      const lineTotal = l.quantity * l.unitPrice;
      const lineVat = lineTotal * (l.vatRate || 0.06);
      subtotal += lineTotal;
      totalVat += lineVat;
      return {
        description: l.description || '',
        ingredientId: l.ingredientId || null,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        vatRate: l.vatRate || 0.06,
        total: lineTotal,
      };
    });
    const grandTotal = subtotal + totalVat;

    const invoice = await prisma.purchaseInvoice.create({
      data: {
        locationId: effectiveLocation,
        supplierId: supplierId || null,
        invoiceNumber: invoiceNumber || null,
        invoiceDate: invoiceDate || new Date().toISOString().slice(0, 10),
        dueDate: dueDate || null,
        subtotal,
        totalVat,
        grandTotal,
        imageUrl: imageUrl || null,
        aiExtracted: aiExtracted || false,
        notes: notes || '',
        lines: { create: lineData },
      },
      include: { lines: { include: { ingredient: true } }, supplier: true },
    });

    // Optionally update ingredient costPerUnit from lines
    for (const l of lineData) {
      if (l.ingredientId && l.unitPrice > 0) {
        await prisma.ingredient.update({
          where: { id: l.ingredientId },
          data: { costPerUnit: l.unitPrice },
        }).catch(() => {});
      }
    }

    return NextResponse.json(invoice);
  }

  // ─── UPDATE ───
  if (body.action === 'update') {
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

    // If lines are provided, recalculate totals
    if (fields.lines) {
      let subtotal = 0;
      let totalVat = 0;
      const lineData = fields.lines.map((l: any) => {
        const lineTotal = l.quantity * l.unitPrice;
        const lineVat = lineTotal * (l.vatRate || 0.06);
        subtotal += lineTotal;
        totalVat += lineVat;
        return {
          description: l.description || '',
          ingredientId: l.ingredientId || null,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          vatRate: l.vatRate || 0.06,
          total: lineTotal,
        };
      });

      // Delete old lines and create new ones
      await prisma.purchaseInvoiceLine.deleteMany({ where: { invoiceId: id } });
      const invoice = await prisma.purchaseInvoice.update({
        where: { id },
        data: {
          ...Object.fromEntries(Object.entries(fields).filter(([k]) => k !== 'lines' && k !== 'action')),
          subtotal,
          totalVat,
          grandTotal: subtotal + totalVat,
          lines: { create: lineData },
        },
        include: { lines: { include: { ingredient: true } }, supplier: true },
      });
      return NextResponse.json(invoice);
    }

    // Simple field update (no lines)
    delete fields.action;
    const invoice = await prisma.purchaseInvoice.update({
      where: { id },
      data: fields,
      include: { lines: { include: { ingredient: true } }, supplier: true },
    });
    return NextResponse.json(invoice);
  }

  // ─── UPDATE STATUS ───
  if (body.action === 'updateStatus') {
    const { id, status } = body;
    if (!id || !status) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    if (!['draft', 'validated', 'paid'].includes(status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
    }

    const invoice = await prisma.purchaseInvoice.update({
      where: { id },
      data: { status },
      include: { lines: { include: { ingredient: true } }, supplier: true },
    });

    // When validating, update ingredient costs from lines
    if (status === 'validated') {
      const lines = await prisma.purchaseInvoiceLine.findMany({ where: { invoiceId: id } });
      for (const line of lines) {
        if (line.ingredientId && line.unitPrice > 0) {
          await prisma.ingredient.update({
            where: { id: line.ingredientId },
            data: { costPerUnit: line.unitPrice },
          }).catch(() => {});
        }
      }
    }

    return NextResponse.json(invoice);
  }

  // ─── DELETE ───
  if (body.action === 'delete') {
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

    const invoice = await prisma.purchaseInvoice.findUnique({ where: { id } });
    if (!invoice) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (invoice.status !== 'draft') {
      return NextResponse.json({ error: 'only_draft_can_be_deleted' }, { status: 400 });
    }

    await prisma.purchaseInvoice.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  // ─── ADD LINE ───
  if (body.action === 'addLine') {
    const { invoiceId, description, ingredientId, quantity, unitPrice, vatRate } = body;
    if (!invoiceId) return NextResponse.json({ error: 'missing_invoiceId' }, { status: 400 });

    const lineTotal = quantity * unitPrice;
    const line = await prisma.purchaseInvoiceLine.create({
      data: {
        invoiceId,
        description: description || '',
        ingredientId: ingredientId || null,
        quantity,
        unitPrice,
        vatRate: vatRate || 0.06,
        total: lineTotal,
      },
      include: { ingredient: true },
    });

    // Recalculate invoice totals
    const allLines = await prisma.purchaseInvoiceLine.findMany({ where: { invoiceId } });
    const subtotal = allLines.reduce((s, l) => s + l.total, 0);
    const totalVat = allLines.reduce((s, l) => s + l.total * l.vatRate, 0);
    await prisma.purchaseInvoice.update({
      where: { id: invoiceId },
      data: { subtotal, totalVat, grandTotal: subtotal + totalVat },
    });

    return NextResponse.json(line);
  }

  // ─── REMOVE LINE ───
  if (body.action === 'removeLine') {
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

    const line = await prisma.purchaseInvoiceLine.findUnique({ where: { id } });
    if (!line) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    await prisma.purchaseInvoiceLine.delete({ where: { id } });

    // Recalculate invoice totals
    const allLines = await prisma.purchaseInvoiceLine.findMany({ where: { invoiceId: line.invoiceId } });
    const subtotal = allLines.reduce((s, l) => s + l.total, 0);
    const totalVat = allLines.reduce((s, l) => s + l.total * l.vatRate, 0);
    await prisma.purchaseInvoice.update({
      where: { id: line.invoiceId },
      data: { subtotal, totalVat, grandTotal: subtotal + totalVat },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
