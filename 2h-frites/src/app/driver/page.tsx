'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice } from '@/utils/format';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Link from 'next/link';

function DriverContent() {
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const { user } = useAuth();
  const [selectedDriver, setSelectedDriver] = useState('');
  const { t } = useLanguage();
  const [tracking, setTracking] = useState(false);
  const [lastPos, setLastPos] = useState<{ lat: number; lng: number } | null>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    if (user?.driverId) setSelectedDriver(user.driverId);
  }, [user]);

  const refresh = useCallback(async () => {
    try {
      const [ordersData, driversData] = await Promise.all([
        api.get<any[]>('/orders'),
        api.get<{ drivers: any[] }>('/drivers'),
      ]);
      setOrders(ordersData);
      setDrivers(driversData.drivers.filter((d: any) => d.active));
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 10000);
    return () => clearInterval(i);
  }, [refresh]);

  // GPS tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation || !selectedDriver) return;
    setTracking(true);

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLastPos({ lat, lng });
        // Send to API
        api.post('/drivers/location', {
          driverId: selectedDriver,
          lat,
          lng,
        }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }, [selectedDriver]);

  const stopTracking = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setTracking(false);
  }, []);

  useEffect(() => () => stopTracking(), [stopTracking]);

  const active = orders.filter((o) =>
    (o.status === 'ready' || o.status === 'delivering') &&
    o.type === 'delivery' &&
    (!selectedDriver || o.driverId === selectedDriver)
  );

  const completed = orders.filter(
    (o) => o.status === 'delivered' && o.driverId === selectedDriver
  );

  const myDriver = drivers.find((d) => d.id === selectedDriver);

  return (
    <div className="min-h-screen max-w-lg mx-auto pb-20 bg-zinc-950">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.png" alt="2H" className="h-6 w-6 object-contain" />
            <span className="text-sm font-bold text-white">{t.ui.driver_title}</span>
          </div>
          <div className="flex items-center gap-2">
            {tracking && lastPos && (
              <span className="text-[10px] text-emerald-400 animate-pulse">● GPS actif</span>
            )}
            <Link href="/" className="text-xs text-zinc-500">Menu</Link>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">
        {/* Driver selector */}
        {!user?.driverId && drivers.length > 0 && (
          <select
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm"
          >
            <option value="">{t.ui.driver_select}</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}

        {/* GPS tracking toggle */}
        {selectedDriver && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <div>
              <p className="text-sm font-semibold text-white">
                {myDriver?.name || 'Livreur'}
              </p>
              <p className="text-xs text-zinc-500">
                {tracking
                  ? lastPos ? `${lastPos.lat.toFixed(4)}, ${lastPos.lng.toFixed(4)}` : 'Localisation...'
                  : 'GPS inactif'}
              </p>
            </div>
            <button
              onClick={tracking ? stopTracking : startTracking}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                tracking
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-emerald-500 text-white'
              }`}
            >
              {tracking ? '⏹ Arrêter' : '📍 Activer GPS'}
            </button>
          </div>
        )}

        {/* Active deliveries */}
        <div>
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
            {t.ui.driver_activeDeliveries} ({active.length})
          </h2>
          {active.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-6">Aucune livraison en cours</p>
          ) : (
            <div className="space-y-2">
              {active.map((o) => (
                <div key={o.id} className="p-4 rounded-xl bg-zinc-900 border border-amber-500/20">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-bold text-white">{o.orderNumber || o.id}</p>
                      <p className="text-xs text-zinc-400">{o.customerName} — {o.customerPhone}</p>
                    </div>
                    <span className="text-sm font-bold text-amber-400">{formatPrice(o.total)} €</span>
                  </div>
                  {o.deliveryStreet && (
                    <p className="text-xs text-zinc-300 mb-2">📍 {o.deliveryStreet}, {o.deliveryCity}</p>
                  )}
                  {o.deliveryNotes && (
                    <p className="text-xs text-zinc-500 mb-3 italic">💬 {o.deliveryNotes}</p>
                  )}
                  <div className="flex gap-2">
                    {o.status === 'ready' && (
                      <button
                        onClick={() => api.post('/orders', { action: 'updateStatus', orderId: o.id, status: 'delivering' }).then(refresh)}
                        className="flex-1 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm active:scale-95"
                      >
                        🚀 Parti !
                      </button>
                    )}
                    {o.status === 'delivering' && (
                      <button
                        onClick={() => api.post('/orders', { action: 'updateStatus', orderId: o.id, status: 'delivered' }).then(refresh)}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-sm active:scale-95"
                      >
                        ✅ Livrée !
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed today */}
        {completed.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
              Livrées aujourd&apos;hui ({completed.length})
            </h2>
            <div className="space-y-1">
              {completed.slice(0, 5).map((o) => (
                <div key={o.id} className="flex justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50 text-sm">
                  <div>
                    <p className="text-white font-medium">{o.orderNumber || o.id}</p>
                    <p className="text-xs text-zinc-500">{o.customerName || '—'}</p>
                  </div>
                  <span className="text-emerald-400 font-bold">{formatPrice(o.total)} €</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DriverPage() {
  return (
    <ProtectedRoute allowedRoles={['livreur', 'patron', 'manager', 'franchisor_admin', 'franchisee_owner', 'location_manager']}>
      <DriverContent />
    </ProtectedRoute>
  );
}
