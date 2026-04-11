'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useLocation } from '@/contexts/LocationContext';
import { useApiData } from '@/hooks/useApiData';
import Link from 'next/link';

const ic = 'w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500/50';

export default function ScreensPage() {
  const { locationId } = useLocation();
  const locParam = locationId ? `?locationId=${locationId}` : '';
  const { data: screens, refresh } = useApiData<any[]>(`/signage/screens${locParam}`, []);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', orientation: 'landscape', resolution: '1920x1080' });
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !locationId) return;
    setSaving(true);
    try {
      await api.post('/signage/screens', {
        action: 'create',
        name: form.name,
        locationId,
        orientation: form.orientation,
        resolution: form.resolution,
      });
      setForm({ name: '', orientation: 'landscape', resolution: '1920x1080' });
      setShowForm(false);
      refresh();
    } catch {}
    setSaving(false);
  };

  const toggleStatus = async (screen: any) => {
    const nextStatus = screen.status === 'active' ? 'draft' : screen.status === 'draft' ? 'active' : 'active';
    try {
      await api.post('/signage/screens', { action: 'toggleStatus', id: screen.id, status: nextStatus });
      refresh();
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet ecran ?')) return;
    try {
      await api.post('/signage/screens', { action: 'delete', id });
      refresh();
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/signage" className="text-zinc-500 hover:text-white transition-colors">
            &larr;
          </Link>
          <h1 className="text-xl font-bold text-white">Ecrans</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors"
        >
          {showForm ? 'Annuler' : '+ Nouvel ecran'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-3">
          <input
            className={ic}
            placeholder="Nom de l'ecran"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              className={ic}
              value={form.orientation}
              onChange={(e) => setForm({ ...form, orientation: e.target.value })}
            >
              <option value="landscape">Paysage</option>
              <option value="portrait">Portrait</option>
            </select>
            <select
              className={ic}
              value={form.resolution}
              onChange={(e) => setForm({ ...form, resolution: e.target.value })}
            >
              <option value="1920x1080">1920x1080 (FHD)</option>
              <option value="1080x1920">1080x1920 (FHD Portrait)</option>
              <option value="3840x2160">3840x2160 (4K)</option>
              <option value="1280x720">1280x720 (HD)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Creer'}
          </button>
        </form>
      )}

      {screens.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucun ecran configure. Creez-en un pour commencer.</p>
      ) : (
        <div className="space-y-3">
          {screens.map((screen: any) => (
            <div
              key={screen.id}
              className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{screen.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {screen.orientation === 'landscape' ? 'Paysage' : 'Portrait'} - {screen.resolution}
                  </p>
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

              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500">Code:</span>
                <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400 font-mono">{screen.code}</code>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500">URL:</span>
                <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[11px]">
                  2hfrites.be/display/{screen.code}
                </code>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => toggleStatus(screen)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    screen.status === 'active'
                      ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                      : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  }`}
                >
                  {screen.status === 'active' ? 'Desactiver' : 'Activer'}
                </button>
                <button
                  onClick={() => handleDelete(screen.id)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 font-medium transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
