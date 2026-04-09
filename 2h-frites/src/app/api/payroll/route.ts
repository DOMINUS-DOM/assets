export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const [periods, payslips] = await Promise.all([
    prisma.payPeriod.findMany({ orderBy: { startDate: 'desc' } }),
    prisma.payslip.findMany({ orderBy: { createdAt: 'desc' } }),
  ]);
  return NextResponse.json({ periods, payslips });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === 'generatePayslips') {
    const period = await prisma.payPeriod.findUnique({ where: { id: body.periodId } });
    if (!period) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // Delete existing drafts for this period
    await prisma.payslip.deleteMany({ where: { periodId: body.periodId, status: 'draft' } });

    const employees = await prisma.employee.findMany({ where: { active: true } });
    const slips = [];

    for (const emp of employees) {
      const entries = await prisma.timeEntry.findMany({
        where: { employeeId: emp.id, date: { gte: period.startDate, lte: period.endDate }, hoursWorked: { not: null } },
      });
      const totalHours = entries.reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
      if (totalHours === 0) continue;

      const regularHours = Math.min(totalHours, 38);
      const overtimeHours = Math.max(0, totalHours - 38);
      const overtimeRate = emp.hourlyRate * 1.5;
      const grossRegular = regularHours * emp.hourlyRate;
      const grossOvertime = overtimeHours * overtimeRate;
      const grossTotal = grossRegular + grossOvertime;
      const deductions = Math.round(grossTotal * 0.1307 * 100) / 100;
      const netTotal = Math.round((grossTotal - deductions) * 100) / 100;

      const slip = await prisma.payslip.create({
        data: {
          periodId: body.periodId, employeeId: emp.id, employeeName: emp.name,
          regularHours, overtimeHours, hourlyRate: emp.hourlyRate, overtimeRate,
          grossRegular: Math.round(grossRegular * 100) / 100,
          grossOvertime: Math.round(grossOvertime * 100) / 100,
          grossTotal: Math.round(grossTotal * 100) / 100,
          deductions, netTotal,
        },
      });
      slips.push(slip);
    }
    return NextResponse.json(slips);
  }

  if (body.action === 'updatePeriodStatus') {
    await prisma.payPeriod.update({ where: { id: body.id }, data: { status: body.status } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'validatePayslip') {
    await prisma.payslip.update({ where: { id: body.id }, data: { status: 'validated' } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'markPayslipPaid') {
    await prisma.payslip.update({ where: { id: body.id }, data: { status: 'paid' } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
