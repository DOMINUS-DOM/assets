import { PrismaClient } from '@prisma/client';
import * as bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();
function hash(password: string) { return bcryptjs.hashSync(password, 10); }

async function main() {
  console.log('Seeding multi-location database...');

  // ─── Locations ───
  const loc1 = await prisma.location.create({ data: {
    name: '2H Frites — La Louvière Centre', slug: 'la-louviere-centre',
    address: 'Rue de la Chaussée 42', city: 'La Louvière', postalCode: '7100',
    phone: '+32 64 00 00 01', email: 'centre@2hfrites.be', lat: 50.479, lng: 4.186,
    settingsJson: JSON.stringify({ vatRate: 0.06, vatRateDrinks: 0.21, defaultDeliveryFee: 2.50, minOrderDelivery: 12, maxOrdersPerHour: 30, acceptingOrders: true }),
  }});

  const loc2 = await prisma.location.create({ data: {
    name: '2H Frites — Manage', slug: 'manage',
    address: 'Place Albert 1er 8', city: 'Manage', postalCode: '7170',
    phone: '+32 64 00 00 02', email: 'manage@2hfrites.be', lat: 50.503, lng: 4.234,
    settingsJson: JSON.stringify({ vatRate: 0.06, vatRateDrinks: 0.21, defaultDeliveryFee: 3.00, minOrderDelivery: 15, maxOrdersPerHour: 20, acceptingOrders: true }),
  }});

  // ─── Users with franchise roles ───
  const admin = await prisma.user.create({ data: { email: 'patron@2hfrites.be', passwordHash: hash('patron123'), name: 'Hassan B.', phone: '+32 470 000 001', role: 'franchisor_admin' } });
  const owner1 = await prisma.user.create({ data: { email: 'manager@2hfrites.be', passwordHash: hash('manager123'), name: 'Fatima L.', phone: '+32 470 000 002', role: 'location_manager', locationId: loc1.id } });
  const emp1 = await prisma.user.create({ data: { email: 'employe@2hfrites.be', passwordHash: hash('employe123'), name: 'Youssef K.', phone: '+32 470 000 003', role: 'employe', locationId: loc1.id } });
  const drv1u = await prisma.user.create({ data: { email: 'karim@2hfrites.be', passwordHash: hash('livreur123'), name: 'Karim B.', phone: '+32 470 123 456', role: 'livreur', locationId: loc1.id } });
  const drv2u = await prisma.user.create({ data: { email: 'sophie@2hfrites.be', passwordHash: hash('livreur123'), name: 'Sophie M.', phone: '+32 471 234 567', role: 'livreur', locationId: loc2.id } });
  await prisma.user.create({ data: { email: 'client@2hfrites.be', passwordHash: hash('client123'), name: 'Martin D.', phone: '+32 475 111 000', role: 'client' } });

  // ─── Employees ───
  for (const u of [admin, owner1, emp1, drv1u, drv2u]) {
    const pos = u.role === 'livreur' ? 'livreur' : u.role === 'employe' ? 'cuisine' : 'manager';
    const rate = u.role === 'franchisor_admin' ? 18 : u.role === 'location_manager' ? 15 : u.role === 'employe' ? 13.5 : 12;
    await prisma.employee.create({
      data: { userId: u.id, locationId: u.locationId, name: u.name, phone: u.phone, email: u.email, position: pos, contractType: u.role === 'livreur' ? 'freelance' : 'cdi', hourlyRate: rate, hireDate: '2024-01-15' },
    });
  }

  // ─── Drivers ───
  const drv1 = await prisma.driver.create({ data: { userId: drv1u.id, locationId: loc1.id, name: 'Karim B.', phone: '+32 470 123 456', email: 'karim@2hfrites.be', contractType: 'freelance', zone: 'La Louvière', ratePerDelivery: 3.5, bonusRate: 0.5 } });
  await prisma.driver.create({ data: { userId: drv2u.id, locationId: loc2.id, name: 'Sophie M.', phone: '+32 471 234 567', email: 'sophie@2hfrites.be', contractType: 'freelance', zone: 'Manage', ratePerDelivery: 3.5 } });

  // ─── Demo Orders (location 1) ───
  await prisma.order.create({ data: {
    orderNumber: 'ORD-001', locationId: loc1.id, type: 'delivery', status: 'delivering',
    customerName: 'Martin D.', customerPhone: '+32 475 111 000',
    deliveryStreet: 'Rue de la Station 12', deliveryCity: 'La Louvière', deliveryPostal: '7100',
    paymentMethod: 'on_delivery', total: 15.40, driverId: drv1.id,
    items: { create: [
      { menuItemId: 'frites', name: 'Frites', price: 3.80, quantity: 2, sizeKey: 'moyen', categoryId: 'frites' },
      { menuItemId: 'fricadelle', name: 'Fricadelle', price: 3.00, quantity: 2, categoryId: 'viandes' },
    ]},
    statusHistory: { create: [{ status: 'received' }, { status: 'preparing' }, { status: 'ready' }, { status: 'delivering' }] },
  }});

  await prisma.order.create({ data: {
    orderNumber: 'ORD-002', locationId: loc1.id, type: 'pickup', status: 'preparing',
    customerName: 'Léa C.', customerPhone: '+32 476 222 000', pickupTime: '19:15',
    paymentMethod: 'on_pickup', total: 10.00,
    items: { create: [{ menuItemId: 'magic_box', name: 'Magic Box', price: 7.50, quantity: 1, categoryId: 'magic_box' }] },
    statusHistory: { create: [{ status: 'received' }, { status: 'preparing' }] },
  }});

  // ─── Inventory (location 1) ───
  await prisma.supplier.create({ data: { name: 'Claes Frites', phone: '+32 64 111 222', email: 'info@claesfrites.be', notes: 'Livraison mardi et vendredi' } });
  await prisma.ingredient.create({ data: { locationId: loc1.id, name: 'Pommes de terre', unit: 'kg', currentStock: 120, minStock: 50, costPerUnit: 0.80, category: 'frites' } });
  await prisma.ingredient.create({ data: { locationId: loc1.id, name: 'Steak haché 100g', unit: 'pièces', currentStock: 15, minStock: 20, costPerUnit: 1.20, category: 'viandes', expiryDate: '2026-04-12' } });

  // ─── Notifications ───
  await prisma.notification.create({ data: { locationId: loc1.id, type: 'order', title: 'Nouvelle commande', message: 'ORD-002 — Léa C. (retrait)', link: '/admin/orders' } });
  await prisma.notification.create({ data: { locationId: loc1.id, type: 'stock', title: 'Stock bas', message: 'Steak haché: 15 restants (min: 20)', link: '/admin/inventory' } });

  // ─── Settings (global) ───
  await prisma.setting.create({ data: { key: 'business', value: JSON.stringify({
    name: 'Les Deux Haine — 2H Frites Artisanales', address: 'La Louvière, Belgique',
    phone: '+32 64 00 00 00', email: 'contact@2hfrites.be', vatNumber: 'BE0123.456.789',
    royaltyRate: 0.05,
  })}});

  // ─── Pay Period ───
  await prisma.payPeriod.create({ data: { locationId: loc1.id, label: 'Semaine 15 — Avril 2026', startDate: '2026-04-07', endDate: '2026-04-13' } });

  // ─── Audit Log samples ───
  await prisma.auditLog.create({ data: { locationId: loc1.id, userId: admin.id, action: 'create', entity: 'Location', entityId: loc1.id, changes: '{"name":"2H Frites — La Louvière Centre"}' } });
  await prisma.auditLog.create({ data: { locationId: loc2.id, userId: admin.id, action: 'create', entity: 'Location', entityId: loc2.id, changes: '{"name":"2H Frites — Manage"}' } });

  console.log('Seed complete! 2 locations, 6 users, 2 orders, 2 drivers.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
