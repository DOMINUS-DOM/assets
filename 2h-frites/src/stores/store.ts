import { Order, OrderStatus, StatusEntry, CartItem, Customer, DeliveryAddress, Payment, Driver, DriverApplication, ApplicationStatus } from '@/types/order';

// ─── Helpers ───
let counter = 100;
function genId(prefix: string) { return `${prefix}-${++counter}`; }
function now() { return new Date().toISOString(); }

// ─── Stores (load from API, no hardcoded demo data) ───
let orders: Order[] = [];
let drivers: Driver[] = [];
let applications: DriverApplication[] = [];
let loaded = false;

function loadFromApi() {
  if (loaded) return;
  loaded = true;
  fetch('/api/orders').then((r) => r.json()).then((data: any[]) => {
    if (Array.isArray(data)) { orders = data; notify(); }
  }).catch(() => {});
  fetch('/api/drivers').then((r) => r.json()).then((data: any) => {
    if (data?.drivers) { drivers = data.drivers; notify(); }
    if (data?.applications) { applications = data.applications; notify(); }
  }).catch(() => {});
}
let listeners: (() => void)[] = [];

function notify() { listeners.forEach((l) => l()); }

export const store = {
  subscribe(listener: () => void) {
    loadFromApi();
    listeners.push(listener);
    return () => { listeners = listeners.filter((l) => l !== listener); };
  },

  // ─── Orders ───
  getOrders: () => { loadFromApi(); return orders; },
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
