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
  const { data: playlists } = useApiData<any[]>(`/signage/playlists${locParam}`, []);
  const { data: schedules, refresh: refreshSchedules } = useApiData<any[]>(`/signage/schedule${locParam}`, []);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', orientation: 'landscape', resolution: '1920x1080', playlistId: '' });
  const [saving, setSaving] = useState(false);

  // Find the assigned playlist for a screen via schedules
  const getScreenPlaylist = (screenId: string) => {
    const schedule = schedules.find((s: any) => s.screenId === screenId && s.active);
    if (!schedule) return null;
    return schedule.playlist || null;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !locationId) return;
    setSaving(true);
    try {
      const screen = await api.post<any>('/signage/screens', {
        action: 'create',
        name: form.name,
        locationId,
        orientation: form.orientation,
        resolution: form.resolution,
      });

      // If a playlist was selected, create a schedule and activate the screen
      if (form.playlistId && screen?.id) {
        await api.post('/signage/schedule', {
          action: 'create',
          screenId: screen.id,
          playlistId: form.playlistId,
          daysOfWeek: '0,1,2,3,4,5,6',
          startTime: '00:00',
          endTime: '23:59',
          active: true,
        });
        // Activate the screen
        await api.post('/signage/screens', { action: 'toggleStatus', id: screen.id, status: 'active' });
      }

      setForm({ name: '', orientation: 'landscape', resolution: '1920x1080', playlistId: '' });
      setShowForm(false);
      refresh();
      refreshSchedules();
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
      refreshSchedules();
    } catch {}
  };

  // Assign or change playlist for existing screen
  const handleAssignPlaylist = async (screen: any, playlistId: string) => {
    if (!playlistId) return;
    try {
      // Remove existing active schedules for this screen
      const existingSchedules = schedules.filter((s: any) => s.screenId === screen.id);
      for (const sched of existingSchedules) {
        await api.post('/signage/schedule', { action: 'delete', id: sched.id });
      }
      // Create new schedule
      await api.post('/signage/schedule', {
        action: 'create',
        screenId: screen.id,
        playlistId,
        daysOfWeek: '0,1,2,3,4,5,6',
        startTime: '00:00',
        endTime: '23:59',
        active: true,
      });
      refreshSchedules();
    } catch {}
  };

  const activePlaylists = playlists.filter((p: any) => p.status === 'active');

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
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Playlist a assigner (optionnel)</label>
            <select
              className={ic}
              value={form.playlistId}
              onChange={(e) => setForm({ ...form, playlistId: e.target.value })}
            >
              <option value="">-- Aucune playlist --</option>
              {activePlaylists.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {form.playlistId && (
              <p className="text-xs text-zinc-500 mt-1">
                Un horaire permanent sera cree et l&apos;ecran sera active automatiquement.
              </p>
            )}
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
          {screens.map((screen: any) => {
            const assignedPlaylist = getScreenPlaylist(screen.id);

            return (
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

                {/* Assigned playlist */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500">Playlist:</span>
                  {assignedPlaylist ? (
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium">
                      {assignedPlaylist.name}
                    </span>
                  ) : (
                    <span className="text-zinc-600 italic">Aucune</span>
                  )}
                  {!assignedPlaylist && activePlaylists.length > 0 && (
                    <select
                      className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs focus:outline-none focus:border-amber-500/50"
                      value=""
                      onChange={(e) => handleAssignPlaylist(screen, e.target.value)}
                    >
                      <option value="">Assigner...</option>
                      {activePlaylists.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                  {assignedPlaylist && (
                    <select
                      className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs focus:outline-none focus:border-amber-500/50"
                      value=""
                      onChange={(e) => handleAssignPlaylist(screen, e.target.value)}
                    >
                      <option value="">Changer...</option>
                      {activePlaylists.filter((p: any) => p.id !== assignedPlaylist.id).map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Player URL */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500">URL:</span>
                  <a
                    href={`/display/${screen.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400 font-mono text-[11px] hover:text-amber-300 hover:bg-zinc-700 transition-colors"
                  >
                    brizoapp.com/display/{screen.code}
                  </a>
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
                  <a
                    href={`/display/${screen.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 font-medium transition-colors"
                  >
                    Apercu
                  </a>
                  <button
                    onClick={() => handleDelete(screen.id)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 font-medium transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
