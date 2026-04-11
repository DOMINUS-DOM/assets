'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useLocation } from '@/contexts/LocationContext';
import { useApiData } from '@/hooks/useApiData';
import Link from 'next/link';

const ic = 'w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500/50';
const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

export default function SchedulePage() {
  const { locationId } = useLocation();
  const locParam = locationId ? `?locationId=${locationId}` : '';
  const { data: schedules, refresh } = useApiData<any[]>(`/signage/schedule${locParam}`, []);
  const { data: screens } = useApiData<any[]>(`/signage/screens${locParam}`, []);
  const { data: playlists } = useApiData<any[]>(`/signage/playlists${locParam}`, []);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    screenId: '',
    playlistId: '',
    startTime: '00:00',
    endTime: '23:59',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6] as number[],
    priority: 0,
  });
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('calendar');

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter((d) => d !== day)
        : [...f.daysOfWeek, day].sort(),
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.screenId || !form.playlistId) return;
    setSaving(true);
    try {
      await api.post('/signage/schedule', {
        action: 'create',
        screenId: form.screenId,
        playlistId: form.playlistId,
        startTime: form.startTime,
        endTime: form.endTime,
        daysOfWeek: form.daysOfWeek.join(','),
        priority: form.priority,
      });
      setShowForm(false);
      refresh();
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette programmation ?')) return;
    try {
      await api.post('/signage/schedule', { action: 'delete', id });
      refresh();
    } catch {}
  };

  const toggleActive = async (schedule: any) => {
    try {
      await api.post('/signage/schedule', { action: 'update', id: schedule.id, active: !schedule.active });
      refresh();
    } catch {}
  };

  // Build calendar data: for each day, what schedules are active
  const calendarData = DAYS.map((dayName, dayIndex) => {
    const daySchedules = schedules.filter((s: any) => {
      const days = s.daysOfWeek.split(',').map(Number);
      return days.includes(dayIndex) && s.active;
    });
    return { dayName, dayIndex, schedules: daySchedules };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/signage" className="text-zinc-500 hover:text-white transition-colors">&larr;</Link>
          <h1 className="text-xl font-bold text-white">Programmation</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-zinc-700">
            <button onClick={() => setView('calendar')}
              className={`px-3 py-1.5 text-xs font-medium ${view === 'calendar' ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-800 text-zinc-500'}`}>
              Calendrier
            </button>
            <button onClick={() => setView('list')}
              className={`px-3 py-1.5 text-xs font-medium ${view === 'list' ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-800 text-zinc-500'}`}>
              Liste
            </button>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400">
            {showForm ? 'Annuler' : '+ Programmer'}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Ecran</label>
              <select className={ic} value={form.screenId} onChange={(e) => setForm({ ...form, screenId: e.target.value })} required>
                <option value="">Selectionnez...</option>
                {screens.filter((s: any) => s.status === 'active').map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Playlist</label>
              <select className={ic} value={form.playlistId} onChange={(e) => setForm({ ...form, playlistId: e.target.value })} required>
                <option value="">Selectionnez...</option>
                {playlists.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Heure debut</label>
              <input type="time" className={ic} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Heure fin</label>
              <input type="time" className={ic} value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </div>
          </div>

          {/* Day selector */}
          <div>
            <label className="text-xs text-zinc-500 mb-2 block">Jours</label>
            <div className="flex gap-1.5">
              {DAYS.map((day, i) => (
                <button key={i} type="button" onClick={() => toggleDay(i)}
                  className={`w-10 h-10 rounded-lg text-xs font-bold transition-colors ${
                    form.daysOfWeek.includes(i) ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                  }`}>
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Priorite (0 = normal, plus = prioritaire)</label>
            <input type="number" className={ic} value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} min={0} max={99} />
          </div>

          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 disabled:opacity-50">
            {saving ? 'Enregistrement...' : 'Programmer'}
          </button>
        </form>
      )}

      {/* Calendar view */}
      {view === 'calendar' && (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800/50 overflow-hidden">
          <div className="grid grid-cols-7 gap-0">
            {calendarData.map((day) => (
              <div key={day.dayIndex} className="border-r border-zinc-800 last:border-r-0">
                <div className="px-2 py-2 text-center bg-zinc-800/50 border-b border-zinc-800">
                  <span className="text-xs font-bold text-zinc-300">{day.dayName}</span>
                </div>
                <div className="min-h-[200px] p-1.5 space-y-1">
                  {day.schedules.length === 0 && (
                    <p className="text-[9px] text-zinc-700 text-center py-4">—</p>
                  )}
                  {day.schedules.map((s: any) => (
                    <div key={s.id} className="px-1.5 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                      <p className="text-[10px] font-bold text-amber-400 truncate">{s.playlist?.name || s.screen?.name || '?'}</p>
                      <p className="text-[9px] text-zinc-500">{s.startTime}-{s.endTime}</p>
                      {s.priority > 0 && <p className="text-[9px] text-purple-400">P{s.priority}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="space-y-2">
          {schedules.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">Aucune programmation. Creez-en une pour commencer.</p>
          ) : (
            schedules.map((s: any) => {
              const days = s.daysOfWeek.split(',').map(Number);
              return (
                <div key={s.id} className={`p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 ${!s.active ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {s.screen?.name || 'Ecran inconnu'} → {s.playlist?.name || 'Playlist inconnue'}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {s.startTime} - {s.endTime}
                        {s.priority > 0 && <span className="text-purple-400 ml-2">Priorite {s.priority}</span>}
                      </p>
                      <div className="flex gap-1 mt-1.5">
                        {DAYS.map((d, i) => (
                          <span key={i} className={`text-[10px] w-6 h-5 rounded flex items-center justify-center ${
                            days.includes(i) ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-600'
                          }`}>{d[0]}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleActive(s)}
                        className={`text-xs px-2 py-1 rounded-lg font-medium ${
                          s.active ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'
                        }`}>
                        {s.active ? 'Actif' : 'Inactif'}
                      </button>
                      <button onClick={() => handleDelete(s.id)}
                        className="text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20">
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
