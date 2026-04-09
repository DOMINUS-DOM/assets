import { Order, OrderStatus, StatusEntry, CartItem, Customer, DeliveryAddress, Payment, Driver, DriverApplication, ApplicationStatus } from '@/types/order';

// ─── Helpers ───
let counter = 100;
function genId(prefix: string) { return `${prefix}-${++counter}`; }
function now() { return new Date().toISOString(); }

// ─── Demo Data ───
const DEMO_DRIVERS: Driver[] = [
  { id: 'drv-1', name: 'Karim B.', phone: '+32 470 123 456', email: 'karim@2hfrites.be', active: true, contractType: 'freelance', zone: 'La Louvière', notes: '', ratePerDelivery: 3.50, bonusRate: 0.50 },
  { id: 'drv-2', name: 'Sophie M.', phone: '+32 471 234 567', email: 'sophie@2hfrites.be', active: true, contractType: 'freelance', zone: 'Haine-Saint-Paul', notes: 'Disponible le soir', ratePerDelivery: 3.50, bonusRate: 0 },
  { id: 'drv-3', name: 'Lucas D.', phone: '+32 472 345 678', email: 'lucas@2hfrites.be', active: false, contractType: 'étudiant', zone: 'La Louvière', notes: 'En pause examen', ratePerDelivery: 3.00, bonusRate: 0 },
];

const DEMO_APPLICATIONS: DriverApplication[] = [
  { id: 'app-1', name: 'Ahmed K.', phone: '+32 473 111 222', email: 'ahmed.k@mail.be', city: 'Manage', transport: 'Scooter', availability: 'Soir et week-end', status: 'new', createdAt: '2026-04-07T14:00:00Z' },
  { id: 'app-2', name: 'Julie V.', phone: '+32 474 222 333', email: 'julie.v@mail.be', city: 'La Louvière', transport: 'Voiture', availability: 'Temps plein', status: 'contacted', createdAt: '2026-04-05T10:30:00Z' },
];

function createDemoOrders(): Order[] {
  const base = '2026-04-09T';
  return [
    {
      id: 'ORD-001', type: 'delivery', status: 'delivering',
      customer: { name: 'Martin D.', phone: '+32 475 111 000' },
      deliveryAddress: { street: 'Rue de la Station 12', city: 'La Louvière', postalCode: '7100', instructions: '2ème étage' },
      items: [
        { menuItemId: 'frites', name: 'Frites', price: 3.80, quantity: 2, sizeKey: 'moyen', categoryId: 'frites' },
        { menuItemId: 'fricadelle', name: 'Fricadelle', price: 3.00, quantity: 2, categoryId: 'viandes' },
        { menuItemId: 'sauce_samourai', name: 'Samouraï', price: 0.90, quantity: 2, categoryId: 'sauces' },
      ],
      payment: { method: 'on_delivery', status: 'pending' }, total: 15.40, driverId: 'drv-1',
      createdAt: base + '18:30:00Z',
      statusHistory: [
        { status: 'received', at: base + '18:30:00Z' },
        { status: 'preparing', at: base + '18:32:00Z' },
        { status: 'ready', at: base + '18:45:00Z' },
        { status: 'delivering', at: base + '18:48:00Z' },
      ],
    },
    {
      id: 'ORD-002', type: 'pickup', status: 'preparing',
      customer: { name: 'Léa C.', phone: '+32 476 222 000' },
      pickupTime: '19:15',
      items: [
        { menuItemId: 'magic_box', name: 'Magic Box', price: 7.50, quantity: 1, categoryId: 'magic_box' },
        { menuItemId: 'coca_cola', name: 'Coca-Cola', price: 2.50, quantity: 1, categoryId: 'boissons' },
      ],
      payment: { method: 'on_pickup', status: 'pending' }, total: 10.00,
      createdAt: base + '19:00:00Z',
      statusHistory: [
        { status: 'received', at: base + '19:00:00Z' },
        { status: 'preparing', at: base + '19:02:00Z' },
      ],
    },
    {
      id: 'ORD-003', type: 'delivery', status: 'received',
      customer: { name: 'Thomas R.', phone: '+32 477 333 000', email: 'thomas@mail.be' },
      deliveryAddress: { street: 'Av. de la Reine 45', city: 'Haine-Saint-Paul', postalCode: '7100' },
      items: [
        { menuItemId: 'double_beef_burger_pr', name: 'Double beef burger', price: 9.00, quantity: 1, categoryId: 'pains_ronds' },
        { menuItemId: 'frites', name: 'Frites', price: 4.50, quantity: 1, sizeKey: 'grand', categoryId: 'frites' },
        { menuItemId: 'sauce_andalouse', name: 'Andalouse', price: 0.90, quantity: 1, categoryId: 'sauces' },
        { menuItemId: 'desperados', name: 'Desperados', price: 3.20, quantity: 2, categoryId: 'boissons' },
      ],
      payment: { method: 'online', status: 'paid' }, total: 20.80,
      createdAt: base + '19:10:00Z',
      statusHistory: [{ status: 'received', at: base + '19:10:00Z' }],
    },
    {
      id: 'ORD-004', type: 'pickup', status: 'delivered',
      customer: { name: 'Clara W.', phone: '+32 478 444 000' },
      items: [
        { menuItemId: 'tacos', name: 'Tacos', price: 5.50, quantity: 2, categoryId: 'viandes' },
      ],
      payment: { method: 'on_pickup', status: 'paid' }, total: 11.00,
      createdAt: base + '17:00:00Z',
      statusHistory: [
        { status: 'received', at: base + '17:00:00Z' },
        { status: 'preparing', at: base + '17:02:00Z' },
        { status: 'ready', at: base + '17:15:00Z' },
        { status: 'picked_up', at: base + '17:25:00Z' },
      ],
    },
    {
      id: 'ORD-005', type: 'delivery', status: 'delivered',
      customer: { name: 'Nour A.', phone: '+32 479 555 000' },
      deliveryAddress: { street: 'Rue Kéramis 8', city: 'La Louvière', postalCode: '7100' },
      items: [
        { menuItemId: 'hamburger_pr', name: 'Hamburger', price: 4.00, quantity: 3, categoryId: 'pains_ronds' },
        { menuItemId: 'frites', name: 'Frites', price: 4.50, quantity: 2, sizeKey: 'grand', categoryId: 'frites' },
        { menuItemId: 'sauce_mayonnaise', name: 'Mayonnaise', price: 0.90, quantity: 3, categoryId: 'sauces' },
      ],
      payment: { method: 'on_delivery', status: 'paid' }, total: 23.70, driverId: 'drv-2',
      createdAt: base + '12:30:00Z',
      statusHistory: [
        { status: 'received', at: base + '12:30:00Z' },
        { status: 'preparing', at: base + '12:32:00Z' },
        { status: 'ready', at: base + '12:50:00Z' },
        { status: 'delivering', at: base + '12:55:00Z' },
        { status: 'delivered', at: base + '13:15:00Z' },
      ],
    },
  ];
}

