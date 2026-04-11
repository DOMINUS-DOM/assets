export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, ADMIN_ROLES, forbidden } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();
  const locationId = req.nextUrl.searchParams.get('locationId');
  const locFilter = locationId ? { locationId } : {};
  const [employees, shifts, timeEntries, leaveRequests, tasks] = await Promise.all([
    prisma.employee.findMany({ where: locFilter, orderBy: { name: 'asc' } }),
    prisma.shift.findMany({ where: locFilter, orderBy: { date: 'desc' } }),
    prisma.timeEntry.findMany({ orderBy: { clockIn: 'desc' }, take: 50 }),
    prisma.leaveRequest.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.task.findMany({ where: locFilter, orderBy: { date: 'desc' } }),
  ]);
  return NextResponse.json({ employees, shifts, timeEntries, leaveRequests, tasks });
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !ADMIN_ROLES.includes(auth.role)) return forbidden();

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
    if (task) {
      await prisma.task.update({
        where: { id: body.id },
        data: {
          completed: !task.completed,
          completedAt: !task.completed ? new Date() : null,
        },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'completeTaskWithPhoto') {
    await prisma.task.update({
      where: { id: body.id },
      data: {
        completed: true,
        completedAt: new Date(),
        completionPhotoUrl: body.completionPhotoUrl,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'updateTask') {
    const { id, ...data } = body.data || {};
    if (id) await prisma.task.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'deleteTask') {
    await prisma.task.delete({ where: { id: body.id } });
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
