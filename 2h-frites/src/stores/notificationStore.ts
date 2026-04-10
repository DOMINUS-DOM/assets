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
function genId() { return `notif-${Date.now()}-${++counter}`; }

let notifications: AppNotification[] = [];
let loaded = false;
let listeners: (() => void)[] = [];
function notify() { listeners.forEach((l) => l()); }

function loadFromApi() {
  if (loaded) return;
  loaded = true;
  fetch('/api/notifications')
    .then((r) => r.json())
    .then((data: any[]) => {
      if (Array.isArray(data) && data.length > 0) {
        notifications = data;
        notify();
      }
    })
    .catch(() => {});
}

export const notificationStore = {
  subscribe(listener: () => void) {
    loadFromApi();
    listeners.push(listener);
    return () => { listeners = listeners.filter((l) => l !== listener); };
  },

  getAll: () => { loadFromApi(); return notifications; },
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