// ─── Stores ───
let orders: Order[] = createDemoOrders();
let drivers: Driver[] = [...DEMO_DRIVERS];
let applications: DriverApplication[] = [...DEMO_APPLICATIONS];
let listeners: (() => void)[] = [];

function notify() { listeners.forEach((l) => l()); }

export const store = {
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => { listeners = listeners.filter((l) => l !== listener); };
  },

  // ─── Orders ───
  getOrders: () => orders,
  getOrder: (id: string) => orders.find((o) => o.id === id),
  createOrder(data: Omit<Order, 'id' | 'createdAt' | 'statusHistory' | 'status'>): Order {
    const order: Order = {
      ...data,
      id: 'ORD-' + String(++counter).padStart(3, '0'),
      status: 'received',
      createdAt: now(),
      statusHistory: [{ status: 'received', at: now() }],
    };
    orders = [order, ...orders];
    notify();
    return order;
  },
  updateOrderStatus(id: string, status: OrderStatus) {
    orders = orders.map((o) =>
      o.id === id ? { ...o, status, statusHistory: [...o.statusHistory, { status, at: now() }] } : o
    );
    notify();
  },
  assignDriver(orderId: string, driverId: string) {
    orders = orders.map((o) => (o.id === orderId ? { ...o, driverId } : o));
    notify();
  },
  updatePaymentStatus(id: string, status: 'pending' | 'paid') {
    orders = orders.map((o) => (o.id === id ? { ...o, payment: { ...o.payment, status } } : o));
    notify();
  },

  // ─── Drivers ───
  getDrivers: () => drivers,
  getDriver: (id: string) => drivers.find((d) => d.id === id),
  addDriver(data: Omit<Driver, 'id'>): Driver {
    const driver: Driver = { ...data, id: genId('drv') };
    drivers = [...drivers, driver];
    notify();
    return driver;
  },
  updateDriver(id: string, data: Partial<Driver>) {
    drivers = drivers.map((d) => (d.id === id ? { ...d, ...data } : d));
    notify();
  },
  toggleDriverActive(id: string) {
    drivers = drivers.map((d) => (d.id === id ? { ...d, active: !d.active } : d));
    notify();
  },

  // ─── Applications ───
  getApplications: () => applications,
  addApplication(data: Omit<DriverApplication, 'id' | 'createdAt' | 'status'>): DriverApplication {
    const app: DriverApplication = { ...data, id: genId('app'), status: 'new', createdAt: now() };
    applications = [app, ...applications];
    notify();
    return app;
  },
  updateApplicationStatus(id: string, status: ApplicationStatus) {
    applications = applications.map((a) => (a.id === id ? { ...a, status } : a));
    notify();
  },
};
