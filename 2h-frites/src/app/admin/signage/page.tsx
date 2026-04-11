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
  const { data: mediaList } = useApiData<any[]>(`/signage/media${locParam}`, []);

  const activeScreens = screens.filter((s) => s.status === 'active').length;
  const publishedContents = contents.filter((c) => c.status === 'published').length;

  // Build a map of screen -> playlist from schedules
  const getScreenPlaylist = (screenId: string) => {
    const schedule = schedules.find((s: any) => s.screenId === screenId && s.active);
    return schedule?.playlist || null;
  };

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
      emoji: '\uD83D\uDDBC\uFE0F',
      label: 'Mediatheque',
      count: mediaList.length,
      sub: `${mediaList.filter((m: any) => m.type === 'image').length} images, ${mediaList.filter((m: any) => m.type === 'video').length} videos`,
      href: '/admin/signage/media',
    },
    {
      emoji: '\uD83D\uDCC5',
      label: 'Programmation',
      count: schedules.length,
      sub: `${schedules.filter((s: any) => s.active).length} active${schedules.filter((s: any) => s.active).length > 1 ? 's' : ''}`,
      href: '/admin/signage/schedule',
    },
  ];

  // Recent screens (latest 3) with their assigned playlists
  const recentScreens = screens.slice(0, 3);

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

      {/* Built-in displays */}
      <div>
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Ecrans integres</h2>
        <p className="text-xs text-zinc-600 mb-3">Ecrans prets a l&apos;emploi, sans configuration necessaire.</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📺</span>
              <div>
                <p className="text-sm font-semibold text-white">Suivi des commandes</p>
                <p className="text-xs text-zinc-500">Commandes en preparation et pretes — ideal pour le comptoir</p>
              </div>
            </div>
            <a href={locationId ? `/display/orders?site=${locationId}` : '/display/orders'} target="_blank" rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 font-medium transition-colors shrink-0">
              Ouvrir &rarr;
            </a>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <div>
                <p className="text-sm font-semibold text-white">Menu dynamique</p>
                <p className="text-xs text-zinc-500">Rotation automatique des categories du menu avec prix</p>
              </div>
            </div>
            <a href="/display/menu" target="_blank" rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 font-medium transition-colors shrink-0">
              Ouvrir &rarr;
            </a>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🖥️</span>
              <div>
                <p className="text-sm font-semibold text-white">Portail d&apos;affichage</p>
                <p className="text-xs text-zinc-500">Page d&apos;accueil pour choisir le mode d&apos;affichage</p>
              </div>
            </div>
            <a href="/display" target="_blank" rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 font-medium transition-colors shrink-0">
              Ouvrir &rarr;
            </a>
          </div>
        </div>
      </div>

      {/* Custom screens */}
      {screens.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Ecrans personnalises</h2>
          <div className="space-y-2">
            {screens.map((screen: any) => {
              const playlist = getScreenPlaylist(screen.id);
              return (
                <div key={screen.id} className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📺</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">{screen.name}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          screen.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'
                        }`}>{screen.status}</span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        {playlist ? playlist.name : 'Aucune playlist'} — Code : {screen.code}
                      </p>
                    </div>
                  </div>
                  <a href={`/display/${screen.code}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 font-medium transition-colors shrink-0">
                    Ouvrir &rarr;
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Actions rapides</h2>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/signage/screens"
            className="px-4 py-2.5 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors"
          >
            + Creer un ecran
          </Link>
          <Link
            href="/admin/signage/content"
            className="px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm font-semibold hover:bg-zinc-700 hover:border-zinc-600 transition-colors"
          >
            + Creer un contenu
          </Link>
        </div>
      </div>

    </div>
  );
}
