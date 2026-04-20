'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  subscriptionStatus: string;
  planType: string | null;
  trialEndsAt: string | null;
  addons: string;
  active: boolean;
  createdAt: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  locations: { id: string; name: string; slug: string; city: string; active: boolean }[];
  users: { id: string; name: string; email: string; role: string; active: boolean; createdAt: string }[];
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.post<OrgDetail>('/organizations', { action: 'getDetail', id })
      .then(setOrg).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (status: string) => {
    setSaving(true);
    try {
      await api.post('/organizations', { action: 'updateSubscription', id, subscriptionStatus: status });
      setOrg((prev) => prev ? { ...prev, subscriptionStatus: status } : prev);
    } catch {} finally { setSaving(false); }
  };

  const toggleActive = async () => {
    if (!org) return;
    setSaving(true);
    try {
      await api.post('/organizations', { action: 'toggleActive', id, active: !org.active });
      setOrg((prev) => prev ? { ...prev, active: !prev.active } : prev);
    } catch {} finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-12 text-[#B0ADA6]">Chargement...</div>;
  if (!org) return <div className="text-center py-12 text-red-500">Client introuvable.</div>;

  const trialDays = org.trialEndsAt ? Math.max(0, Math.ceil((new Date(org.trialEndsAt).getTime() - Date.now()) / 86400000)) : null;
  const addons: string[] = (() => { try { return JSON.parse(org.addons || '[]'); } catch { return []; } })();

  const statusColors: Record<string, string> = {
    trial: 'bg-violet-50 text-violet-700',
    active: 'bg-emerald-50 text-emerald-700',
    past_due: 'bg-amber-50 text-amber-700',
    cancelled: 'bg-red-50 text-red-700',
    expired: 'bg-red-50 text-red-700',
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-[#B0ADA6] mb-6">
        <Link href="/admin/platform/clients" className="hover:text-[#1A1A1A] transition-colors">Clients</Link>
        <span>/</span>
        <span className="text-[#1A1A1A]">{org.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">{org.name}</h1>
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${statusColors[org.subscriptionStatus] || statusColors.trial}`}>
              {org.subscriptionStatus || 'trial'}
            </span>
            {!org.active && <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">SUSPENDU</span>}
          </div>
          <p className="text-[13px] text-[#B0ADA6]">{org.slug}.brizoapp.com{org.customDomain ? ` · ${org.customDomain}` : ''}</p>
          <p className="text-[12px] text-[#B0ADA6] mt-1">Cree le {new Date(org.createdAt).toLocaleDateString('fr-BE')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleActive} disabled={saving}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50 ${
              org.active ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}>
            {org.active ? 'Suspendre' : 'Reactiver'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ─── Col 1: Abonnement ─── */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-[#E5E2DC] p-5">
            <h2 className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#B0ADA6] mb-4">Abonnement</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-[13px]">
                <span className="text-[#8A8A8A]">Statut</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${statusColors[org.subscriptionStatus] || statusColors.trial}`}>
                  {org.subscriptionStatus || 'trial'}
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#8A8A8A]">Plan</span>
                <span className="text-[#1A1A1A] font-medium">{org.planType || 'Aucun'}</span>
              </div>
              {trialDays !== null && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#8A8A8A]">Trial</span>
                  <span className={`font-medium ${trialDays > 3 ? 'text-violet-600' : trialDays > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                    {trialDays > 0 ? `${trialDays} jours restants` : 'Expire'}
                  </span>
                </div>
              )}
              {org.stripeCustomerId && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#8A8A8A]">Stripe</span>
                  <span className="text-[12px] text-[#B0ADA6] font-mono">{org.stripeCustomerId.slice(0, 18)}...</span>
                </div>
              )}
            </div>

            {/* Status actions */}
            <div className="mt-5 pt-4 border-t border-[#F5F3EF]">
              <p className="text-[11px] text-[#B0ADA6] mb-2">Changer le statut :</p>
              <div className="flex flex-wrap gap-1.5">
                {['trial', 'active', 'expired', 'cancelled'].map((s) => (
                  <button key={s} onClick={() => updateStatus(s)} disabled={saving || org.subscriptionStatus === s}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors disabled:opacity-30 ${
                      org.subscriptionStatus === s ? 'bg-[#1A1A1A] text-white' : 'bg-[#F5F3EF] text-[#8A8A8A] hover:text-[#1A1A1A]'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Modules */}
          <div className="bg-white rounded-xl border border-[#E5E2DC] p-5">
            <h2 className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#B0ADA6] mb-4">Modules</h2>
            <div className="space-y-2">
              {['POS (base)', 'Vente en ligne', 'Kiosk', 'KDS', 'Analytics', 'Multi-users'].map((mod, i) => {
                const keys = ['pos', 'web', 'kiosk', 'kds', 'analytics', 'multiusers'];
                const isBase = i === 0;
                const isActive = isBase || addons.includes(keys[i]) || org.subscriptionStatus === 'trial';
                return (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-[13px] text-[#6B6B6B]">{mod}</span>
                    <span className={`text-[11px] font-medium ${isActive ? 'text-emerald-600' : 'text-[#D4D0C8]'}`}>
                      {isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── Col 2: Locations ─── */}
        <div className="bg-white rounded-xl border border-[#E5E2DC] p-5">
          <h2 className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#B0ADA6] mb-4">
            Sites ({org.locations.length})
          </h2>
          <div className="space-y-3">
            {org.locations.map((loc) => (
              <div key={loc.id} className="flex items-center justify-between py-2 border-b border-[#F5F3EF] last:border-0">
                <div>
                  <p className="text-[13px] font-medium text-[#1A1A1A]">{loc.name}</p>
                  <p className="text-[11px] text-[#B0ADA6]">{loc.city}</p>
                </div>
                <span className={`text-[10px] font-semibold ${loc.active ? 'text-emerald-600' : 'text-red-500'}`}>
                  {loc.active ? 'Actif' : 'Inactif'}
                </span>
              </div>
            ))}
            {org.locations.length === 0 && <p className="text-[13px] text-[#B0ADA6]">Aucun site.</p>}
          </div>
        </div>

        {/* ─── Col 3: Users ─── */}
        <div className="bg-white rounded-xl border border-[#E5E2DC] p-5">
          <h2 className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#B0ADA6] mb-4">
            Utilisateurs ({org.users.length})
          </h2>
          <div className="space-y-3">
            {org.users.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b border-[#F5F3EF] last:border-0">
                <div>
                  <p className="text-[13px] font-medium text-[#1A1A1A]">{u.name}</p>
                  <p className="text-[11px] text-[#B0ADA6]">{u.email}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-[#8A8A8A] bg-[#F5F3EF] px-1.5 py-0.5 rounded">{u.role}</span>
                  {!u.active && <span className="ml-1 text-[10px] text-red-500">inactif</span>}
                </div>
              </div>
            ))}
            {org.users.length === 0 && <p className="text-[13px] text-[#B0ADA6]">Aucun utilisateur.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
