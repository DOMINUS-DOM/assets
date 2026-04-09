'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatPrice } from '@/utils/format';

const DeliveryMap = dynamic(() => import('@/components/DeliveryMap'), { ssr: false });

const DEMO_ZONES = [
  { id: 'z1', name: 'La Louvière Centre', fee: 2.50, color: '#22c55e', center: [50.479, 4.186] as [number, number], radius: 2000 },
  { id: 'z2', name: 'Haine-Saint-Paul', fee: 3.00, color: '#f59e0b', center: [50.468, 4.172] as [number, number], radius: 2500 },
  { id: 'z3', name: 'Manage', fee: 4.00, color: '#3b82f6', center: [50.503, 4.234] as [number, number], radius: 3000 },
  { id: 'z4', name: 'Binche', fee: 5.00, color: '#ef4444', center: [50.409, 4.165] as [number, number], radius: 2500 },
];

const DEMO_DRIVERS = [
  { id: 'drv-1', name: 'Karim B.', lat: 50.476, lng: 4.191 },
  { id: 'drv-2', name: 'Sophie M.', lat: 50.501, lng: 4.229 },
];

export default function ZonesPage() {
  const { t } = useLanguage();
  const [zones] = useState(DEMO_ZONES);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">{t.ui.zone_title}</h1>

      {/* Map */}
      <DeliveryMap zones={zones} drivers={DEMO_DRIVERS} height="450px" />

      {/* Zone legend */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t.ui.zone_list}</h2>
        {zones.map((z) => (
          <div key={z.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50">
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: z.color }} />
              <div>
                <p className="text-sm font-medium text-white">{z.name}</p>
                <p className="text-xs text-zinc-500">{t.ui.zone_radius}: {(z.radius / 1000).toFixed(1)} km</p>
              </div>
            </div>
            <span className="text-sm font-bold text-amber-400">{formatPrice(z.fee)} €</span>
          </div>
        ))}
      </div>
    </div>
  );
}
