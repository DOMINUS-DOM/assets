'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useLocation } from '@/contexts/LocationContext';
import Link from 'next/link';

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

interface ReservationSettings {
  enabled: boolean;
  minPartySize: number;
  maxPartySize: number;
  slotDurationMinutes: number;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  maxReservationsPerSlot: number;
  autoConfirm: boolean;
  requirePhone: boolean;
  closedDays: number[];
  customSlots: Record<number, { open: string; close: string }[]>;
  confirmationMessage: string;
}

const DEFAULT_SETTINGS: ReservationSettings = {
  enabled: false,
  minPartySize: 1,
  maxPartySize: 12,
  slotDurationMinutes: 30,
  minAdvanceHours: 2,
  maxAdvanceDays: 30,
  maxReservationsPerSlot: 3,
  autoConfirm: true,
  requirePhone: true,
  closedDays: [],
  customSlots: {},
  confirmationMessage: '',
};

export default function ReservationSettingsPage() {
  const { locationId } = useLocation();
  const [settings, setSettings] = useState<ReservationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.post<ReservationSettings>('/reservations', { action: 'getSettings', locationId })
      .then((s) => setSettings({ ...DEFAULT_SETTINGS, ...s }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [locationId]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.post('/reservations', { action: 'saveSettings', locationId, settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  const update = <K extends keyof ReservationSettings>(key: K, value: ReservationSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const toggleClosedDay = (day: number) => {
    setSettings((prev) => ({
      ...prev,
      closedDays: prev.closedDays.includes(day)
        ? prev.closedDays.filter((d) => d !== day)
        : [...prev.closedDays, day],
    }));
  };

  const setSlot = (day: number, idx: number, field: 'open' | 'close', value: string) => {
    setSettings((prev) => {
      const slots = { ...prev.customSlots };
      if (!slots[day]) slots[day] = [{ open: '12:00', close: '14:00' }];
      slots[day] = [...slots[day]];
      slots[day][idx] = { ...slots[day][idx], [field]: value };
      return { ...prev, customSlots: slots };
    });
  };

  const addSlot = (day: number) => {
    setSettings((prev) => {
      const slots = { ...prev.customSlots };
      if (!slots[day]) slots[day] = [];
      slots[day] = [...slots[day], { open: '18:00', close: '22:00' }];
      return { ...prev, customSlots: slots };
    });
  };

  const removeSlot = (day: number, idx: number) => {
    setSettings((prev) => {
      const slots = { ...prev.customSlots };
      if (slots[day]) {
        slots[day] = slots[day].filter((_, i) => i !== idx);
        if (slots[day].length === 0) delete slots[day];
      }
      return { ...prev, customSlots: slots };
    });
  };

  if (loading) return <div className="text-center py-12 text-zinc-500">Chargement...</div>;

  const ic = 'px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-brand/50';

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Configuration des reservations</h1>
          <p className="text-xs text-zinc-500 mt-1">
            <Link href="/admin/reservations" className="text-brand-light hover:underline">← Retour aux reservations</Link>
          </p>
        </div>
        {saved && <span className="text-xs text-emerald-400">Enregistre ✓</span>}
      </div>

      {/* Enabled toggle */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium text-white">Reservations activees</p>
            <p className="text-xs text-zinc-500">Les clients peuvent reserver en ligne</p>
          </div>
          <button onClick={() => update('enabled', !settings.enabled)} className={`w-12 h-7 rounded-full transition-colors ${settings.enabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${settings.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </label>
      </div>

      {/* Slots config */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-3">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Creneaux</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Duree d&apos;un creneau</label>
            <select value={settings.slotDurationMinutes} onChange={(e) => update('slotDurationMinutes', Number(e.target.value))} className={ic}>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>60 min</option>
              <option value={90}>90 min</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Reservations par creneau</label>
            <input type="number" value={settings.maxReservationsPerSlot} onChange={(e) => update('maxReservationsPerSlot', Number(e.target.value))} className={ic} min={1} max={50} />
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-3">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Horaires</h2>
        {DAYS.map((dayName, dayIdx) => {
          const isClosed = settings.closedDays.includes(dayIdx);
          const slots = settings.customSlots[dayIdx] || [];
          return (
            <div key={dayIdx} className="flex items-start gap-3 py-2 border-b border-zinc-800/50 last:border-0">
              <span className="text-sm text-zinc-300 w-24 shrink-0 pt-1">{dayName}</span>
              <div className="flex-1">
                {isClosed ? (
                  <button onClick={() => toggleClosedDay(dayIdx)} className="text-xs text-red-400 hover:text-red-300">Ferme — cliquer pour ouvrir</button>
                ) : (
                  <div className="space-y-1.5">
                    {slots.map((slot, sIdx) => (
                      <div key={sIdx} className="flex items-center gap-2">
                        <input type="time" value={slot.open} onChange={(e) => setSlot(dayIdx, sIdx, 'open', e.target.value)} className={`${ic} w-28`} />
                        <span className="text-zinc-500 text-xs">a</span>
                        <input type="time" value={slot.close} onChange={(e) => setSlot(dayIdx, sIdx, 'close', e.target.value)} className={`${ic} w-28`} />
                        <button onClick={() => removeSlot(dayIdx, sIdx)} className="text-xs text-red-400 hover:text-red-300">✕</button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <button onClick={() => addSlot(dayIdx)} className="text-xs text-brand-light hover:underline">+ Ajouter un service</button>
                      <button onClick={() => toggleClosedDay(dayIdx)} className="text-xs text-zinc-500 hover:text-red-400">Fermer ce jour</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rules */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-3">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Regles</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Taille min du groupe</label>
            <input type="number" value={settings.minPartySize} onChange={(e) => update('minPartySize', Number(e.target.value))} className={ic} min={1} />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Taille max du groupe</label>
            <input type="number" value={settings.maxPartySize} onChange={(e) => update('maxPartySize', Number(e.target.value))} className={ic} min={1} />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Reserver au minimum</label>
            <select value={settings.minAdvanceHours} onChange={(e) => update('minAdvanceHours', Number(e.target.value))} className={ic}>
              <option value={1}>1h avant</option>
              <option value={2}>2h avant</option>
              <option value={4}>4h avant</option>
              <option value={12}>12h avant</option>
              <option value={24}>24h avant</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Reserver au maximum</label>
            <select value={settings.maxAdvanceDays} onChange={(e) => update('maxAdvanceDays', Number(e.target.value))} className={ic}>
              <option value={7}>7 jours</option>
              <option value={14}>14 jours</option>
              <option value={30}>30 jours</option>
              <option value={60}>60 jours</option>
              <option value={90}>90 jours</option>
            </select>
          </div>
        </div>
        <label className="flex items-center justify-between cursor-pointer pt-2">
          <span className="text-sm text-zinc-300">Confirmation automatique</span>
          <button onClick={() => update('autoConfirm', !settings.autoConfirm)} className={`w-10 h-6 rounded-full transition-colors ${settings.autoConfirm ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
            <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${settings.autoConfirm ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
        </label>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-zinc-300">Telephone obligatoire</span>
          <button onClick={() => update('requirePhone', !settings.requirePhone)} className={`w-10 h-6 rounded-full transition-colors ${settings.requirePhone ? 'bg-brand' : 'bg-zinc-700'}`}>
            <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${settings.requirePhone ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
        </label>
      </div>

      {/* Confirmation message */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-2">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Message de confirmation</h2>
        <textarea
          value={settings.confirmationMessage}
          onChange={(e) => update('confirmationMessage', e.target.value)}
          placeholder="Merci pour votre reservation ! Nous vous attendons..."
          className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-brand/50 h-20 resize-none"
        />
      </div>

      {/* Lien public */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-2">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Lien de reservation</h2>
        <div className="flex items-center gap-2">
          <input readOnly value={typeof window !== 'undefined' ? `${window.location.origin}/reserve` : '/reserve'} className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-mono" />
          <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/reserve`); }} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-brand-light hover:text-white transition-colors">
            Copier
          </button>
        </div>
      </div>

      {/* Save */}
      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 rounded-xl bg-brand text-zinc-950 font-bold text-sm active:scale-[0.98] transition-transform disabled:opacity-50">
        {saving ? 'Enregistrement...' : 'Enregistrer la configuration'}
      </button>
    </div>
  );
}
