'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/i18n/LanguageContext';
import { useApiData } from '@/hooks/useApiData';
import { formatPrice } from '@/utils/format';

const DeliveryMap = dynamic(() => import('@/components/DeliveryMap'), { ssr: false });

const ZONE_COLORS = ['#22c55e', '#f59e0b', '#3b82f6', '#ef4444', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];

export default function ZonesPage() {
  const { t } = useLanguage();
  const { data: settings } = useApiData<any>('/settings', {});
  const { data: driversData } = useApiData<any[]>('/drivers/location', []);

  const deliveryZones = settings?.deliveryZones || [];

  const zones = deliveryZones.map((z: any, i: number) => ({
    id: z.id,
    name: z.name,
    fee: z.fee,
    color: ZONE_COLORS[i % ZONE_COLORS.length],
    center: [50.479 + (i * 0.015), 4.186 + (i * 0.02)] as [number, number],
    radius: 2000 + (i * 500),
    active: z.active,
    postalCodes: z.postalCodes,
    minOrder: z.minOrder,
  }));

  const drivers = (driversData || []).map((d: any) => ({
    id: d.id,
    name: d.name,
    lat: d.lastLat,
    lng: d.lastLng,
  })).filter((d: any) => d.lat && d.lng);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">{t.ui.zone_title}</h1>

      {/* Map */}
      <DeliveryMap zones={zones.filter((z: any) => z.active)} drivers={drivers} height="450px" />

      {/* Zone legend */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t.ui.zone_list}</h2>
        {zones.length === 0 && (
          <p className="text-zinc-500 text-sm text-center py-8">Aucune zone configurée. Allez dans Réglages → Livraison pour ajouter des zones.</p>
        )}
        {zones.map((z: any) => (
          <div key={z.id} className={`flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50 ${!z.active ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: z.color }} />
              <div>
                <p className="text-sm font-medium text-white">{z.name}</p>
                <p className="text-xs text-zinc-500">{z.postalCodes?.join(', ')} — min. {formatPrice(z.minOrder || 0)} €</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-amber-400">{formatPrice(z.fee)} €</span>
              {!z.active && <span className="text-xs text-red-400">Inactive</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
