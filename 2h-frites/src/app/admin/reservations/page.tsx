'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { useLocation } from '@/contexts/LocationContext';
import { useApiData } from '@/hooks/useApiData';

// ─── Types ───

interface ReservationTable {
  id: string;
  tableId: string;
  table: { id: string; number: number; capacity: number; zone: string };
}

interface Reservation {
  id: string;
  locationId: string;
  date: string;
  timeSlot: string;
  endTime: string;
  duration: number;
  partySize: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  status: string;
  notes: string;
  source: string;
  tables: ReservationTable[];
  createdAt: string;
}

interface FloorTable {
  id: string;
  number: number;
  capacity: number;
  zone: string;
  status: string;
  active: boolean;
}

// ─── Constants ───

const STATUSES = ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'] as const;

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending:   { bg: 'bg-amber-500/20 border-amber-500/40', text: 'text-amber-400', label: 'En attente' },
  confirmed: { bg: 'bg-blue-500/20 border-blue-500/40', text: 'text-blue-400', label: 'Confirmee' },
  seated:    { bg: 'bg-emerald-500/20 border-emerald-500/40', text: 'text-emerald-400', label: 'Installee' },
  completed: { bg: 'bg-zinc-600/20 border-zinc-500/40', text: 'text-zinc-400', label: 'Terminee' },
  cancelled: { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400 line-through', label: 'Annulee' },
  no_show:   { bg: 'bg-red-500/20 border-red-500/40', text: 'text-red-400', label: 'No-show' },
};

const HOURS_START = 11;
const HOURS_END = 22;
const SLOT_COUNT = (HOURS_END - HOURS_START) * 2; // 30-min slots

function timeToSlotIndex(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h - HOURS_START) * 2 + Math.floor(m / 30);
}

