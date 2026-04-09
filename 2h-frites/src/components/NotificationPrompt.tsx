'use client';

import { useState, useEffect } from 'react';
import { requestNotificationPermission } from '@/lib/pushNotifications';
import { useLanguage } from '@/i18n/LanguageContext';

export default function NotificationPrompt() {
  const { t } = useLanguage();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'default') return;

    // Show prompt after 10 seconds
    const timer = setTimeout(() => {
      try {
        if (localStorage.getItem('2h-notif-dismissed')) return;
      } catch {}
      setShow(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  if (!show || dismissed) return null;

  const handleAllow = async () => {
    await requestNotificationPermission();
    setShow(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShow(false);
    try { localStorage.setItem('2h-notif-dismissed', 'true'); } catch {}
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 max-w-lg mx-auto z-50 animate-slide-up">
      <div className="p-4 rounded-2xl bg-zinc-900 border border-amber-500/20 shadow-lg shadow-black/50">
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5">🔔</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{t.ui.push_title}</p>
            <p className="text-xs text-zinc-400 mt-1">{t.ui.push_desc}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={handleAllow}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm active:scale-95">
            {t.ui.push_allow}
          </button>
          <button onClick={handleDismiss}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 text-sm">
            {t.ui.push_later}
          </button>
        </div>
      </div>
    </div>
  );
}
