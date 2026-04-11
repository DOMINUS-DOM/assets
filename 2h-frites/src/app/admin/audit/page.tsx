'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useLocation } from '@/contexts/LocationContext';

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-emerald-500/15 text-emerald-400',
  update: 'bg-amber-500/15 text-amber-400',
  delete: 'bg-red-500/15 text-red-400',
  status_change: 'bg-blue-500/15 text-blue-400',
  login: 'bg-purple-500/15 text-purple-400',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Cr\u00e9ation',
  update: 'Modification',
  delete: 'Suppression',
  status_change: 'Statut',
  login: 'Connexion',
};

export default function AuditPage() {
  const { locationId } = useLocation();
  const [logs, setLogs] = useState<any[]>([]);
  const [limit, setLimit] = useState(50);
  const [entityFilter, setEntityFilter] = useState('all');

  const refresh = async () => {
    try {
      const locParam = locationId ? `&locationId=${locationId}` : '';
      const data = await api.get<any[]>(`/audit?limit=${limit}${locParam}`);
      setLogs(data);
    } catch {}
  };

  useEffect(() => { refresh(); }, [limit, locationId]);

  const entities = [...new Set(logs.map((l) => l.entity))].sort();
  const filtered = entityFilter === 'all' ? logs : logs.filter((l) => l.entity === entityFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Journal d&apos;audit</h1>
        <span className="text-sm text-zinc-500">{filtered.length} entr\u00e9e{filtered.length > 1 ? 's' : ''}</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 focus:outline-none">
          <option value="all">Toutes les entit\u00e9s</option>
          {entities.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={limit} onChange={(e) => setLimit(+e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 focus:outline-none">
          <option value={25}>25 derniers</option>
          <option value={50}>50 derniers</option>
          <option value={100}>100 derniers</option>
          <option value={200}>200 derniers</option>
        </select>
      </div>

      {/* Log entries */}
      <div className="space-y-1.5">
        {filtered.map((log) => {
          let changes: Record<string, any> = {};
          try { changes = JSON.parse(log.changes || '{}'); } catch {}
          const changeKeys = Object.keys(changes);

          return (
            <div key={log.id} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ACTION_COLORS[log.action] || ACTION_COLORS.update}`}>
                    {ACTION_LABELS[log.action] || log.action}
                  </span>
                  <span className="text-sm font-medium text-white">{log.entity}</span>
                  <span className="text-xs text-zinc-600 font-mono">{log.entityId?.slice(0, 8)}</span>
                </div>
                <span className="text-[10px] text-zinc-600">
                  {new Date(log.createdAt).toLocaleString('fr-BE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <span>👤 {log.user?.name || 'Syst\u00e8me'}</span>
                {log.location && <span>📍 {log.location.name}</span>}
              </div>
              {changeKeys.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {changeKeys.map((k) => (
                    <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      {k}: <span className="text-white">{String(changes[k]).slice(0, 30)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">Aucun log</p>}
      </div>

      {logs.length >= limit && (
        <button onClick={() => setLimit(limit + 50)} className="w-full py-2 text-center text-xs text-amber-400 hover:text-amber-300">
          Charger plus...
        </button>
      )}
    </div>
  );
}
