'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';
import { useLocation } from '@/contexts/LocationContext';

const PLATFORMS = [
  { name: 'uber_eats', label: 'Uber Eats', icon: '🟢', commission: 30 },
  { name: 'deliveroo', label: 'Deliveroo', icon: '🔵', commission: 25 },
  { name: 'just_eat', label: 'Just Eat', icon: '🟠', commission: 20 },
  { name: 'website', label: '2H Frites (site)', icon: '🍟', commission: 0 },
  { name: 'phone', label: 'Téléphone', icon: '📞', commission: 0 },
];

export default function ChannelsPage() {
  const { t } = useLanguage();
  const { locationId } = useLocation();
  const locParam = locationId ? `?locationId=${locationId}` : '';
  const [channels, setChannels] = useState<any[]>([]);

  const refresh = async () => { try { setChannels(await api.get<any[]>(`/channels${locParam}`)); } catch {} };
  useEffect(() => { refresh(); }, []);

  const addChannel = async (name: string, commission: number) => {
    await api.post('/channels', { action: 'create', data: { name, commission, active: true } });
    refresh();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">{t.ui.ch_title}</h1>

      <div className="space-y-3">
        {PLATFORMS.map((p) => {
          const existing = channels.find((c: any) => c.name === p.name);
          return (
            <div key={p.name} className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{p.icon}</span>
                <div>
                  <p className="text-sm font-bold text-white">{p.label}</p>
                  <p className="text-xs text-zinc-500">{t.ui.ch_commission}: {p.commission}%</p>
                </div>
              </div>
              {existing ? (
                <button onClick={() => api.post('/channels', { action: 'toggle', id: existing.id }).then(refresh)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${existing.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                  {existing.active ? '✓ Actif' : '✗ Inactif'}
                </button>
              ) : (
                <button onClick={() => addChannel(p.name, p.commission)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-medium">
                  + Connecter
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
        <p className="text-xs text-zinc-500">{t.ui.ch_hint}</p>
      </div>
    </div>
  );
}
