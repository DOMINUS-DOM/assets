export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, ADMIN_ROLES, unauthorized, forbidden, enforceLocation } from '@/lib/auth';

// Actions any authenticated user (employee, driver, manager) can perform
const EMPLOYEE_ACTIONS = ['clockIn', 'clockOut', 'toggleTask', 'completeTaskWithPhoto', 'addLeaveRequest'];

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const locationId = req.nextUrl.searchParams.get('locationId');
  const effectiveLocation = enforceLocation(auth, locationId);
  const locFilter = effectiveLocation ? { locationId: effectiveLocation } : {};

  // Admin: return all staff data
  if (ADMIN_ROLES.includes(auth.role)) {
    const [employees, shifts, timeEntries, leaveRequests, tasks] = await Promise.all([
      prisma.employee.findMany({ where: locFilter, orderBy: { name: 'asc' } }),
      prisma.shift.findMany({ where: locFilter, orderBy: { date: 'desc' } }),
      prisma.timeEntry.findMany({ orderBy: { clockIn: 'desc' }, take: 50 }),
      prisma.leaveRequest.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.task.findMany({ where: locFilter, orderBy: { date: 'desc' } }),
    ]);
    return NextResponse.json({ employees, shifts, timeEntries, leaveRequests, tasks });
  }

  // Employee: return only their own data
  const employee = await prisma.employee.findFirst({ where: { userId: auth.userId } });
  if (!employee) {
    return NextResponse.json({ employees: [], shifts: [], timeEntries: [], leaveRequests: [], tasks: [] });
  }

  const [shifts, timeEntries, leaveRequests, tasks] = await Promise.all([
    prisma.shift.findMany({ where: { employeeId: employee.id }, orderBy: { date: 'desc' } }),
    prisma.timeEntry.findMany({ where: { employeeId: employee.id }, orderBy: { clockIn: 'desc' }, take: 50 }),
    prisma.leaveRequest.findMany({ where: { employeeId: employee.id }, orderBy: { createdAt: 'desc' } }),
    prisma.task.findMany({
      where: { OR: [{ employeeId: employee.id }, { employeeId: null }] },
      orderBy: { date: 'desc' },
    }),
  ]);

  return NextResponse.json({ employees: [employee], shifts, timeEntries, leaveRequests, tasks });
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const body = await req.json();

  // Employee-level actions: any authenticated user
  if (EMPLOYEE_ACTIONS.includes(body.action)) {
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
      if (!task) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      // Ownership check: employee can only toggle their own or unassigned tasks
      if (!ADMIN_ROLES.includes(auth.role)) {
        const emp = await prisma.employee.findFirst({ where: { userId: auth.userId } });
        if (task.employeeId && task.employeeId !== emp?.id) return forbidden();
      }
      await prisma.task.update({
        where: { id: body.id },
        data: { completed: !task.completed, completedAt: !task.completed ? new Date() : null },
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'completeTaskWithPhoto') {
      const task = await prisma.task.findUnique({ where: { id: body.id } });
      if (!task) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      // Ownership check
      if (!ADMIN_ROLES.includes(auth.role)) {
        const emp = await prisma.employee.findFirst({ where: { userId: auth.userId } });
        if (task.employeeId && task.employeeId !== emp?.id) return forbidden();
      }
      await prisma.task.update({
        where: { id: body.id },
        data: { completed: true, completedAt: new Date(), completionPhotoUrl: body.completionPhotoUrl },
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'addLeaveRequest') {
      const d = body.data || {};
      const VALID_TYPES = ['vacation', 'sick', 'personal', 'other'];
      if (!d.employeeId || !d.startDate || !d.endDate) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
      if (d.type && !VALID_TYPES.includes(d.type)) return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
      const lr = await prisma.leaveRequest.create({
        data: { employeeId: d.employeeId, type: d.type || 'other', startDate: d.startDate, endDate: d.endDate, reason: d.reason || '', status: 'pending' },
      });
      return NextResponse.json(lr);
    }
  }

  // Admin-only actions
  if (!ADMIN_ROLES.includes(auth.role)) return forbidden();

  if (body.action === 'updateTask') {
    const { id, ...data } = body.data || {};
    if (id) await prisma.task.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'deleteTask') {
    await prisma.task.delete({ where: { id: body.id } });
    return NextResponse.json({ ok: true });
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
    const VALID_CATEGORIES = ['prep', 'cleaning', 'restock', 'other'];
    const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
    const d = body.data || {};
    if (!d.title?.trim()) return NextResponse.json({ error: 'title_required' }, { status: 400 });
    if (d.category && !VALID_CATEGORIES.includes(d.category)) return NextResponse.json({ error: 'invalid_category' }, { status: 400 });
    if (d.priority && !VALID_PRIORITIES.includes(d.priority)) return NextResponse.json({ error: 'invalid_priority' }, { status: 400 });
    const task = await prisma.task.create({
      data: {
        title: d.title.trim(),
        description: d.description || '',
        category: d.category || 'other',
        priority: d.priority || 'medium',
        date: d.date || new Date().toISOString().slice(0, 10),
        employeeId: d.employeeId || null,
        locationId: d.locationId || null,
        dueTime: d.dueTime || null,
        photoUrl: d.photoUrl || null,
        requiresPhoto: d.requiresPhoto || false,
      },
    });
    return NextResponse.json(task);
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
