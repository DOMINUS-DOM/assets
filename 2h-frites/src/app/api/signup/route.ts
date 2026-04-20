export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createToken, buildSessionCookie } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';
import { env } from '@/lib/env';
import bcryptjs from 'bcryptjs';

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

// POST /api/signup — Public self-service restaurant creation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { restaurantName, address, city, postalCode, phone, restaurantEmail, adminName, adminEmail, adminPassword } = body;

    // ─── Validation ───
    if (!restaurantName || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'missing_fields', message: 'Tous les champs obligatoires sont requis.' }, { status: 400 });
    }

    if (adminPassword.length < 8) {
      return NextResponse.json({ error: 'password_too_short', message: 'Le mot de passe doit contenir au moins 8 caractères.' }, { status: 400 });
    }

    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail.toLowerCase() } });
    if (existingUser) {
      return NextResponse.json({ error: 'email_taken', message: 'Cet email est déjà utilisé.' }, { status: 409 });
    }

    // Generate unique slug
    let slug = slugify(restaurantName);
    const existingOrg = await prisma.organization.findUnique({ where: { slug } });
    if (existingOrg) {
      // Append random suffix
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    // ─── Transactional creation ───
    const passwordHash = bcryptjs.hashSync(adminPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Organization
      const org = await tx.organization.create({
        data: {
          name: restaurantName,
          slug,
          brandingJson: '{}',
          modulesJson: '{}',
          subscriptionStatus: 'trial',
          trialEndsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // +10 days
        },
      });

      // 2. Location
      const location = await tx.location.create({
        data: {
          organizationId: org.id,
          name: restaurantName,
          slug: `${slug}-main`,
          address: address || '',
          city: city || '',
          postalCode: postalCode || '',
          phone: phone || '',
          email: (restaurantEmail || adminEmail).toLowerCase(),
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

      // 3. User (patron)
      const user = await tx.user.create({
        data: {
          email: adminEmail.toLowerCase(),
          passwordHash,
          name: adminName,
          phone: phone || '',
          role: 'patron',
          organizationId: org.id,
          locationId: location.id,
        },
      });

      // 4. Employee record
      await tx.employee.create({
        data: {
          userId: user.id,
          locationId: location.id,
          name: adminName,
          phone: phone || '',
          email: adminEmail.toLowerCase(),
          position: 'Patron',
          contractType: 'CDI',
          hourlyRate: 0,
          hireDate: new Date().toISOString().slice(0, 10),
        },
      });

      // 5. Business settings — what /api/settings reads/writes. Without this, the
      // Paramètres page loads empty and the shop shows as "Fermé" to customers.
      await tx.setting.create({
        data: {
          key: `business-${org.id}`,
          value: JSON.stringify({
            name: restaurantName,
            address: address || '',
            city: city || '',
            postalCode: postalCode || '',
            phone: phone || '',
            email: (restaurantEmail || adminEmail).toLowerCase(),
            vatNumber: '',
            vatRate: 0.06,
            vatRateDrinks: 0.21,
            maxOrdersPerHour: 30,
            defaultDeliveryFee: 2.5,
            minOrderDelivery: 12,
            acceptingOrders: true,
            hours: [
              { day: 0, open: '11:00', close: '22:00', closed: true },
              { day: 1, open: '11:00', close: '22:00', closed: false },
              { day: 2, open: '11:00', close: '22:00', closed: false },
              { day: 3, open: '11:00', close: '22:00', closed: false },
              { day: 4, open: '11:00', close: '22:00', closed: false },
              { day: 5, open: '11:00', close: '23:00', closed: false },
              { day: 6, open: '11:00', close: '23:00', closed: false },
            ],
            deliveryZones: [],
            closedDates: [],
          }),
        },
      });

      return { org, location, user };
    });

    // ─── Send welcome email (async, don't block response) ───
    sendWelcomeEmail(result.user.email, result.org.name, result.org.slug).catch(() => {});

    // ─── Create token + return ───
    const token = createToken(
      result.user.id,
      result.user.role as any,
      result.user.locationId,
      result.user.organizationId
    );

    const { passwordHash: _, ...safeUser } = result.user;

    const responseData = {
      token,
      user: safeUser,
      organization: {
        id: result.org.id,
        name: result.org.name,
        slug: result.org.slug,
      },
    };

    // Set session cookie on .brizoapp.com
    const res = NextResponse.json(responseData);
    const host = req.headers.get('host') || '';
    const appDomain = env.NEXT_PUBLIC_APP_DOMAIN || env.APP_DOMAIN;
    const domain = appDomain && host.endsWith(appDomain) ? `.${appDomain}` : undefined;
    res.headers.set('Set-Cookie', buildSessionCookie(token, domain));
    return res;
  } catch (e: any) {
    console.error('Signup error:', e.message);
    return NextResponse.json({ error: 'signup_failed', message: 'Erreur lors de la création. Réessayez.' }, { status: 500 });
  }
}
