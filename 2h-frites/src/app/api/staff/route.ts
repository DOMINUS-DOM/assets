import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const [employees, shifts, timeEntries, leaveRequests, tasks] = await Promise.all([
    prisma.employee.findMany({ orderBy: { name: 'asc' } }),
    prisma.shift.findMany({ orderBy: { date: 'desc' } }),
    prisma.timeEntry.findMany({ orderBy: { clockIn: 'desc' }, take: 50 }),
    prisma.leaveRequest.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.task.findMany({ orderBy: { date: 'desc' } }),
  ]);
  return NextResponse.json({ employees, shifts, timeEntries, leaveRequests, tasks });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === 'clockIn') {
    const entry = await prisma.timeEntry.create({
      data: { employeeId: body.employeeId, date: new Date().toISOString().slice(0, 10), clockIn: new Date() },
    });
    return NextResponse.json(entry);
  }

  if (body.action === 'clockOut') {
    const entry = await prisma.timeEntry.findUnique({ where: { id: body.id } });
    if (!entry) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const hours = (Date.now() - new Date(entry.clockIn).getTime()) / 3600000;
    await prisma.timeEntry.update({
      where: { id: body.id },
      data: { clockOut: new Date(), hoursWorked: Math.round(hours * 100) / 100 },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'toggleTask') {
    const task = await prisma.task.findUnique({ where: { id: body.id } });
    if (task) await prisma.task.update({ where: { id: body.id }, data: { completed: !task.completed } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'addLeaveRequest') {
    const lr = await prisma.leaveRequest.create({ data: body.data });
    return NextResponse.json(lr);
  }

  if (body.action === 'updateLeaveStatus') {
    await prisma.leaveRequest.update({ where: { id: body.id }, data: { status: body.status } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'addShift') {
    const shift = await prisma.shift.create({ data: body.data });
    return NextResponse.json(shift);
  }

  if (body.action === 'addTask') {
    const task = await prisma.task.create({ data: body.data });
    return NextResponse.json(task);
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
