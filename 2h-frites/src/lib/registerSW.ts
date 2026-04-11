export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });

  // When back online, flush queued orders
  window.addEventListener('online', () => {
    navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage('FLUSH_OFFLINE_QUEUE');
    });
  });

  // Listen for synced offline orders
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'OFFLINE_ORDER_SYNCED') {
      console.log('[SW] Offline order synced:', event.data.url);
    }
  });
}
