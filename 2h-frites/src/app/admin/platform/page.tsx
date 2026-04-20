'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

interface OrgSummary {
  total: number;
  trial: number;
  active: number;
  expired: number;
}

export default function PlatformOverview() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any[]>('/organizations').then(setOrgs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const summary: OrgSummary = {
    total: orgs.length,
    trial: orgs.filter((o) => o.subscriptionStatus === 'trial').length,
    active: orgs.filter((o) => o.subscriptionStatus === 'active').length,
    expired: orgs.filter((o) => ['expired', 'cancelled', 'past_due'].includes(o.subscriptionStatus || '')).length,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">Plateforme BrizoApp</h1>
        <p className="text-[14px] text-[#8A8A8A] mt-1">Vue d&apos;ensemble de la plateforme.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Clients total', value: summary.total, color: '#1A1A1A' },
          { label: 'En trial', value: summary.trial, color: '#7C3AED' },
          { label: 'Actifs (payants)', value: summary.active, color: '#10B981' },
          { label: 'Expires / Annules', value: summary.expired, color: '#EF4444' },
        ].map((kpi, i) => (
          <div key={i} className="p-5 rounded-xl bg-white border border-[#E5E2DC]">
            <p className="text-3xl font-bold tabular-nums" style={{ color: kpi.color }}>{loading ? '—' : kpi.value}</p>
            <p className="text-[12px] text-[#B0ADA6] mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="flex gap-4">
        <Link href="/admin/platform/clients" className="px-5 py-3 rounded-xl bg-[#1A1A1A] text-white text-[14px] font-medium hover:bg-[#333] transition-colors">
          Voir tous les clients &rarr;
        </Link>
      </div>

      {/* Recent clients */}
      {!loading && orgs.length > 0 && (
        <div className="mt-10">
          <h2 className="text-[12px] font-semibold tracking-[0.15em] uppercase text-[#B0ADA6] mb-4">Derniers clients</h2>
          <div className="bg-white rounded-xl border border-[#E5E2DC] overflow-hidden">
            {orgs.slice(0, 5).map((org, i) => (
              <div key={org.id} className={`flex items-center justify-between px-5 py-3.5 ${i > 0 ? 'border-t border-[#F5F3EF]' : ''}`}>
                <div>
                  <p className="text-[14px] font-medium text-[#1A1A1A]">{org.name}</p>
                  <p className="text-[12px] text-[#B0ADA6]">{org.slug}.brizoapp.com</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    org.subscriptionStatus === 'active' ? 'bg-emerald-50 text-emerald-700' :
                    org.subscriptionStatus === 'trial' ? 'bg-violet-50 text-violet-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {org.subscriptionStatus || 'trial'}
                  </span>
                  <span className="text-[11px] text-[#B0ADA6]">
                    {org._count?.locations || 0} site{(org._count?.locations || 0) > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
