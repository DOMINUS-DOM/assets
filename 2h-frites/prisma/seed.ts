import { PrismaClient } from '@prisma/client';
import * as bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function hash(password: string) {
  return bcryptjs.hashSync(password, 10);
}

async function main() {
  console.log('Seeding database...');

  // ─── Users ───
  const users = await Promise.all([
    prisma.user.create({ data: { email: 'patron@2hfrites.be', passwordHash: await hash('patron123'), name: 'Hassan B.', phone: '+32 470 000 001', role: 'patron' } }),
    prisma.user.create({ data: { email: 'manager@2hfrites.be', passwordHash: await hash('manager123'), name: 'Fatima L.', phone: '+32 470 000 002', role: 'manager' } }),
    prisma.user.create({ data: { email: 'employe@2hfrites.be', passwordHash: await hash('employe123'), name: 'Youssef K.', phone: '+32 470 000 003', role: 'employe' } }),
    prisma.user.create({ data: { email: 'karim@2hfrites.be', passwordHash: await hash('livreur123'), name: 'Karim B.', phone: '+32 470 123 456', role: 'livreur' } }),
    prisma.user.create({ data: { email: 'sophie@2hfrites.be', passwordHash: await hash('livreur123'), name: 'Sophie M.', phone: '+32 471 234 567', role: 'livreur' } }),
    prisma.user.create({ data: { email: 'client@2hfrites.be', passwordHash: await hash('client123'), name: 'Martin D.', phone: '+32 475 111 000', role: 'client' } }),
  ]);

  // ─── Employees ───
  const today = new Date().toISOString().slice(0, 10);
  for (const u of users.filter(u => u.role !== 'client')) {
    const pos = u.role === 'livreur' ? 'livreur' : u.role === 'employe' ? 'cuisine' : 'manager';
    const rate = u.role === 'patron' ? 18 : u.role === 'manager' ? 15 : u.role === 'employe' ? 13.5 : 12;
    const ct = u.role === 'livreur' ? 'freelance' : 'cdi';
    await prisma.employee.create({
      data: { userId: u.id, name: u.name, phone: u.phone, email: u.email, position: pos, contractType: ct, hourlyRate: rate, hireDate: '2024-01-15', active: true },
    });
  }

  // ─── Drivers ───
  const drv1 = await prisma.driver.create({ data: { userId: users[3].id, name: 'Karim B.', phone: '+32 470 123 456', email: 'karim@2hfrites.be', contractType: 'freelance', zone: 'La Louvière', ratePerDelivery: 3.5, bonusRate: 0.5 } });
  await prisma.driver.create({ data: { userId: users[4].id, name: 'Sophie M.', phone: '+32 471 234 567', email: 'sophie@2hfrites.be', contractType: 'freelance', zone: 'Haine-Saint-Paul', ratePerDelivery: 3.5 } });

  // ─── Demo Order ───
  await prisma.order.create({
    data: {
      orderNumber: 'ORD-001', type: 'delivery', status: 'delivering',
      customerName: 'Martin D.', customerPhone: '+32 475 111 000',
      deliveryStreet: 'Rue de la Station 12', deliveryCity: 'La Louvière', deliveryPostal: '7100', deliveryNotes: '2ème étage',
      paymentMethod: 'on_delivery', paymentStatus: 'pending', total: 15.40, driverId: drv1.id,
      items: { create: [
        { menuItemId: 'frites', name: 'Frites', price: 3.80, quantity: 2, sizeKey: 'moyen', categoryId: 'frites' },
        { menuItemId: 'fricadelle', name: 'Fricadelle', price: 3.00, quantity: 2, categoryId: 'viandes' },
        { menuItemId: 'sauce_samourai', name: 'Samouraï', price: 0.90, quantity: 2, categoryId: 'sauces' },
      ]},
      statusHistory: { create: [
        { status: 'received', at: new Date(Date.now() - 3600000) },
        { status: 'preparing', at: new Date(Date.now() - 3000000) },
        { status: 'ready', at: new Date(Date.now() - 1800000) },
        { status: 'delivering', at: new Date(Date.now() - 600000) },
      ]},
    },
  });

  await prisma.order.create({
    data: {
      orderNumber: 'ORD-002', type: 'pickup', status: 'preparing',
      customerName: 'Léa C.', customerPhone: '+32 476 222 000', pickupTime: '19:15',
      paymentMethod: 'on_pickup', paymentStatus: 'pending', total: 10.00,
      items: { create: [
        { menuItemId: 'magic_box', name: 'Magic Box', price: 7.50, quantity: 1, categoryId: 'magic_box' },
        { menuItemId: 'coca_cola', name: 'Coca-Cola', price: 2.50, quantity: 1, categoryId: 'boissons' },
      ]},
      statusHistory: { create: [
        { status: 'received', at: new Date(Date.now() - 1200000) },
        { status: 'preparing', at: new Date(Date.now() - 900000) },
      ]},
    },
  });

  // ─── Inventory ───
  const sup1 = await prisma.supplier.create({ data: { name: 'Claes Frites', phone: '+32 64 111 222', email: 'info@claesfrites.be', notes: 'Livraison mardi et vendredi' } });
  await prisma.supplier.create({ data: { name: 'Vandemoortele', phone: '+32 64 333 444', email: 'commandes@vdm.be', notes: 'Sauces et surgelés' } });

  await prisma.ingredient.create({ data: { name: 'Pommes de terre', unit: 'kg', currentStock: 120, minStock: 50, costPerUnit: 0.80, supplierId: sup1.id, category: 'frites' } });
  await prisma.ingredient.create({ data: { name: 'Huile de friture', unit: 'L', currentStock: 40, minStock: 20, costPerUnit: 2.10, category: 'frites' } });
  await prisma.ingredient.create({ data: { name: 'Steak haché 100g', unit: 'pièces', currentStock: 15, minStock: 20, costPerUnit: 1.20, category: 'viandes', expiryDate: '2026-04-12' } });

  // ─── Notifications ───
  await prisma.notification.create({ data: { type: 'order', title: 'Nouvelle commande', message: 'ORD-002 — Léa C. (retrait)', link: '/admin/orders' } });
  await prisma.notification.create({ data: { type: 'stock', title: 'Stock bas', message: 'Steak haché 100g : 15 restants (min: 20)', link: '/admin/inventory' } });

  // ─── Settings ───
  await prisma.setting.create({ data: { key: 'business', value: JSON.stringify({
    name: 'Les Deux Haine — 2H Frites Artisanales', address: 'La Louvière, Belgique',
    phone: '+32 64 00 00 00', email: 'contact@2hfrites.be', vatNumber: 'BE0123.456.789',
    vatRate: 0.06, vatRateDrinks: 0.21, defaultDeliveryFee: 2.50, minOrderDelivery: 12, maxOrdersPerHour: 30, acceptingOrders: true,
  })}});

  // ─── Pay Period ───
  await prisma.payPeriod.create({ data: { label: 'Semaine 15 — Avril 2026', startDate: '2026-04-07', endDate: '2026-04-13', status: 'draft' } });

  console.log('Seed complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
