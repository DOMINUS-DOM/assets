'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Org {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  subscriptionStatus: string;
  planType: string | null;
  trialEndsAt: string | null;
  active: boolean;
  createdAt: string;
  addons: string;
  _count: { locations: number; users: number };
}

export default function PlatformClients() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Org | null>(null);
  const [slugInput, setSlugInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function refetch() {
    const list = await api.get<Org[]>('/organizations').catch(() => null);
    if (list) setOrgs(list);
  }

  useEffect(() => {
    api.get<Org[]>('/organizations').then(setOrgs).catch((e) => setError(e?.message || 'load_failed')).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? orgs : orgs.filter((o) => (o.subscriptionStatus || 'trial') === filter);

  const toggleActive = async (e: React.MouseEvent, org: Org) => {
    e.stopPropagation(); // prevent row navigation
    setError(null);
    setBusyId(org.id);
    try {
      const updated = await api.post<Org>('/organizations', { action: 'toggleActive', id: org.id, active: !org.active });
      // Trust the server response so the UI reflects the real DB state.
      setOrgs((prev) => prev.map((o) => (o.id === org.id ? { ...o, active: updated.active } : o)));
    } catch (err: any) {
      setError(`Échec de la bascule actif/suspendu : ${err?.message || 'erreur inconnue'}`);
      // Resync with server so the UI doesn't stay optimistic.
      refetch();
    } finally {
      setBusyId(null);
    }
  };

  const canDelete = (org: Org) => !(org.active && org.subscriptionStatus === 'active');
  const openDelete = (e: React.MouseEvent, org: Org) => {
    e.stopPropagation();
    setError(null);
    setSlugInput('');
    setDeleteTarget(org);
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setError(null);
    setDeleting(true);
    try {
      await api.post('/organizations', { action: 'delete', id: deleteTarget.id, confirmSlug: slugInput });
      setOrgs((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      setDeleteTarget(null);
      setSlugInput('');
    } catch (err: any) {
      setError(`Échec de la suppression : ${err?.message || 'erreur inconnue'}`);
    } finally {
      setDeleting(false);
    }
  };

  const trialDaysLeft = (trialEndsAt: string | null) => {
    if (!trialEndsAt) return null;
    const days = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000);
    return days > 0 ? days : 0;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">Clients</h1>
          <p className="text-[14px] text-[#8A8A8A] mt-1">{orgs.length} organisation{orgs.length > 1 ? 's' : ''} enregistree{orgs.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-[13px] text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 ml-4 text-lg leading-none">×</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'all', label: 'Tous' },
          { key: 'trial', label: 'Trial' },
          { key: 'active', label: 'Actifs' },
          { key: 'expired', label: 'Expires' },
          { key: 'cancelled', label: 'Annules' },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
              filter === f.key ? 'bg-[#1A1A1A] text-white' : 'bg-white text-[#8A8A8A] border border-[#E5E2DC] hover:text-[#1A1A1A]'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-[#B0ADA6] text-sm">Chargement...</div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E2DC] overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-[#EDEBE7] text-[11px] font-semibold text-[#B0ADA6] uppercase tracking-wider">
            <div className="col-span-3">Restaurant</div>
            <div className="col-span-2">Statut</div>
            <div className="col-span-2">Trial</div>
            <div className="col-span-2">Modules</div>
            <div className="col-span-1">Sites</div>
            <div className="col-span-1">Users</div>
            <div className="col-span-1">Actions</div>
          </div>

          {/* Rows */}
          {filtered.map((org) => {
            const days = trialDaysLeft(org.trialEndsAt);
            const addons = (() => { try { return JSON.parse(org.addons || '[]'); } catch { return []; } })();
            return (
              <div key={org.id} onClick={() => router.push(`/admin/platform/clients/${org.id}`)} className="grid grid-cols-12 gap-4 px-5 py-3.5 border-b border-[#F5F3EF] last:border-0 items-center hover:bg-[#FAFAF8] transition-colors cursor-pointer">
                {/* Name */}
                <div className="col-span-3">
                  <p className="text-[14px] font-medium text-[#1A1A1A] truncate">{org.name}</p>
                  <p className="text-[11px] text-[#B0ADA6] truncate">{org.slug}.brizoapp.com</p>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                    org.subscriptionStatus === 'active' ? 'bg-emerald-50 text-emerald-700' :
                    org.subscriptionStatus === 'trial' ? 'bg-violet-50 text-violet-700' :
                    org.subscriptionStatus === 'past_due' ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {org.subscriptionStatus || 'trial'}
                  </span>
                  {!org.active && <span className="ml-1 text-[10px] text-red-500">inactif</span>}
                </div>

                {/* Trial */}
                <div className="col-span-2 text-[13px] text-[#8A8A8A]">
                  {days !== null ? (days > 0 ? `${days}j restants` : 'Expire') : '—'}
                </div>

                {/* Addons */}
                <div className="col-span-2 text-[11px] text-[#B0ADA6]">
                  {addons.length > 0 ? addons.join(', ') : 'Base'}
                </div>

                {/* Sites */}
                <div className="col-span-1 text-[13px] text-[#8A8A8A]">
                  {org._count?.locations || 0}
                </div>

                {/* Users */}
                <div className="col-span-1 text-[13px] text-[#8A8A8A]">
                  {org._count?.users || 0}
                </div>

                {/* Actions */}
                <div className="col-span-1 flex items-center gap-1">
                  <button
                    onClick={(e) => toggleActive(e, org)}
                    disabled={busyId === org.id}
                    className={`text-[11px] font-medium px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      org.active ? 'text-red-500 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'
                    }`}>
                    {busyId === org.id ? '…' : (org.active ? 'Suspendre' : 'Activer')}
                  </button>
                  <button
                    onClick={(e) => openDelete(e, org)}
                    disabled={!canDelete(org)}
                    title={canDelete(org) ? 'Supprimer' : 'Tenant actif payant — suspendre d\'abord'}
                    className="text-[11px] font-medium px-2 py-1 rounded text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    🗑
                  </button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-8 text-[#B0ADA6] text-sm">Aucun client dans ce filtre.</div>
          )}
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">Supprimer ce tenant ?</h2>
            <p className="text-[13px] text-[#8A8A8A] mb-4">
              Cette action est <strong className="text-red-600">irréversible</strong>. Toutes les données associées seront supprimées :
              organisation, locations, utilisateurs, menu, commandes, employés.
            </p>
            <div className="mb-4 p-3 rounded-lg bg-[#FAFAF8] border border-[#E5E2DC] text-[13px]">
              <p className="text-[#8A8A8A]">Tenant :</p>
              <p className="font-semibold text-[#1A1A1A]">{deleteTarget.name}</p>
              <p className="text-[11px] text-[#B0ADA6] font-mono mt-1">{deleteTarget.slug}</p>
            </div>
            <label className="block text-[12px] font-medium text-[#8A8A8A] mb-1.5">
              Tape <code className="px-1 py-0.5 rounded bg-red-50 text-red-700 font-mono">{deleteTarget.slug}</code> pour confirmer
            </label>
            <input
              autoFocus
              value={slugInput}
              onChange={(e) => setSlugInput(e.target.value)}
              disabled={deleting}
              placeholder={deleteTarget.slug}
              className="w-full px-3 py-2.5 rounded-lg border border-[#E5E2DC] focus:outline-none focus:border-red-400 font-mono text-[13px] disabled:bg-[#F5F3EF]"
            />
            <div className="flex gap-2 mt-5 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-[13px] font-medium text-[#8A8A8A] hover:bg-[#F5F3EF] disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting || slugInput !== deleteTarget.slug}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
