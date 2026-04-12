'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useLocation } from '@/contexts/LocationContext';
import { useLanguage } from '@/i18n/LanguageContext';

type TableStatus = 'free' | 'occupied' | 'reserved' | 'cleaning';
type Zone = 'all' | 'main' | 'terrace' | 'vip';

interface FloorTable {
  id: string;
  locationId: string;
  number: number;
  capacity: number;
  zone: string;
  status: TableStatus;
  active: boolean;
}

const STATUS_COLORS: Record<TableStatus, string> = {
  free: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
  occupied: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
  reserved: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
  cleaning: 'bg-zinc-500/15 border-zinc-500/30 text-zinc-400',
};

const STATUS_DOT: Record<TableStatus, string> = {
  free: 'bg-emerald-400',
  occupied: 'bg-amber-400',
  reserved: 'bg-blue-400',
  cleaning: 'bg-zinc-400',
};

const STATUS_LABEL_KEYS: Record<TableStatus, string> = {
  free: 'tbl_free',
  occupied: 'tbl_occupied',
  reserved: 'tbl_reserved',
  cleaning: 'tbl_cleaning',
};

const ZONE_LABEL_KEYS: Record<string, string> = {
  main: 'tbl_zoneMain',
  terrace: 'tbl_zoneTerrace',
  vip: 'tbl_zoneVip',
};

export default function TablesPage() {
  const { locationId } = useLocation();
  const { t } = useLanguage();
  const [tables, setTables] = useState<FloorTable[]>([]);
  const [zone, setZone] = useState<Zone>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ number: '', capacity: '4', zone: 'main' });

  const refresh = async () => {
    try {
      const locParam = locationId ? `?locationId=${locationId}` : '';
      const data = await api.get<FloorTable[]>(`/tables${locParam}`);
      setTables(data);
    } catch {}
  };

  useEffect(() => { refresh(); }, [locationId]);

  const filtered = zone === 'all' ? tables : tables.filter((t) => t.zone === zone);

  const handleStatusChange = async (id: string, status: TableStatus) => {
    try {
      await api.post('/tables', { action: 'updateStatus', id, status });
      refresh();
    } catch {}
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.number || !locationId) return;
    await api.post('/tables', {
      action: 'create',
      number: parseInt(form.number),
      capacity: parseInt(form.capacity) || 4,
      zone: form.zone,
      locationId,
    });
    setForm({ number: '', capacity: '4', zone: 'main' });
    setShowAdd(false);
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.ui.tbl_deleteConfirm)) return;
    await api.post('/tables', { action: 'delete', id });
    refresh();
  };

  const ic = 'w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-amber-500/50';

  const counts = {
    free: tables.filter((t) => t.status === 'free').length,
    occupied: tables.filter((t) => t.status === 'occupied').length,
    reserved: tables.filter((t) => t.status === 'reserved').length,
    cleaning: tables.filter((t) => t.status === 'cleaning').length,
  };

  const ZONE_TABS: { key: Zone; label: string }[] = [
    { key: 'all', label: t.ui.tbl_zoneAll },
    { key: 'main', label: t.ui.tbl_zoneMain },
    { key: 'terrace', label: t.ui.tbl_zoneTerrace },
    { key: 'vip', label: t.ui.tbl_zoneVip },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">{t.ui.tbl_title}</h1>
        <span className="text-sm text-zinc-500">{tables.length} {t.ui.tbl_tables}</span>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-4 gap-2">
        {(Object.keys(counts) as TableStatus[]).map((s) => (
          <div key={s} className={`p-2 rounded-lg border text-center ${STATUS_COLORS[s]}`}>
            <div className="text-lg font-bold">{counts[s]}</div>
            <div className="text-[10px] uppercase tracking-wider">{t.ui[STATUS_LABEL_KEYS[s]]}</div>
          </div>
        ))}
      </div>

      {/* Zone tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {ZONE_TABS.map((zt) => (
          <button key={zt.key} onClick={() => setZone(zt.key)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${zone === zt.key ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500'}`}>
            {zt.label}
          </button>
        ))}
      </div>

      {/* Add table */}
      <button onClick={() => setShowAdd(!showAdd)}
        className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 font-bold text-sm">
        {showAdd ? t.ui.tbl_close : t.ui.tbl_addBtn}
      </button>

      {showAdd && (
        <form onSubmit={handleAdd} className="p-4 rounded-xl bg-zinc-900 border border-amber-500/30 space-y-2">
          <h3 className="text-sm font-bold text-white">{t.ui.tbl_addTable}</h3>
          <div className="grid grid-cols-3 gap-2">
            <input className={ic} type="number" placeholder={t.ui.tbl_numberPlaceholder} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required />
            <input className={ic} type="number" placeholder={t.ui.tbl_seatsPlaceholder} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            <select className={ic} value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })}>
              <option value="main">{t.ui.tbl_zoneMain}</option>
              <option value="terrace">{t.ui.tbl_zoneTerrace}</option>
              <option value="vip">{t.ui.tbl_zoneVip}</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm">{t.ui.tbl_cancel}</button>
            <button type="submit" className="flex-1 py-2 rounded-lg bg-amber-500 text-zinc-950 font-bold text-sm">{t.ui.tbl_add}</button>
          </div>
        </form>
      )}

      {/* Table grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((table) => (
          <div key={table.id} className={`p-3 rounded-xl border ${STATUS_COLORS[table.status]}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[table.status]}`} />
                <span className="text-sm font-bold">{t.ui.tbl_tableLabel} {table.number}</span>
              </div>
              <button onClick={() => handleDelete(table.id)}
                className="text-zinc-600 hover:text-red-400 text-xs p-1">&#10005;</button>
            </div>
            <div className="flex items-center justify-between mb-2 text-[10px] uppercase tracking-wider opacity-70">
              <span>{table.capacity} {t.ui.tbl_seats}</span>
              <span>{t.ui[ZONE_LABEL_KEYS[table.zone]] || table.zone}</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <button onClick={() => handleStatusChange(table.id, 'free')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${table.status === 'free' ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-emerald-400'}`}>
                {t.ui.tbl_setFree}
              </button>
              <button onClick={() => handleStatusChange(table.id, 'occupied')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${table.status === 'occupied' ? 'bg-amber-500 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-amber-400'}`}>
                {t.ui.tbl_setOccupied}
              </button>
              <button onClick={() => handleStatusChange(table.id, 'reserved')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${table.status === 'reserved' ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-blue-400'}`}>
                {t.ui.tbl_setReserved}
              </button>
              <button onClick={() => handleStatusChange(table.id, 'cleaning')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${table.status === 'cleaning' ? 'bg-zinc-500 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
                {t.ui.tbl_setCleaning}
              </button>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <p className="text-zinc-500 text-sm text-center py-6">{t.ui.tbl_noTables}</p>}
    </div>
  );
}
