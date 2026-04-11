'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useLocation } from '@/contexts/LocationContext';
import { useApiData } from '@/hooks/useApiData';
import { formatPrice } from '@/utils/format';

interface Table {
  id: string;
  number: number;
  seats: number;
  status: 'free' | 'occupied' | 'reserved' | 'cleaning';
  orderId?: string;
  customerName?: string;
  total?: number;
  occupiedSince?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  free: { label: 'Libre', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  occupied: { label: 'Occupee', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  reserved: { label: 'Reservee', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  cleaning: { label: 'Nettoyage', color: 'text-zinc-400', bg: 'bg-zinc-700/50 border-zinc-600/30' },
};

export default function TablesPage() {
  const { locationId } = useLocation();
  const locParam = locationId ? `?locationId=${locationId}` : '';
  const { data: orders } = useApiData<any[]>(`/orders${locParam}`, []);

  // Tables state — persisted in localStorage per location
  const storageKey = `2h-tables-${locationId || 'all'}`;
  const [tables, setTables] = useState<Table[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTable, setNewTable] = useState({ number: 1, seats: 4 });
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  // Load tables from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setTables(JSON.parse(stored));
      else {
        // Default tables
        const defaults: Table[] = Array.from({ length: 8 }, (_, i) => ({
          id: `table-${i + 1}`,
          number: i + 1,
          seats: i < 4 ? 2 : i < 6 ? 4 : 6,
          status: 'free' as const,
        }));
        setTables(defaults);
      }
    } catch {}
  }, [storageKey]);

  // Save to localStorage on change
  useEffect(() => {
    if (tables.length > 0) {
      try { localStorage.setItem(storageKey, JSON.stringify(tables)); } catch {}
    }
  }, [tables, storageKey]);

  const updateTable = (id: string, data: Partial<Table>) => {
    setTables((prev) => prev.map((t) => t.id === id ? { ...t, ...data } : t));
  };

  const addTable = () => {
    const id = `table-${Date.now()}`;
    setTables((prev) => [...prev, { id, number: newTable.number, seats: newTable.seats, status: 'free' }]);
    setNewTable({ number: Math.max(...tables.map((t) => t.number), 0) + 2, seats: 4 });
    setShowAdd(false);
  };

  const removeTable = (id: string) => {
    setTables((prev) => prev.filter((t) => t.id !== id));
    if (selectedTable === id) setSelectedTable(null);
  };

  const freeCount = tables.filter((t) => t.status === 'free').length;
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;

  const ic = 'px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-amber-500/50';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Plan de salle</h1>
          <p className="text-xs text-zinc-500 mt-1">
            {freeCount} libre{freeCount > 1 ? 's' : ''} · {occupiedCount} occupee{occupiedCount > 1 ? 's' : ''} · {tables.length} total
          </p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="px-3 py-1.5 rounded-lg bg-amber-500 text-zinc-950 text-sm font-bold hover:bg-amber-400">
          {showAdd ? 'Annuler' : '+ Table'}
        </button>
      </div>

      {showAdd && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">N°</label>
            <input type="number" value={newTable.number} onChange={(e) => setNewTable({ ...newTable, number: parseInt(e.target.value) || 1 })}
              className={`${ic} w-20`} min={1} />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Places</label>
            <input type="number" value={newTable.seats} onChange={(e) => setNewTable({ ...newTable, seats: parseInt(e.target.value) || 2 })}
              className={`${ic} w-20`} min={1} max={20} />
          </div>
          <button onClick={addTable} className="px-4 py-2.5 rounded-lg bg-amber-500 text-zinc-950 text-sm font-bold mt-4">Ajouter</button>
        </div>
      )}

      {/* Table grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {tables.map((table) => {
          const cfg = STATUS_CONFIG[table.status];
          const isSelected = selectedTable === table.id;
          return (
            <button
              key={table.id}
              onClick={() => setSelectedTable(isSelected ? null : table.id)}
              className={`relative p-4 rounded-2xl border-2 text-center transition-all active:scale-95 ${
                isSelected ? 'ring-2 ring-amber-500 ' : ''
              }${cfg.bg}`}
            >
              <p className="text-2xl font-black text-white">{table.number}</p>
              <p className={`text-xs font-bold mt-1 ${cfg.color}`}>{cfg.label}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{table.seats} places</p>
              {table.customerName && (
                <p className="text-[10px] text-zinc-400 mt-1 truncate">{table.customerName}</p>
              )}
              {table.total != null && table.total > 0 && (
                <p className="text-xs text-amber-400 font-bold mt-0.5">{formatPrice(table.total)} €</p>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected table actions */}
      {selectedTable && (() => {
        const table = tables.find((t) => t.id === selectedTable);
        if (!table) return null;
        return (
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Table {table.number}</h3>
              <span className={`text-xs font-bold ${STATUS_CONFIG[table.status].color}`}>
                {STATUS_CONFIG[table.status].label}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button onClick={() => updateTable(table.id, { status: 'free', customerName: undefined, total: undefined, orderId: undefined })}
                className="py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs font-bold active:scale-95">
                Liberer
              </button>
              <button onClick={() => {
                const name = prompt('Nom du client :') || 'Client';
                updateTable(table.id, { status: 'occupied', customerName: name, occupiedSince: new Date().toISOString() });
              }}
                className="py-2.5 rounded-xl bg-amber-500/15 text-amber-400 text-xs font-bold active:scale-95">
                Occuper
              </button>
              <button onClick={() => updateTable(table.id, { status: 'reserved' })}
                className="py-2.5 rounded-xl bg-blue-500/15 text-blue-400 text-xs font-bold active:scale-95">
                Reserver
              </button>
              <button onClick={() => updateTable(table.id, { status: 'cleaning' })}
                className="py-2.5 rounded-xl bg-zinc-700/50 text-zinc-400 text-xs font-bold active:scale-95">
                Nettoyage
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <button onClick={() => removeTable(table.id)}
                className="text-xs text-red-400 hover:text-red-300">Supprimer cette table</button>
              <button onClick={() => setSelectedTable(null)}
                className="text-xs text-zinc-500">Fermer</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
