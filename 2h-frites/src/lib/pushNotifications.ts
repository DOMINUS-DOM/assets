// Web Push Notifications — register and send
// In production: use web-push library + VAPID keys

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;

  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export function sendLocalNotification(title: string, body: string, icon?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  new Notification(title, {
    body,
    icon: icon || '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'order-update',
  });
}

// Trigger notifications for order status changes
export function notifyOrderStatus(orderNumber: string, status: string) {
  const messages: Record<string, { title: string; body: string }> = {
    preparing: { title: '👨‍🍳 En préparation', body: `Commande ${orderNumber} — on prépare vos frites !` },
    ready: { title: '✅ Commande prête !', body: `Commande ${orderNumber} — venez la chercher !` },
    delivering: { title: '🛵 En livraison', body: `Commande ${orderNumber} — votre livreur est en route !` },
    delivered: { title: '📦 Livrée !', body: `Commande ${orderNumber} — bon appétit ! 🍟` },
  };

  const msg = messages[status];
  if (msg) sendLocalNotification(msg.title, msg.body);
}
