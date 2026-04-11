'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useLocation } from '@/contexts/LocationContext';
import { useApiData } from '@/hooks/useApiData';
import Link from 'next/link';

const ic = 'w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500/50';

export default function PlaylistsPage() {
  const { locationId } = useLocation();
  const locParam = locationId ? `?locationId=${locationId}` : '';
  const { data: playlists, refresh } = useApiData<any[]>(`/signage/playlists${locParam}`, []);
  const { data: contents } = useApiData<any[]>(`/signage/content${locParam}`, []);
  const { data: screens } = useApiData<any[]>(`/signage/screens${locParam}`, []);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', loop: true });
  const [saving, setSaving] = useState(false);

  // For adding content to a playlist
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [selectedContentId, setSelectedContentId] = useState('');

  // For quick schedule
  const [schedulingPlaylist, setSchedulingPlaylist] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    screenId: '',
    startTime: '00:00',
    endTime: '23:59',
    daysOfWeek: '0,1,2,3,4,5,6',
  });

  // Expanded playlist for showing items
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !locationId) return;
    setSaving(true);
    try {
      await api.post('/signage/playlists', {
        action: 'create',
        name: form.name,
        locationId,
        loop: form.loop,
      });
      setForm({ name: '', loop: true });
      setShowForm(false);
      refresh();
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette playlist ?')) return;
    try {
      await api.post('/signage/playlists', { action: 'delete', id });
      refresh();
    } catch {}
  };

  const toggleStatus = async (playlist: any) => {
    const nextStatus = playlist.status === 'active' ? 'draft' : 'active';
    try {
      await api.post('/signage/playlists', { action: 'update', id: playlist.id, status: nextStatus });
      refresh();
    } catch {}
  };

  const addContentToPlaylist = async (playlistId: string) => {
    if (!selectedContentId) return;
    const playlist = playlists.find((p: any) => p.id === playlistId);
    if (!playlist) return;

    const existingItems = (playlist.items || []).map((item: any, idx: number) => ({
      contentId: item.contentId,
      order: idx,
      durationOverride: item.durationOverride,
    }));

    const newItems = [
      ...existingItems,
      { contentId: selectedContentId, order: existingItems.length },
    ];

    try {
      await api.post('/signage/playlists', {
        action: 'setItems',
        playlistId,
        items: newItems,
      });
      setAddingTo(null);
      setSelectedContentId('');
      refresh();
    } catch {}
  };

  const removeItemFromPlaylist = async (playlistId: string, removeIdx: number) => {
    const playlist = playlists.find((p: any) => p.id === playlistId);
    if (!playlist) return;

    const newItems = (playlist.items || [])
      .filter((_: any, idx: number) => idx !== removeIdx)
      .map((item: any, idx: number) => ({
        contentId: item.contentId,
        order: idx,
        durationOverride: item.durationOverride,
      }));

    try {
      await api.post('/signage/playlists', {
        action: 'setItems',
        playlistId,
        items: newItems,
      });
      refresh();
    } catch {}
  };

  const moveItem = async (playlistId: string, fromIdx: number, direction: 'up' | 'down') => {
    const playlist = playlists.find((p: any) => p.id === playlistId);
    if (!playlist) return;

    const items = [...(playlist.items || [])];
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= items.length) return;

    [items[fromIdx], items[toIdx]] = [items[toIdx], items[fromIdx]];

    const newItems = items.map((item: any, idx: number) => ({
      contentId: item.contentId,
      order: idx,
      durationOverride: item.durationOverride,
    }));

    try {
      await api.post('/signage/playlists', {
        action: 'setItems',
        playlistId,
        items: newItems,
      });
      refresh();
    } catch {}
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingPlaylist || !scheduleForm.screenId) return;
    try {
      await api.post('/signage/schedule', {
        action: 'create',
        screenId: scheduleForm.screenId,
        playlistId: schedulingPlaylist,
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
        daysOfWeek: scheduleForm.daysOfWeek,
      });
      setSchedulingPlaylist(null);
      setScheduleForm({ screenId: '', startTime: '00:00', endTime: '23:59', daysOfWeek: '0,1,2,3,4,5,6' });
    } catch {}
  };

  const publishedContents = contents.filter((c: any) => c.status === 'published');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/signage" className="text-zinc-500 hover:text-white transition-colors">
            &larr;
          </Link>
          <h1 className="text-xl font-bold text-white">Playlists</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors"
        >
          {showForm ? 'Annuler' : '+ Nouvelle playlist'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-3">
          <input
            className={ic}
            placeholder="Nom de la playlist"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.loop}
              onChange={(e) => setForm({ ...form, loop: e.target.checked })}
              className="rounded border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-amber-500/50"
            />
            Lecture en boucle
          </label>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Creer'}
          </button>
        </form>
      )}

      {playlists.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucune playlist creee. Ajoutez-en une pour commencer.</p>
      ) : (
        <div className="space-y-3">
          {playlists.map((playlist: any) => {
            const isExpanded = expandedId === playlist.id;
            const items = playlist.items || [];

            return (
              <div
                key={playlist.id}
                className="rounded-xl bg-zinc-900 border border-zinc-800/50 overflow-hidden"
              >
                {/* Header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : playlist.id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{playlist.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {items.length} contenu{items.length > 1 ? 's' : ''} {playlist.loop ? '- En boucle' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          playlist.status === 'active'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-zinc-700 text-zinc-400'
                        }`}
                      >
                        {playlist.status === 'active' ? 'Active' : 'Brouillon'}
                      </span>
                      {playlist.loop && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium">
                          Boucle
                        </span>
                      )}
                      <span className="text-zinc-500 text-xs">{isExpanded ? '\u25B2' : '\u25BC'}</span>
                    </div>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-zinc-800">
                    {/* Items list */}
                    {items.length === 0 ? (
                      <p className="text-xs text-zinc-600 pt-3">Aucun contenu dans cette playlist.</p>
                    ) : (
                      <div className="space-y-1 pt-3">
                        {items.map((item: any, idx: number) => (
                          <div
                            key={item.id || idx}
                            className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/50"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-600 font-mono w-5 text-center">{idx + 1}</span>
                              <span className="text-sm text-zinc-300">
                                {item.content?.name || 'Contenu inconnu'}
                              </span>
                              <span className="text-xs text-zinc-600">
                                {item.durationOverride || item.content?.duration || '?'}s
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); moveItem(playlist.id, idx, 'up'); }}
                                disabled={idx === 0}
                                className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                              >
                                &uarr;
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); moveItem(playlist.id, idx, 'down'); }}
                                disabled={idx === items.length - 1}
                                className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                              >
                                &darr;
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); removeItemFromPlaylist(playlist.id, idx); }}
                                className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors ml-1"
                              >
                                &times;
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add content */}
                    {addingTo === playlist.id ? (
                      <div className="flex items-center gap-2 pt-1">
                        <select
                          className={ic}
                          value={selectedContentId}
                          onChange={(e) => setSelectedContentId(e.target.value)}
                        >
                          <option value="">Selectionnez un contenu</option>
                          {publishedContents.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name} ({c.type} - {c.duration}s)</option>
                          ))}
                        </select>
                        <button
                          onClick={() => addContentToPlaylist(playlist.id)}
                          disabled={!selectedContentId}
                          className="px-3 py-2.5 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50 shrink-0"
                        >
                          Ajouter
                        </button>
                        <button
                          onClick={() => { setAddingTo(null); setSelectedContentId(''); }}
                          className="px-3 py-2.5 rounded-lg bg-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-600 transition-colors shrink-0"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setAddingTo(playlist.id); }}
                        className="text-xs text-amber-400 hover:text-amber-300 transition-colors pt-1"
                      >
                        + Ajouter un contenu
                      </button>
                    )}

                    {/* Quick schedule */}
                    {schedulingPlaylist === playlist.id ? (
                      <form onSubmit={handleSchedule} className="space-y-2 pt-2 border-t border-zinc-800">
                        <p className="text-xs text-zinc-500 font-medium">Programmer sur un ecran</p>
                        <select
                          className={ic}
                          value={scheduleForm.screenId}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, screenId: e.target.value })}
                          required
                        >
                          <option value="">Selectionnez un ecran</option>
                          {screens.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Debut</label>
                            <input
                              type="time"
                              className={ic}
                              value={scheduleForm.startTime}
                              onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Fin</label>
                            <input
                              type="time"
                              className={ic}
                              value={scheduleForm.endTime}
                              onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors"
                          >
                            Programmer
                          </button>
                          <button
                            type="button"
                            onClick={() => setSchedulingPlaylist(null)}
                            className="px-3 py-1.5 rounded-lg bg-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-600 transition-colors"
                          >
                            Annuler
                          </button>
                        </div>
                      </form>
                    ) : null}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleStatus(playlist); }}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                          playlist.status === 'active'
                            ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                            : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        }`}
                      >
                        {playlist.status === 'active' ? 'Desactiver' : 'Activer'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSchedulingPlaylist(schedulingPlaylist === playlist.id ? null : playlist.id); }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 font-medium transition-colors"
                      >
                        Programmer
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(playlist.id); }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 font-medium transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