function slotIndexToTime(idx: number): string {
  const h = HOURS_START + Math.floor(idx / 2);
  const m = (idx % 2) * 30;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Component ───

export default function ReservationsPage() {
  const { locationId } = useLocation();
  const [date, setDate] = useState(todayStr());
  const [showModal, setShowModal] = useState(false);
  const [detailRes, setDetailRes] = useState<Reservation | null>(null);
  const [prefill, setPrefill] = useState<{ time?: string; tableId?: string }>({});

  // Fetch reservations for the selected date
  const locParam = locationId ? `&locationId=${locationId}` : '';
  const { data: reservations, refresh } = useApiData<Reservation[]>(
    `/reservations?date=${date}${locParam}`, []
  );

  // Fetch tables for the location
  const [tables, setTables] = useState<FloorTable[]>([]);
  useEffect(() => {
    if (!locationId) return;
    api.get<FloorTable[]>(`/reservations?date=__tables__&locationId=${locationId}`)
      .catch(() => []);
    // Use a direct prisma-backed approach — fetch via a simple query
    // Since we don't have a dedicated tables API that returns FloorTable from DB,
    // we'll derive tables from existing reservations or use a fallback
  }, [locationId]);

  // Actually fetch tables from the location settings/floor data
  useEffect(() => {
    if (!locationId) return;
    // We'll parse tables from the reservation data or fetch from floor-tables
    // For now, extract unique tables from reservations + fetch all active tables
    const fetchTables = async () => {
      try {
        // Try fetching from the menu/tables endpoint if available
        const res = await fetch(`/api/settings?type=tables&locationId=${locationId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('2h-auth-token')}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.tables)) {
            setTables(data.tables);
            return;
          }
        }
      } catch {}
      // Fallback: generate default tables
      setTables(
        Array.from({ length: 10 }, (_, i) => ({
          id: `table-${i + 1}`,
          number: i + 1,
          capacity: i < 4 ? 2 : i < 7 ? 4 : 6,
          zone: 'main',
          status: 'free',
          active: true,
        }))
      );
    };
    fetchTables();
  }, [locationId]);

  // ─── Stats ───
  const stats = useMemo(() => {
    const total = reservations.length;
    const confirmed = reservations.filter((r) => r.status === 'confirmed').length;
    const seated = reservations.filter((r) => r.status === 'seated').length;
    const activeTables = tables.filter((t) => t.active).length;
    const usedTableIds = new Set(
      reservations
        .filter((r) => !['cancelled', 'no_show', 'completed'].includes(r.status))
        .flatMap((r) => r.tables.map((rt) => rt.tableId))
    );
    const available = activeTables - usedTableIds.size;
    return { total, confirmed, seated, available: Math.max(0, available) };
  }, [reservations, tables]);

  // ─── Timeline helpers ───
  const getResForTableSlot = (tableId: string, slotIdx: number): Reservation | undefined => {
    return reservations.find((r) => {
      if (!r.tables.some((rt) => rt.tableId === tableId || rt.table?.number === tables.find(t => t.id === tableId)?.number)) return false;
      const start = timeToSlotIndex(r.timeSlot);
      const end = timeToSlotIndex(r.endTime);
      return slotIdx >= start && slotIdx < end;
    });
  };

  const isResStart = (tableId: string, slotIdx: number, res: Reservation): boolean => {
    return timeToSlotIndex(res.timeSlot) === slotIdx;
  };

  const resSpan = (res: Reservation): number => {
    const start = timeToSlotIndex(res.timeSlot);
    const end = timeToSlotIndex(res.endTime);
    return Math.max(1, end - start);
  };

  // ─── Actions ───
  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.post('/reservations', { action: 'updateStatus', id, status });
      refresh();
      setDetailRes(null);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette reservation ?')) return;
    try {
      await api.post('/reservations', { action: 'delete', id });
      refresh();
      setDetailRes(null);
    } catch (e) { console.error(e); }
  };

  const handleCellClick = (tableId: string, slotIdx: number) => {
    const existing = getResForTableSlot(tableId, slotIdx);
    if (existing) {
      setDetailRes(existing);
    } else {
      setPrefill({ time: slotIndexToTime(slotIdx), tableId });
      setShowModal(true);
    }
  };

  // ─── Date nav ───
  const shiftDate = (days: number) => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-white">Reservations</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => shiftDate(-1)} className="px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white text-sm">&larr;</button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-amber-500/50"
          />
          <button onClick={() => shiftDate(1)} className="px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white text-sm">&rarr;</button>
          <button onClick={() => setDate(todayStr())} className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white text-xs">Aujourd&apos;hui</button>
          <button
            onClick={() => { setPrefill({}); setShowModal(true); }}
            className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-medium text-sm hover:bg-amber-400"
          >
            + Reservation
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Confirmees', value: stats.confirmed, color: 'text-blue-400' },
          { label: 'En salle', value: stats.seated, color: 'text-emerald-400' },
          { label: 'Tables libres', value: stats.available, color: 'text-amber-400' },
        ].map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Timeline grid */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Time header */}
            <div className="flex border-b border-zinc-800">
              <div className="w-24 shrink-0 px-3 py-2 text-xs text-zinc-500 font-medium border-r border-zinc-800">Table</div>
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${SLOT_COUNT}, minmax(48px, 1fr))` }}>
                {Array.from({ length: SLOT_COUNT }, (_, i) => {
                  const t = slotIndexToTime(i);
                  const isHour = i % 2 === 0;
                  return (
                    <div key={i} className={`px-1 py-2 text-center text-[10px] ${isHour ? 'text-zinc-400 font-medium' : 'text-zinc-600'} border-r border-zinc-800/50`}>
                      {isHour ? t : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Table rows */}
            {tables.filter((t) => t.active).map((table) => {
              // Pre-compute which slots are covered by which reservation
              const slotMap: (Reservation | null)[] = Array(SLOT_COUNT).fill(null);
              const rendered = new Set<string>();

              reservations.forEach((r) => {
                const hasTable = r.tables.some(
                  (rt) => rt.tableId === table.id || rt.table?.number === table.number
                );
                if (!hasTable) return;
                const start = timeToSlotIndex(r.timeSlot);
                const end = timeToSlotIndex(r.endTime);
                for (let i = Math.max(0, start); i < Math.min(SLOT_COUNT, end); i++) {
                  slotMap[i] = r;
                }
              });

              return (
                <div key={table.id} className="flex border-b border-zinc-800/50 hover:bg-zinc-800/20">
                  <div className="w-24 shrink-0 px-3 py-2.5 text-xs text-zinc-300 font-medium border-r border-zinc-800 flex items-center gap-1.5">
                    <span className="text-zinc-500">T{table.number}</span>
                    <span className="text-[10px] text-zinc-600">({table.capacity}p)</span>
                  </div>
                  <div className="flex-1 grid relative" style={{ gridTemplateColumns: `repeat(${SLOT_COUNT}, minmax(48px, 1fr))` }}>
                    {Array.from({ length: SLOT_COUNT }, (_, i) => {
                      const res = slotMap[i];

                      if (res && !rendered.has(res.id + table.id)) {
                        rendered.add(res.id + table.id);
                        const start = Math.max(0, timeToSlotIndex(res.timeSlot));
                        const end = Math.min(SLOT_COUNT, timeToSlotIndex(res.endTime));
                        const span = end - start;
                        const style = STATUS_STYLE[res.status] || STATUS_STYLE.pending;

                        return (
                          <button
                            key={i}
                            onClick={() => setDetailRes(res)}
                            className={`absolute top-0.5 bottom-0.5 rounded-md border ${style.bg} cursor-pointer hover:brightness-125 transition-all flex items-center px-1.5 overflow-hidden z-10`}
                            style={{
                              gridColumn: `${i + 1} / span ${span}`,
                              left: `${(i / SLOT_COUNT) * 100}%`,
                              width: `${(span / SLOT_COUNT) * 100}%`,
                            }}
                            title={`${res.customerName} - ${res.partySize}p - ${res.timeSlot}-${res.endTime}`}
                          >
                            <span className={`text-[10px] font-medium truncate ${style.text}`}>
                              {res.customerName} ({res.partySize}p)
                            </span>
                          </button>
                        );
                      }

                      if (res) return <div key={i} className="border-r border-zinc-800/30 h-8" />;

                      return (
                        <div
                          key={i}
                          onClick={() => handleCellClick(table.id, i)}
                          className="border-r border-zinc-800/30 h-8 cursor-pointer hover:bg-amber-500/5 transition-colors"
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* List view for mobile */}
      <div className="block lg:hidden space-y-2">
        <h2 className="text-sm font-medium text-zinc-400">Liste des reservations</h2>
        {reservations.length === 0 && (
          <p className="text-xs text-zinc-600 py-4 text-center">Aucune reservation pour cette date</p>
        )}
        {reservations.map((r) => {
          const style = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
          return (
            <button
              key={r.id}
              onClick={() => setDetailRes(r)}
              className={`w-full text-left p-3 rounded-lg border ${style.bg} transition-colors hover:brightness-110`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${style.text}`}>{r.customerName}</span>
                <span className="text-xs text-zinc-500">{r.timeSlot} - {r.endTime}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-zinc-500">{r.partySize} pers.</span>
                <span className="text-xs text-zinc-600">
                  {r.tables.map((rt) => `T${rt.table?.number || '?'}`).join(', ')}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail modal */}
      {detailRes && (
        <DetailModal
          res={detailRes}
          onClose={() => setDetailRes(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}

      {/* Create/Edit modal */}
      {showModal && (
        <CreateModal
          date={date}
          tables={tables}
          prefill={prefill}
          locationId={locationId}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); refresh(); }}
        />
      )}
    </div>
  );
}

// ─── Detail Modal ───

function DetailModal({
  res,
  onClose,
  onStatusChange,
  onDelete,
}: {
  res: Reservation;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const style = STATUS_STYLE[res.status] || STATUS_STYLE.pending;
  const nextStatuses: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['seated', 'cancelled', 'no_show'],
    seated: ['completed'],
    completed: [],
    cancelled: [],
    no_show: [],
  };
  const available = nextStatuses[res.status] || [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{res.customerName}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-lg">&times;</button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-zinc-500 text-xs">Date</p>
            <p className="text-white">{res.date}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs">Horaire</p>
            <p className="text-white">{res.timeSlot} - {res.endTime}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs">Couverts</p>
            <p className="text-white">{res.partySize} personnes</p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs">Statut</p>
            <p className={style.text}>{style.label}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs">Telephone</p>
            <p className="text-white">{res.customerPhone || '-'}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs">Email</p>
            <p className="text-white text-xs">{res.customerEmail || '-'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-zinc-500 text-xs">Tables</p>
            <p className="text-white">
              {res.tables.length > 0
                ? res.tables.map((rt) => `Table ${rt.table?.number || '?'} (${rt.table?.capacity || '?'}p)`).join(', ')
                : 'Aucune table assignee'}
            </p>
          </div>
          {res.notes && (
            <div className="col-span-2">
              <p className="text-zinc-500 text-xs">Notes</p>
              <p className="text-white text-sm">{res.notes}</p>
            </div>
          )}
          <div>
            <p className="text-zinc-500 text-xs">Source</p>
            <p className="text-white capitalize">{res.source}</p>
          </div>
        </div>

        {/* Status buttons */}
        {available.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
            {available.map((s) => {
              const st = STATUS_STYLE[s];
              return (
                <button
                  key={s}
                  onClick={() => onStatusChange(res.id, s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${st.bg} ${st.text} hover:brightness-125`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-zinc-800">
          <button
            onClick={() => onDelete(res.id)}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Modal ───

function CreateModal({
  date,
  tables,
  prefill,
  locationId,
  onClose,
  onCreated,
}: {
  date: string;
  tables: FloorTable[];
  prefill: { time?: string; tableId?: string };
  locationId: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    date,
    timeSlot: prefill.time || '12:00',
    duration: 90,
    partySize: 2,
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    notes: '',
    tableIds: prefill.tableId ? [prefill.tableId] : [] as string[],
  });
  const [saving, setSaving] = useState(false);

  const update = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleTable = (id: string) => {
    setForm((prev) => ({
      ...prev,
      tableIds: prev.tableIds.includes(id)
        ? prev.tableIds.filter((t) => t !== id)
        : [...prev.tableIds, id],
    }));
  };

  const handleSubmit = async () => {
    if (!form.customerName || !form.timeSlot) return;
    setSaving(true);
    try {
      await api.post('/reservations', {
        action: 'create',
        locationId,
        ...form,
      });
      onCreated();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Nouvelle Reservation</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-lg">&times;</button>
        </div>

        <div className="space-y-3">
          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => update('date', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Heure</label>
              <select
                value={form.timeSlot}
                onChange={(e) => update('timeSlot', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-amber-500/50"
              >
                {Array.from({ length: SLOT_COUNT }, (_, i) => {
                  const t = slotIndexToTime(i);
                  return <option key={t} value={t}>{t}</option>;
                })}
              </select>
            </div>
          </div>

          {/* Duration & Party size */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Duree (min)</label>
              <select
                value={form.duration}
                onChange={(e) => update('duration', parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-amber-500/50"
              >
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
                <option value={120}>120 min</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Couverts</label>
              <input
                type="number"
                min={1}
                max={20}
                value={form.partySize}
                onChange={(e) => update('partySize', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          {/* Customer info */}
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Nom du client *</label>
            <input
              type="text"
              value={form.customerName}
              onChange={(e) => update('customerName', e.target.value)}
              placeholder="Nom complet"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Telephone</label>
              <input
                type="tel"
                value={form.customerPhone}
                onChange={(e) => update('customerPhone', e.target.value)}
                placeholder="0471..."
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Email</label>
              <input
                type="email"
                value={form.customerEmail}
                onChange={(e) => update('customerEmail', e.target.value)}
                placeholder="email@..."
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={2}
              placeholder="Allergies, occasion speciale..."
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 resize-none"
            />
          </div>

          {/* Table selection */}
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Tables</label>
            <div className="flex flex-wrap gap-2">
              {tables.filter((t) => t.active).map((t) => (
                <button
                  key={t.id}
                  onClick={() => toggleTable(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    form.tableIds.includes(t.id)
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  T{t.number} ({t.capacity}p)
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 text-sm hover:text-white"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.customerName}
            className="flex-1 px-3 py-2 rounded-lg bg-amber-500 text-black font-medium text-sm hover:bg-amber-400 disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Creer'}
          </button>
        </div>
      </div>
    </div>
  );
}
