'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const BASE_PRICE = 49;
const ADDON_PRICES: Record<string, number> = {
  web: 19, kiosk: 19, kds: 9, analytics: 9, multiusers: 15,
};

export default function PlatformRevenue() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any[]>('/organizations').then(setOrgs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Calculate MRR
  const payingOrgs = orgs.filter((o) => o.subscriptionStatus === 'active');
  const mrr = payingOrgs.reduce((sum, o) => {
    let orgRevenue = BASE_PRICE;
    try {
      const addons: string[] = JSON.parse(o.addons || '[]');
      addons.forEach((a) => { orgRevenue += ADDON_PRICES[a] || 0; });
    } catch {}
    return sum + orgRevenue;
  }, 0);

  const trialOrgs = orgs.filter((o) => o.subscriptionStatus === 'trial');
  const expiredOrgs = orgs.filter((o) => ['expired', 'cancelled', 'past_due'].includes(o.subscriptionStatus || ''));

  // Trial conversion rate
  const totalNonTrial = payingOrgs.length + expiredOrgs.length;
  const conversionRate = totalNonTrial > 0 ? Math.round((payingOrgs.length / totalNonTrial) * 100) : 0;

  // Average revenue per paying customer
  const arpc = payingOrgs.length > 0 ? Math.round(mrr / payingOrgs.length) : 0;

  // Trials expiring soon (< 3 days)
  const trialsExpiringSoon = trialOrgs.filter((o) => {
    if (!o.trialEndsAt) return false;
    const days = Math.ceil((new Date(o.trialEndsAt).getTime() - Date.now()) / 86400000);
    return days > 0 && days <= 3;
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">Revenue</h1>
        <p className="text-[14px] text-[#8A8A8A] mt-1">Metriques business de la plateforme.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="p-5 rounded-xl bg-white border border-[#E5E2DC]">
          <p className="text-3xl font-bold text-[#1A1A1A] tabular-nums">{loading ? '—' : `${mrr} \u20ac`}</p>
          <p className="text-[12px] text-[#B0ADA6] mt-1">MRR (Monthly Recurring Revenue)</p>
        </div>
        <div className="p-5 rounded-xl bg-white border border-[#E5E2DC]">
          <p className="text-3xl font-bold text-[#1A1A1A] tabular-nums">{loading ? '—' : payingOrgs.length}</p>
          <p className="text-[12px] text-[#B0ADA6] mt-1">Clients payants</p>
        </div>
        <div className="p-5 rounded-xl bg-white border border-[#E5E2DC]">
          <p className="text-3xl font-bold text-[#1A1A1A] tabular-nums">{loading ? '—' : `${arpc} \u20ac`}</p>
          <p className="text-[12px] text-[#B0ADA6] mt-1">Revenu moyen / client</p>
        </div>
        <div className="p-5 rounded-xl bg-white border border-[#E5E2DC]">
          <p className="text-3xl font-bold tabular-nums" style={{ color: conversionRate >= 50 ? '#10B981' : conversionRate >= 25 ? '#F59E0B' : '#EF4444' }}>
            {loading ? '—' : `${conversionRate}%`}
          </p>
          <p className="text-[12px] text-[#B0ADA6] mt-1">Taux de conversion trial</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Funnel */}
        <div className="bg-white rounded-xl border border-[#E5E2DC] p-5">
          <h2 className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#B0ADA6] mb-5">Funnel</h2>
          <div className="space-y-4">
            {[
              { label: 'Total inscrits', value: orgs.length, color: '#1A1A1A', width: '100%' },
              { label: 'En trial', value: trialOrgs.length, color: '#7C3AED', width: `${orgs.length > 0 ? (trialOrgs.length / orgs.length) * 100 : 0}%` },
              { label: 'Payants', value: payingOrgs.length, color: '#10B981', width: `${orgs.length > 0 ? (payingOrgs.length / orgs.length) * 100 : 0}%` },
              { label: 'Perdus', value: expiredOrgs.length, color: '#EF4444', width: `${orgs.length > 0 ? (expiredOrgs.length / orgs.length) * 100 : 0}%` },
            ].map((f, i) => (
              <div key={i}>
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="text-[#6B6B6B]">{f.label}</span>
                  <span className="font-medium text-[#1A1A1A]">{f.value}</span>
                </div>
                <div className="h-2 rounded-full bg-[#F5F3EF]">
                  <div className="h-2 rounded-full transition-all duration-500" style={{ width: f.width, backgroundColor: f.color, minWidth: f.value > 0 ? '8px' : '0' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trials expiring soon */}
        <div className="bg-white rounded-xl border border-[#E5E2DC] p-5">
          <h2 className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#B0ADA6] mb-5">Trials expirant bientot</h2>
          {trialsExpiringSoon.length === 0 ? (
            <p className="text-[13px] text-[#B0ADA6] py-4">Aucun trial critique pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {trialsExpiringSoon.map((org) => {
                const days = Math.ceil((new Date(org.trialEndsAt).getTime() - Date.now()) / 86400000);
                return (
                  <div key={org.id} className="flex items-center justify-between py-2 border-b border-[#F5F3EF] last:border-0">
                    <div>
                      <p className="text-[13px] font-medium text-[#1A1A1A]">{org.name}</p>
                      <p className="text-[11px] text-[#B0ADA6]">{org.slug}.brizoapp.com</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700">
                      {days}j restants
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Paying clients breakdown */}
        <div className="bg-white rounded-xl border border-[#E5E2DC] p-5 lg:col-span-2">
          <h2 className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#B0ADA6] mb-5">Clients payants</h2>
          {payingOrgs.length === 0 ? (
            <p className="text-[13px] text-[#B0ADA6] py-4">Aucun client payant pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] text-[#B0ADA6] uppercase tracking-wider">
                    <th className="pb-3">Restaurant</th>
                    <th className="pb-3">Plan</th>
                    <th className="pb-3">Addons</th>
                    <th className="pb-3 text-right">MRR</th>
                  </tr>
                </thead>
                <tbody>
                  {payingOrgs.map((org) => {
                    const addons: string[] = (() => { try { return JSON.parse(org.addons || '[]'); } catch { return []; } })();
                    const rev = BASE_PRICE + addons.reduce((s, a) => s + (ADDON_PRICES[a] || 0), 0);
                    return (
                      <tr key={org.id} className="border-t border-[#F5F3EF]">
                        <td className="py-3 text-[#1A1A1A] font-medium">{org.name}</td>
                        <td className="py-3 text-[#8A8A8A]">{org.planType || 'Base'}</td>
                        <td className="py-3 text-[#8A8A8A]">{addons.length > 0 ? addons.join(', ') : '—'}</td>
                        <td className="py-3 text-right font-medium text-[#1A1A1A]">{rev} &euro;</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#E5E2DC]">
                    <td colSpan={3} className="py-3 font-bold text-[#1A1A1A]">Total MRR</td>
                    <td className="py-3 text-right font-bold text-[#1A1A1A]">{mrr} &euro;</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
