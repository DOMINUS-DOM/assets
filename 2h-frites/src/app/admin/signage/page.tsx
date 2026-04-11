'use client';

import { useLocation } from '@/contexts/LocationContext';
import { useApiData } from '@/hooks/useApiData';
import Link from 'next/link';

export default function SignageDashboard() {
  const { locationId } = useLocation();
  const locParam = locationId ? `?locationId=${locationId}` : '';

  const { data: screens } = useApiData<any[]>(`/signage/screens${locParam}`, []);
  const { data: contents } = useApiData<any[]>(`/signage/content${locParam}`, []);
  const { data: playlists } = useApiData<any[]>(`/signage/playlists${locParam}`, []);
  const { data: schedules } = useApiData<any[]>(`/signage/schedule${locParam}`, []);

  const activeScreens = screens.filter((s) => s.status === 'active').length;
  const publishedContents = contents.filter((c) => c.status === 'published').length;

  const cards = [
    {
      emoji: '\uD83D\uDCFA',
      label: 'Ecrans',
      count: screens.length,
      sub: `${activeScreens} actif${activeScreens > 1 ? 's' : ''}`,
      href: '/admin/signage/screens',
    },
    {
      emoji: '\uD83C\uDFAC',
      label: 'Contenus',
      count: contents.length,
      sub: `${publishedContents} publie${publishedContents > 1 ? 's' : ''}`,
      href: '/admin/signage/content',
    },
    {
      emoji: '\uD83D\uDCCB',
      label: 'Playlists',
      count: playlists.length,
      sub: `${playlists.filter((p: any) => p.status === 'active').length} active${playlists.filter((p: any) => p.status === 'active').length > 1 ? 's' : ''}`,
      href: '/admin/signage/playlists',
    },
    {
      emoji: '\uD83D\uDCC5',
      label: 'Programmation',
      count: schedules.length,
      sub: `${schedules.filter((s: any) => s.active).length} active${schedules.filter((s: any) => s.active).length > 1 ? 's' : ''}`,
      href: '/admin/signage/schedule',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Affichage dynamique</h1>
      <p className="text-sm text-zinc-500">Gerez vos ecrans, contenus et programmations d&apos;affichage.</p>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 hover:border-amber-500/30 transition-colors group"
          >
            <span className="text-2xl">{card.emoji}</span>
            <p className="text-2xl font-extrabold text-white mt-2">{card.count}</p>
            <p className="text-sm font-semibold text-zinc-300 mt-1">{card.label}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{card.sub}</p>
          </Link>
        ))}
      </div>

      {screens.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Statut des ecrans</h2>
          <div className="space-y-2">
            {screens.slice(0, 5).map((screen: any) => (
              <div
                key={screen.id}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{screen.name}</p>
                  <p className="text-xs text-zinc-500">{screen.resolution} - {screen.orientation}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    screen.status === 'active'
                      ? 'bg-green-500/20 text-green-400'
                      : screen.status === 'offline'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {screen.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
