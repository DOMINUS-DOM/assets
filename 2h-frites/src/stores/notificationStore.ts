export type NotificationType = 'order' | 'stock' | 'staff' | 'delivery' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

let counter = 1000;
function genId() { return `notif-${++counter}`; }

const DEMO_NOTIFICATIONS: AppNotification[] = [
  { id: 'notif-1', type: 'order', title: 'Nouvelle commande', message: 'ORD-003 — Thomas R. (livraison)', read: false, createdAt: new Date().toISOString(), link: '/admin/orders/detail?id=ORD-003' },
  { id: 'notif-2', type: 'stock', title: 'Stock bas', message: 'Steak haché 100g : 15 restants (min: 20)', read: false, createdAt: new Date().toISOString(), link: '/admin/inventory' },
  { id: 'notif-3', type: 'staff', title: 'Demande de congé', message: 'Youssef K. demande des vacances du 21 au 25 avril', read: true, createdAt: new Date(Date.now() - 3600000).toISOString(), link: '/admin/staff' },
  { id: 'notif-4', type: 'delivery', title: 'Livraison terminée', message: 'ORD-005 livrée par Sophie M.', read: true, createdAt: new Date(Date.now() - 7200000).toISOString() },
];

let notifications: AppNotification[] = [...DEMO_NOTIFICATIONS];
let listeners: (() => void)[] = [];
function notify() { listeners.forEach((l) => l()); }

export const notificationStore = {
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => { listeners = listeners.filter((l) => l !== listener); };
  },

  getAll: () => notifications,
  getUnread: () => notifications.filter((n) => !n.read),
  getUnreadCount: () => notifications.filter((n) => !n.read).length,

  add(data: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) {
    const notif: AppNotification = { ...data, id: genId(), read: false, createdAt: new Date().toISOString() };
    notifications = [notif, ...notifications];
    notify();
  },

  markRead(id: string) {
    notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    notify();
  },

  markAllRead() {
    notifications = notifications.map((n) => ({ ...n, read: true }));
    notify();
  },

  clear() {
    notifications = [];
    notify();
  },
};
