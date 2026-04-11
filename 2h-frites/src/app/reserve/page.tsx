'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/i18n/LanguageContext';

// ─── Types ───

interface Slot {
  time: string;
  available: boolean;
  tablesAvailable: number;
}

interface BookingResult {
  id: string;
  date: string;
  timeSlot: string;
  endTime: string;
  partySize: number;
  customerName: string;
  status: string;
  table: { number: number; capacity: number };
}

// ─── Helpers ───

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(dateStr: string, loc?: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const l = loc === 'en' ? 'en-GB' : loc === 'es' ? 'es-ES' : loc === 'nl' ? 'nl-BE' : 'fr-BE';
  return d.toLocaleDateString(l, { weekday: 'long', day: 'numeric', month: 'long' });
}

// Hard-coded locationId — in production this would come from URL param or context
function getLocationId(): string | null {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    return params.get('locationId') || localStorage.getItem('2h-locationId') || null;
  }
  return null;
}

// ─── Steps ───

type Step = 'date' | 'time' | 'details' | 'confirm';

export default function ReservePage() {
  const { t, locale } = useLanguage();
  const [step, setStep] = useState<Step>('date');
  const [locationId, setLocationId] = useState<string | null>(null);
  const [date, setDate] = useState(todayStr());
  const [partySize, setPartySize] = useState(2);
  const [selectedTime, setSelectedTime] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState<BookingResult | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLocationId(getLocationId());
  }, []);

  // Fetch available slots when date or party size changes (step 2)
  useEffect(() => {
    if (step !== 'time' || !locationId) return;
    setLoadingSlots(true);
    setError('');
    fetch(`/api/reservations/available?locationId=${locationId}&date=${date}&partySize=${partySize}`)
      .then((r) => r.json())
      .then((data) => {
        setSlots(data.slots || []);
        if (data.closed) setError('Le restaurant est ferme ce jour-la.');
      })
      .catch(() => setError('Impossible de charger les creneaux.'))
      .finally(() => setLoadingSlots(false));
  }, [step, date, partySize, locationId]);

  const handleBook = async () => {
    if (!name || !phone || !selectedTime || !locationId) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/reservations/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          date,
          timeSlot: selectedTime,
          partySize,
          customerName: name,
          customerPhone: phone,
          customerEmail: email || undefined,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === 'no_tables_available' ? 'Plus de tables disponibles pour ce creneau.' : 'Erreur lors de la reservation.');
        return;
      }
      setBooking(data);
      setStep('confirm');
    } catch {
      setError('Erreur de connexion.');
    } finally {
      setSubmitting(false);
    }
  };

  // Generate next 14 days for date selection
  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-lg sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.png" alt="2H" className="h-7 w-7 object-contain" />
            <span className="font-bold text-sm">2H Frites</span>
          </Link>
          <span className="text-xs text-amber-400 font-medium">Reservation</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Progress bar */}
        <div className="flex items-center gap-1">
          {(['date', 'time', 'details', 'confirm'] as Step[]).map((s, i) => {
            const stepLabels = ['Date', 'Heure', 'Details', 'Confirmation'];
            const stepIdx = ['date', 'time', 'details', 'confirm'].indexOf(step);
            const isActive = i <= stepIdx;
            return (
              <div key={s} className="flex-1">
                <div className={`h-1 rounded-full transition-colors ${isActive ? 'bg-amber-500' : 'bg-zinc-800'}`} />
                <p className={`text-[10px] mt-1 ${isActive ? 'text-amber-400' : 'text-zinc-600'}`}>{stepLabels[i]}</p>
              </div>
            );
          })}
        </div>

        {/* Step 1: Date */}
        {step === 'date' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold">Choisir une date</h2>
              <p className="text-sm text-zinc-500 mt-1">Selectionnez le jour de votre visite</p>
            </div>

            {/* Party size */}
            <div>
              <label className="text-xs text-zinc-400 block mb-2">Nombre de personnes</label>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <button
                    key={n}
                    onClick={() => setPartySize(n)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      partySize === n
                        ? 'bg-amber-500 text-black'
                        : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Date grid */}
            <div className="grid grid-cols-2 gap-2">
              {dateOptions.map((d) => {
                const display = new Date(d + 'T12:00:00');
                const dayName = display.toLocaleDateString('fr-BE', { weekday: 'short' });
                const dayNum = display.getDate();
                const month = display.toLocaleDateString('fr-BE', { month: 'short' });
                return (
                  <button
                    key={d}
                    onClick={() => setDate(d)}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      date === d
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-xs capitalize">{dayName}</span>
                    <span className="block text-lg font-bold">{dayNum} {month}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                if (!locationId) {
                  setError('Aucun restaurant selectionne. Ajoutez ?locationId=xxx dans l\'URL.');
                  return;
                }
                setStep('time');
              }}
              className="w-full py-3 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition-colors"
            >
              Continuer
            </button>
            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
          </div>
        )}

        {/* Step 2: Time */}
        {step === 'time' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold">Choisir un creneau</h2>
              <p className="text-sm text-zinc-500 mt-1">
                {formatDateDisplay(date)} &mdash; {partySize} {partySize > 1 ? 'personnes' : 'personne'}
              </p>
            </div>

            {loadingSlots ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              </div>
            ) : error ? (
              <p className="text-sm text-red-400 text-center py-8">{error}</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((s) => (
                  <button
                    key={s.time}
                    disabled={!s.available}
                    onClick={() => setSelectedTime(s.time)}
                    className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                      !s.available
                        ? 'bg-zinc-900/50 text-zinc-700 cursor-not-allowed'
                        : selectedTime === s.time
                          ? 'bg-amber-500 text-black'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-amber-500/30'
                    }`}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setStep('date'); setError(''); }}
                className="flex-1 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 text-sm hover:text-white"
              >
                Retour
              </button>
              <button
                onClick={() => selectedTime && setStep('details')}
                disabled={!selectedTime}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 disabled:opacity-50 transition-colors"
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 'details' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold">Vos coordonnees</h2>
              <p className="text-sm text-zinc-500 mt-1">
                {formatDateDisplay(date)} a {selectedTime} &mdash; {partySize} {partySize > 1 ? 'personnes' : 'personne'}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Nom *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom complet"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Telephone *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0471 23 45 67"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.be"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Notes / demandes speciales</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Allergies, chaise haute, anniversaire..."
                  className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-400 text-center">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => { setStep('time'); setError(''); }}
                className="flex-1 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 text-sm hover:text-white"
              >
                Retour
              </button>
              <button
                onClick={handleBook}
                disabled={submitting || !name || !phone}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Reservation...' : 'Reserver'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 'confirm' && booking && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h2 className="text-xl font-bold">Reservation confirmee !</h2>
              <p className="text-sm text-zinc-500 mt-1">Votre table est reservee</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-left space-y-3">
              <div className="flex justify-between">
                <span className="text-xs text-zinc-500">Date</span>
                <span className="text-sm text-white">{formatDateDisplay(booking.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-zinc-500">Horaire</span>
                <span className="text-sm text-white">{booking.timeSlot} - {booking.endTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-zinc-500">Couverts</span>
                <span className="text-sm text-white">{booking.partySize} personnes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-zinc-500">Table</span>
                <span className="text-sm text-white">Table {booking.table.number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-zinc-500">Nom</span>
                <span className="text-sm text-white">{booking.customerName}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-500">
              Vous recevrez une confirmation par telephone. En cas d&apos;empechement, merci de nous prevenir.
            </p>

            <div className="flex gap-3">
              <Link
                href="/"
                className="flex-1 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 text-sm text-center hover:text-white"
              >
                Voir le menu
              </Link>
              <button
                onClick={() => {
                  setStep('date');
                  setBooking(null);
                  setSelectedTime('');
                  setName('');
                  setPhone('');
                  setEmail('');
                  setNotes('');
                  setError('');
                }}
                className="flex-1 py-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-500/25"
              >
                Nouvelle reservation
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
