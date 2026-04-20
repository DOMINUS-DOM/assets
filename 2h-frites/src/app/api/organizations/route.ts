export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, ADMIN_ROLES } from '@/lib/auth';
import bcryptjs from 'bcryptjs';

// GET /api/organizations — List all organizations (platform admin only)
export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || !['platform_super_admin', 'franchisor_admin'].includes(auth.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { locations: true, users: true } },
    },
  });

  return NextResponse.json(orgs);
}

// POST /api/organizations — Create or update organizations
export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  // Platform-level actions (create / suspend others / delete / subscription
  // changes) stay restricted. `update` is also available to a tenant admin
  // editing their OWN org (needed by the onboarding wizard which must persist
  // branding + onboarded for a fresh patron account).
  const isPlatformActor = ['platform_super_admin', 'franchisor_admin'].includes(auth.role);
  const isTenantAdmin = ['patron', 'manager', 'location_manager'].includes(auth.role);

  if (action === 'update') {
    if (!isPlatformActor) {
      // Tenant admin can only update their own organization.
      if (!isTenantAdmin || !auth.organizationId || auth.organizationId !== body.id) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    }
  } else if (!isPlatformActor) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // ─── Create new organization with location + admin user ───
  if (action === 'create') {
    const { orgName, slug, locationName, address, city, postalCode, phone, email, adminName, adminEmail, adminPassword, modules } = body;

    // Validate required fields
    if (!orgName || !slug || !locationName || !address || !city || !postalCode || !phone || !email || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    // Check slug uniqueness
    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'slug_taken' }, { status: 409 });
    }

    // Check admin email uniqueness
    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail.toLowerCase() } });
    if (existingUser) {
      return NextResponse.json({ error: 'email_taken' }, { status: 409 });
    }

    try {
      // Transactional creation: org + location + admin user
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create organization
        const org = await tx.organization.create({
          data: {
            name: orgName,
            slug: slug.toLowerCase(),
            modulesJson: modules ? JSON.stringify(modules) : '{}',
            brandingJson: '{}',
          },
        });

        // 2. Create first location
        const location = await tx.location.create({
          data: {
            organizationId: org.id,
            name: locationName,
            slug: `${slug}-main`,
            address,
            city,
            postalCode,
            phone,
            email,
            settingsJson: JSON.stringify({
              vatRate: 0.06,
              vatRateDrinks: 0.21,
              defaultDeliveryFee: 2.50,
              minOrderDelivery: 12,
              maxOrdersPerHour: 30,
              acceptingOrders: true,
            }),
          },
        });

        // 3. Create admin user (patron role, bound to org + location)
        const passwordHash = bcryptjs.hashSync(adminPassword, 10);
        const adminUser = await tx.user.create({
          data: {
            email: adminEmail.toLowerCase(),
            passwordHash,
            name: adminName,
            phone: phone,
            role: 'patron',
            organizationId: org.id,
            locationId: location.id,
          },
        });

        // 4. Create employee record for admin
        await tx.employee.create({
          data: {
            userId: adminUser.id,
            locationId: location.id,
            name: adminName,
            phone: phone,
            email: adminEmail.toLowerCase(),
            position: 'Patron',
            contractType: 'CDI',
            hourlyRate: 0,
            hireDate: new Date().toISOString().slice(0, 10),
          },
        });

        return { org, location, adminUser: { id: adminUser.id, email: adminUser.email, name: adminUser.name } };
      });

      return NextResponse.json(result);
    } catch (e: any) {
      console.error('Organization creation error:', e.message);
      return NextResponse.json({ error: 'creation_failed', details: e.message?.slice(0, 200) }, { status: 500 });
    }
  }

  // ─── Toggle active ───
  if (action === 'toggleActive') {
    const { id, active } = body;
    const org = await prisma.organization.update({
      where: { id },
      data: { active },
    });
    return NextResponse.json(org);
  }

  // ─── Get detail ───
  if (action === 'getDetail') {
    const org = await prisma.organization.findUnique({
      where: { id: body.id },
      include: {
        locations: { select: { id: true, name: true, slug: true, city: true, active: true } },
        users: { select: { id: true, name: true, email: true, role: true, active: true, createdAt: true } },
      },
    });
    if (!org) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const { ...orgData } = org;
    return NextResponse.json(orgData);
  }

  // ─── Update subscription status ───
  if (action === 'updateSubscription') {
    const { id, subscriptionStatus, planType, addons } = body;
    const updateData: any = {};
    if (subscriptionStatus) updateData.subscriptionStatus = subscriptionStatus;
    if (planType !== undefined) updateData.planType = planType;
    if (addons !== undefined) updateData.addons = typeof addons === 'string' ? addons : JSON.stringify(addons);
    const org = await prisma.organization.update({ where: { id }, data: updateData });
    return NextResponse.json(org);
  }

  // ─── Delete organization (platform_super_admin only, with cascade + safety guard) ───
  if (action === 'delete') {
    // Harden auth: only platform_super_admin (franchisor_admin cannot delete tenants).
    if (auth.role !== 'platform_super_admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const { id, confirmSlug } = body;
    if (!id || !confirmSlug) {
      return NextResponse.json({ error: 'missing_confirmation' }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({ where: { id }, select: { id: true, slug: true, active: true, subscriptionStatus: true } });
    if (!org) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // Typed slug must match exactly — guards against misclicks.
    if (confirmSlug !== org.slug) {
      return NextResponse.json({ error: 'slug_mismatch' }, { status: 400 });
    }

    // Safety guard: refuse to delete a live paying tenant. Must be suspended or
    // cancelled/expired first. This protects real customers like 2hfrites.be.
    if (org.active && org.subscriptionStatus === 'active') {
      return NextResponse.json({ error: 'live_tenant_protected', message: 'Suspendre d\'abord, puis supprimer.' }, { status: 409 });
    }

    try {
      await prisma.$transaction(async (tx) => {
        const locations = await tx.location.findMany({ where: { organizationId: id }, select: { id: true } });
        const locationIds = locations.map((l) => l.id);

        if (locationIds.length > 0) {
          // Orders: delete items + status history first, then orders.
          const orders = await tx.order.findMany({ where: { locationId: { in: locationIds } }, select: { id: true } });
          const orderIds = orders.map((o) => o.id);
          if (orderIds.length > 0) {
            await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
            await tx.statusEntry.deleteMany({ where: { orderId: { in: orderIds } } });
            await tx.loyaltyTransaction.deleteMany({ where: { orderId: { in: orderIds } } });
            await tx.order.deleteMany({ where: { id: { in: orderIds } } });
          }

          // Menu: products cascade from their category (schema has onDelete: Cascade).
          await tx.menuCategory.deleteMany({ where: { locationId: { in: locationIds } } });

          // Staff/ops tables scoped to locations.
          await tx.employee.deleteMany({ where: { locationId: { in: locationIds } } }).catch(() => {});
          await tx.driver.deleteMany({ where: { locationId: { in: locationIds } } }).catch(() => {});
          await tx.shift.deleteMany({ where: { locationId: { in: locationIds } } }).catch(() => {});
          await tx.task.deleteMany({ where: { locationId: { in: locationIds } } }).catch(() => {});
          await tx.ingredient.deleteMany({ where: { locationId: { in: locationIds } } }).catch(() => {});
          await tx.reservation.deleteMany({ where: { locationId: { in: locationIds } } }).catch(() => {});
          await tx.auditLog.deleteMany({ where: { locationId: { in: locationIds } } }).catch(() => {});
        }

        // Users (and any employee rows that reference them) scoped to org.
        const users = await tx.user.findMany({ where: { organizationId: id }, select: { id: true } });
        const userIds = users.map((u) => u.id);
        if (userIds.length > 0) {
          await tx.employee.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
          await tx.auditLog.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
        }
        await tx.user.deleteMany({ where: { organizationId: id } });

        // Finally the locations and the org itself.
        await tx.location.deleteMany({ where: { organizationId: id } });
        await tx.organization.delete({ where: { id } });
      }, { timeout: 30000 });

      return NextResponse.json({ ok: true, deletedSlug: org.slug });
    } catch (e: any) {
      console.error('Tenant delete error:', e?.message);
      return NextResponse.json({ error: 'delete_failed', details: (e?.message || '').slice(0, 300) }, { status: 500 });
    }
  }

  // ─── Update branding or modules ───
  if (action === 'update') {
    const { id, ...data } = body;
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.brandingJson !== undefined) updateData.brandingJson = typeof data.brandingJson === 'string' ? data.brandingJson : JSON.stringify(data.brandingJson);
    if (data.modulesJson !== undefined) updateData.modulesJson = typeof data.modulesJson === 'string' ? data.modulesJson : JSON.stringify(data.modulesJson);
    if (data.customDomain !== undefined) updateData.customDomain = data.customDomain || null;
    if (data.onboarded !== undefined) updateData.onboarded = !!data.onboarded;

    const org = await prisma.organization.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(org);
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
