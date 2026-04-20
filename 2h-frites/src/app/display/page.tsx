'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Location {
  id: string;
  name: string;
  slug: string;
}

export default function DisplayHomePage() {
  const [time, setTime] = useState(new Date());
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('');

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    api.get<any>('/locations').then((data) => {
      const locs = Array.isArray(data) ? data : data?.locations || [];
      setLocations(locs);
      if (locs.length > 0) setSelectedSite(locs[0].id);
    }).catch(() => {});
  }, []);

  const siteParam = selectedSite ? `?site=${selectedSite}` : '';

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center cursor-auto">
      <div className="text-center space-y-8 max-w-xl mx-auto px-8">
        {/* Logo */}
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Restaurant" className="h-24 w-auto mx-auto mb-2" />
          <p className="text-zinc-500 text-sm mt-2">Affichage dynamique</p>
        </div>

        {/* Clock */}
        <p className="text-5xl font-bold text-amber-400 tabular-nums">
          {time.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>

        {/* Site selector */}
        {locations.length > 1 && (
          <div>
            <label className="text-xs text-zinc-500 block mb-2">Point de vente</label>
            <select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-amber-500/50 w-full max-w-xs">
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Display modes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href={`/display/menu`}
            className="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 transition-all group">
            <span className="text-5xl block mb-3">📋</span>
            <h2 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">Menu</h2>
            <p className="text-sm text-zinc-500 mt-1">Affichage du menu avec rotation automatique des catégories</p>
          </Link>

          <Link href={`/display/orders${siteParam}`}
            className="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 transition-all group">
            <span className="text-5xl block mb-3">📺</span>
            <h2 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">Commandes</h2>
            <p className="text-sm text-zinc-500 mt-1">Commandes en préparation et prêtes pour ce site</p>
          </Link>
        </div>

        {/* Fullscreen hint */}
        <p className="text-xs text-zinc-600">
          Appuyez sur <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]">F11</kbd> pour passer en plein écran
        </p>
      </div>
    </div>
  );
}
