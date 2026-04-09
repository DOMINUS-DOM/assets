'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatPrice } from '@/utils/format';
import Link from 'next/link';

const DeliveryMap = dynamic(() => import('@/components/DeliveryMap'), { ssr: false });

const ZONES = [
  { id: 'z1', name: 'La Louvière Centre', fee: 2.50, color: '#22c55e', center: [50.479, 4.186] as [number, number], radius: 2000 },
  { id: 'z2', name: 'Haine-Saint-Paul', fee: 3.00, color: '#f59e0b', center: [50.468, 4.172] as [number, number], radius: 2500 },
  { id: 'z3', name: 'Manage', fee: 4.00, color: '#3b82f6', center: [50.503, 4.234] as [number, number], radius: 3000 },
];

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function DeliveryCheckPage() {
  const { t } = useLanguage();
  const [address, setAddress] = useState('');
  const [result, setResult] = useState<{ zone: typeof ZONES[0]; distance: number } | 'outside' | null>(null);
  const [customerPos, setCustomerPos] = useState<[number, number] | undefined>();

  const handleCheck = () => {
    // Simulate geocoding — in prod, use Google Geocoding API
    // For demo: random position near La Louvière
    const lat = 50.479 + (Math.random() - 0.5) * 0.04;
    const lng = 4.186 + (Math.random() - 0.5) * 0.06;
    setCustomerPos([lat, lng]);

    for (const zone of ZONES) {
      const dist = getDistance(lat, lng, zone.center[0], zone.center[1]);
      if (dist <= zone.radius) {
        setResult({ zone, distance: dist });
        return;
      }
    }
    setResult('outside');
  };

  const ic = 'w-full px-4 py-3.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500/50';

  return (
    <div className="min-h-screen max-w-lg mx-auto pb-20 bg-zinc-950">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/" className="text-amber-400 font-medium text-sm">← Menu</Link>
          <h1 className="text-sm font-bold text-white">{t.ui.zone_check}</h1>
          <div className="w-12" />
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">
        <div className="text-center mb-2">
          <span className="text-4xl block mb-2">🛵</span>
          <h2 className="text-lg font-bold text-white">{t.ui.zone_checkTitle}</h2>
          <p className="text-xs text-zinc-400 mt-1">{t.ui.zone_checkDesc}</p>
        </div>

        <div className="flex gap-2">
          <input className={ic} placeholder={t.ui.zone_addressPlaceholder} value={address} onChange={(e) => setAddress(e.target.value)} />
          <button onClick={handleCheck}
            className="px-5 py-3.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm shrink-0 active:scale-95">
            🔍
          </button>
        </div>

        {/* Map */}
        <DeliveryMap zones={ZONES} customerLocation={customerPos} height="300px" />

        {/* Result */}
        {result && result !== 'outside' && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center animate-scale-in">
            <span className="text-3xl block mb-2">✅</span>
            <p className="text-sm font-bold text-emerald-400">{t.ui.zone_inZone}</p>
            <p className="text-xs text-zinc-400 mt-1">
              {result.zone.name} — {t.ui.checkout_deliveryFee}: <span className="text-amber-400 font-bold">{formatPrice(result.zone.fee)} €</span>
            </p>
            <Link href="/" className="inline-block mt-3 px-6 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm">
              {t.ui.zone_orderNow}
            </Link>
          </div>
        )}

        {result === 'outside' && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center animate-scale-in">
            <span className="text-3xl block mb-2">😔</span>
            <p className="text-sm font-bold text-red-400">{t.ui.zone_outOfZone}</p>
            <p className="text-xs text-zinc-400 mt-1">{t.ui.zone_outOfZoneDesc}</p>
          </div>
        )}

        {/* Zone legend */}
        <div className="space-y-1.5">
          {ZONES.map((z) => (
            <div key={z.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800/50 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: z.color }} />
                <span className="text-white">{z.name}</span>
              </div>
              <span className="text-amber-400 font-bold">{formatPrice(z.fee)} €</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
