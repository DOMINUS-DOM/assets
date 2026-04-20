'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import Link from 'next/link';

interface AppNotification { id: string; type: string; title: string; message: string; read: boolean; createdAt: string; link?: string; }

const TYPE_EMOJI: Record<string, string> = { order: '📋', stock: '📦', staff: '👤', delivery: '🛵', system: '⚙️' };

export default function NotificationBell() {
  const { hasRole } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const data = await api.get<AppNotification[]>('/notifications');
        setNotifications(data.slice(0, 10));
        setUnread(data.filter((n) => !n.read).length);
      } catch {}
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handle = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handle);
    return () => document.removeEventListener('pointerdown', handle);
  }, []);

  if (!hasRole('patron', 'manager', 'employe')) return null;

  const timeAgo = (date: string) => {
    const mins = Math.round((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return t.ui.notif_now;
    if (mins < 60) return `${mins}min`;
    const hours = Math.round(mins / 60);
    return `${hours}h`;
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="relative w-10 h-10 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white transition-colors active:scale-95">
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center
            rounded-full bg-red-500 text-white text-[10px] font-bold px-1">{unread}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl z-50 animate-scale-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
            <span className="text-sm font-bold text-white">{t.ui.notif_title}</span>
            {unread > 0 && (
              <button onClick={async () => { await api.post('/notifications', { action: 'markAllRead' }); setNotifications((n) => n.map((x) => ({ ...x, read: true }))); setUnread(0); }}
                className="text-xs text-brand-light hover:text-amber-300">{t.ui.notif_markAll}</button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-8">{t.ui.notif_empty}</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id}
                onClick={async () => { await api.post('/notifications', { action: 'markRead', id: n.id }); setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x)); setUnread((u) => Math.max(0, u - 1)); setOpen(false); }}
                className={`px-4 py-3 border-b border-zinc-700/50 hover:bg-zinc-700/50 transition-colors cursor-pointer ${!n.read ? 'bg-zinc-700/20' : ''}`}>
                {n.link ? (
                  <Link href={n.link} className="block">
                    <div className="flex items-start gap-2">
                      <span className="text-sm mt-0.5">{TYPE_EMOJI[n.type]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-semibold ${n.read ? 'text-zinc-400' : 'text-white'}`}>{n.title}</p>
                          <span className="text-[10px] text-zinc-500 shrink-0 ml-2">{timeAgo(n.createdAt)}</span>
                        </div>
                        <p className="text-xs text-zinc-500 truncate">{n.message}</p>
                      </div>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-brand-light shrink-0 mt-1.5" />}
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-start gap-2">
                    <span className="text-sm mt-0.5">{TYPE_EMOJI[n.type]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-semibold ${n.read ? 'text-zinc-400' : 'text-white'}`}>{n.title}</p>
                        <span className="text-[10px] text-zinc-500 shrink-0 ml-2">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-xs text-zinc-500 truncate">{n.message}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-brand-light shrink-0 mt-1.5" />}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
