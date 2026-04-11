'use client';

import { useState, useEffect } from 'react';
import { ApplicationStatus } from '@/types/order';
import { api } from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';
import { useLocation } from '@/contexts/LocationContext';

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  new: 'bg-blue-500/15 text-blue-400', contacted: 'bg-amber-500/15 text-amber-400',
  accepted: 'bg-emerald-500/15 text-emerald-400', rejected: 'bg-red-500/15 text-red-400',
};

const STATUS_KEYS: Record<ApplicationStatus, string> = {
  new: 'admin_statusNew', contacted: 'admin_statusContacted', accepted: 'admin_statusAccepted', rejected: 'admin_statusRejected',
};

export default function RecruitmentPage() {
  const [apps, setApps] = useState<any[]>([]);
  const { t } = useLanguage();
  const { locationId } = useLocation();
  const locParam = locationId ? `?locationId=${locationId}` : '';

  const refresh = async () => { try { const d = await api.get<{ applications: any[] }>(`/drivers${locParam}`); setApps(d.applications); } catch {} };
  useEffect(() => { refresh(); }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">{t.ui.admin_driverApps}</h1>
      <div className="space-y-3">
        {apps.map((a) => (
          <div key={a.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-white">{a.name}</h3>
                <p className="text-xs text-zinc-400">{a.phone} — {a.email}</p>
                <p className="text-xs text-zinc-500 mt-1">📍 {a.city} — 🚗 {a.transport}</p>
                <p className="text-xs text-zinc-500">🕐 {a.availability}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${(STATUS_COLORS as any)[a.status]}`}>
                {t.ui[(STATUS_KEYS as any)[a.status]]}
              </span>
            </div>
            <div className="flex gap-2 mt-3">
              {(['new', 'contacted', 'accepted', 'rejected'] as ApplicationStatus[]).map((s) => (
                <button key={s} onClick={() => api.post('/drivers', { action: 'updateApplicationStatus', id: a.id, status: s }).then(refresh)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${a.status === s ? STATUS_COLORS[s] : 'bg-zinc-800 text-zinc-600 hover:text-zinc-400'}`}>
                  {t.ui[STATUS_KEYS[s]]}
                </button>
              ))}
            </div>
          </div>
        ))}
        {apps.length === 0 && <p className="text-center text-zinc-500 py-8 text-sm">{t.ui.admin_noApps}</p>}
      </div>
    </div>
  );
}
