import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getRequiredOrgId, getLocationIdsForOrg, unauthorized, forbidden } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { hasPermission, canManageRole, ROLE_HIERARCHY } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { sendEmployeeInviteEmail } from '@/lib/email';

// Generate a readable temporary password. Avoids ambiguous chars (0/O, 1/l/I).
function generateTempPassword(length = 10): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function buildPublicUrl(req: NextRequest, path: string): string {
  const host = req.headers.get('host') || 'brizoapp.com';
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const protocol = forwardedProto || (isLocalhost ? 'http' : 'https');
  return `${protocol}://${host}${path}`;
}

export const dynamic = 'force-dynamic';

// ─── GET: list users ───
export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  // Tenant isolation
  const orgResult = getRequiredOrgId(req);
  if (!orgResult) return forbidden();
  const { orgId } = orgResult;

  // Check 'users' permission
  const caller = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!caller || !hasPermission(caller, 'users')) return forbidden();

  const locationId = req.nextUrl.searchParams.get('locationId');

  const where: any = { organizationId: orgId };
  // Non-franchisor_admin can only see users at or below their role level
  if (caller.role !== 'franchisor_admin') {
    const callerLevel = ROLE_HIERARCHY[caller.role] || 0;
    // Filter: only show users with lower or equal hierarchy
    // Also scope to their location if they have one
    if (caller.locationId) {
      where.OR = [
        { locationId: caller.locationId },
        { locationId: null, role: 'client' },
      ];
    }
  }

  if (locationId && locationId !== 'all') {
    where.locationId = locationId;
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      active: true,
      avatarUrl: true,
      permissionsJson: true,
      driverId: true,
      locationId: true,
      createdAt: true,
      location: { select: { id: true, name: true } },
    },
  });

  // Filter out users with higher role than caller
  const callerLevel = ROLE_HIERARCHY[caller.role] || 0;
  const filtered = users.filter((u) => {
    const uLevel = ROLE_HIERARCHY[u.role] || 0;
    return uLevel <= callerLevel;
  });

  // Get locations for the create form — scoped to org
  const locations = await prisma.location.findMany({
    where: { active: true, organizationId: orgId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ users: filtered, locations });
}

// ─── POST: create / update / delete user ───
export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  // Tenant isolation
  const orgResult = getRequiredOrgId(req);
  if (!orgResult) return forbidden();
  const { orgId } = orgResult;

  const caller = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!caller || !hasPermission(caller, 'users')) return forbidden();

  const body = await req.json();
  const { action } = body;

  // ─── CREATE USER ───
  // Admin provides email/name/role/locationId. System generates a temporary
  // password and emails it. User is forced to change it on first login.
  if (action === 'create') {
    const { email, name, phone, role, locationId } = body;

    if (!email || !name || !role) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    // Anti-escalation: can't create user with equal or higher role
    if (!canManageRole(caller.role, role)) {
      return NextResponse.json({ error: 'role_escalation' }, { status: 403 });
    }

    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'email_taken' }, { status: 409 });
    }

    // Validate locationId belongs to org
    if (locationId) {
      const locationIds = await getLocationIdsForOrg(orgId);
      if (!locationIds.includes(locationId)) {
        return NextResponse.json({ error: 'location_not_in_org' }, { status: 403 });
      }
    }

    const tempPassword = generateTempPassword();
    const passwordHash = bcrypt.hashSync(tempPassword, 10);
    const tempPasswordExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        phone: phone || '',
        role,
        locationId: locationId || null,
        organizationId: orgId,
        active: true,
        mustChangePassword: true,
        tempPasswordExpiresAt,
      },
      select: {
        id: true, email: true, name: true, phone: true, role: true,
        active: true, locationId: true, permissionsJson: true, createdAt: true,
        location: { select: { id: true, name: true } },
      },
    });

    logAudit({ userId: caller.id, action: 'create', entity: 'User', entityId: user.id, changes: { email: email.toLowerCase(), role, name } });

    // Fire-and-forget invitation email with the temp password + expiry.
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
    const loginUrl = buildPublicUrl(req, '/login');
    sendEmployeeInviteEmail(user.email, {
      name: user.name,
      restaurantName: org?.name || 'BrizoApp',
      role: user.role,
      tempPassword,
      loginUrl,
      tempPasswordExpiresAt,
    }).catch(() => {});

    return NextResponse.json({ user });
  }

  // ─── UPDATE USER ───
  if (action === 'update') {
    const { userId, role, locationId, active, permissionsJson, name, phone } = body;

    if (!userId) {
      return NextResponse.json({ error: 'missing_userId' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
    }

    // Tenant isolation: verify target belongs to same org
    if (target.organizationId !== orgId) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
    }

    // Can't edit user with equal or higher role
    if (!canManageRole(caller.role, target.role)) {
      return NextResponse.json({ error: 'role_escalation' }, { status: 403 });
    }

    // If changing role, can't escalate to equal or higher
    if (role && !canManageRole(caller.role, role)) {
      return NextResponse.json({ error: 'role_escalation' }, { status: 403 });
    }

    // Can't deactivate yourself
    if (userId === caller.id && active === false) {
      return NextResponse.json({ error: 'cannot_deactivate_self' }, { status: 400 });
    }

    const data: any = {};
    if (role !== undefined) data.role = role;
    if (locationId !== undefined) data.locationId = locationId || null;
    if (active !== undefined) data.active = active;
    if (permissionsJson !== undefined) data.permissionsJson = permissionsJson;
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true, email: true, name: true, phone: true, role: true,
        active: true, locationId: true, permissionsJson: true, avatarUrl: true,
        createdAt: true,
        location: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ user: updated });
  }

  // ─── RESET PASSWORD ───
  if (action === 'resetPassword') {
    const { userId, newPassword } = body;

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
    }

    // Tenant isolation: verify target belongs to same org
    if (target.organizationId !== orgId) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
    }

    if (!canManageRole(caller.role, target.role)) {
      return NextResponse.json({ error: 'role_escalation' }, { status: 403 });
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    return NextResponse.json({ ok: true });
  }

  // ─── DELETE (soft) ───
  if (action === 'delete') {
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'missing_userId' }, { status: 400 });
    }

    if (userId === caller.id) {
      return NextResponse.json({ error: 'cannot_delete_self' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
    }

    // Tenant isolation: verify target belongs to same org
    if (target.organizationId !== orgId) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
    }

    if (!canManageRole(caller.role, target.role)) {
      return NextResponse.json({ error: 'role_escalation' }, { status: 403 });
    }

    await prisma.user.update({ where: { id: userId }, data: { active: false } });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
