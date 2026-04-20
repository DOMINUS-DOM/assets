'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  active: boolean;
  createdAt: string;
  _count: { locations: number; users: number };
}

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<OrgRow[]>('/organizations')
      .then(setOrgs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleActive = async (org: OrgRow) => {
    try {
      await api.post('/organizations', { action: 'toggleActive', id: org.id, active: !org.active });
      setOrgs((prev) => prev.map((o) => o.id === org.id ? { ...o, active: !o.active } : o));
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Organisations</h1>
        <Link href="/admin/organizations/new"
          className="px-4 py-2 rounded-lg bg-brand text-zinc-950 font-bold text-sm hover:opacity-90 transition-opacity">
          + Nouvelle organisation
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-500">Chargement...</div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">Aucune organisation</div>
      ) : (
        <div className="space-y-3">
          {orgs.map((org) => (
            <div key={org.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">{org.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${org.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                    {org.active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {org.slug}.platform.com
                  {org.customDomain && <span className="ml-2 text-zinc-400">({org.customDomain})</span>}
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  {org._count.locations} site{org._count.locations > 1 ? 's' : ''} · {org._count.users} utilisateur{org._count.users > 1 ? 's' : ''} · {new Date(org.createdAt).toLocaleDateString('fr-BE')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(org)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                  {org.active ? 'Desactiver' : 'Activer'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
