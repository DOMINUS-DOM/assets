'use client';

import { useState, useEffect } from 'react';
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

  // Auto-select driver linked to logged-in user
  useEffect(() => {
    if (user?.driverId) setSelectedDriver(user.driverId);
  }, [user]);

  const refresh = async () => {
    try {
      const [ordersData, driversData] = await Promise.all([api.get<any[]>('/orders'), api.get<{ drivers: any[] }>('/drivers')]);
      setOrders(ordersData); setDrivers(driversData.drivers.filter((d: any) => d.active));
    } catch {}
  };
  useEffect(() => { refresh(); const i = setInterval(refresh, 10000); return () => clearInterval(i); }, []);

  const myOrders = selectedDriver ? orders.filter((o) => o.driverId === selectedDriver && o.type === 'delivery') : [];
  const active = myOrders.filter((o) => ['ready', 'delivering'].includes(o.status));
  const delivered = myOrders.filter((o) => o.status === 'delivered');

  return (
    <div className="min-h-screen max-w-lg mx-auto pb-20 bg-zinc-950">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/" className="text-amber-400 text-sm">← Menu</Link>
          <h1 className="text-sm font-bold text-white">{t.ui.driver_title}</h1>
          <div className="w-12" />
        </div>
      </header>

      <div className="px-4 pt-4 space-y-6">
        <select value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm">
          <option value="">{t.ui.driver_select}</option>
          {drivers.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.zone}</option>)}
        </select>

        {selectedDriver && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 text-center">
                <p className="text-2xl font-extrabold text-amber-400">{active.length}</p>
                <p className="text-xs text-zinc-500">{t.ui.driver_activeCnt}</p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 text-center">
                <p className="text-2xl font-extrabold text-emerald-400">{delivered.length}</p>
                <p className="text-xs text-zinc-500">{t.ui.driver_deliveredCnt}</p>
              </div>
            </div>

            {active.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{t.ui.driver_activeDeliveries}</h2>
                <div className="space-y-2">
                  {active.map((o) => (
                    <div key={o.id} className="p-4 rounded-xl bg-zinc-900 border border-amber-500/20">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-bold text-white">{o.id}</p>
                          <p className="text-xs text-zinc-400">{o.customerName} — {o.customerPhone}</p>
                        </div>
                        <span className="text-sm font-bold text-amber-400">{formatPrice(o.total)} €</span>
                      </div>
                      {o.deliveryStreet && <p className="text-xs text-zinc-300 mb-2">📍 {o.deliveryStreet}, {o.deliveryCity}</p>}
                      {o.deliveryNotes && <p className="text-xs text-zinc-500 mb-3 italic">💬 {o.deliveryNotes}</p>}
                      <div className="flex gap-2">
                        {o.status === 'ready' && (
                          <button onClick={() => api.post('/orders', { action: 'updateStatus', orderId: o.id, status: 'delivering' }).then(refresh)}
                            className="flex-1 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm active:scale-95">
                            {t.ui.driver_departed}
                          </button>
                        )}
                        {o.status === 'delivering' && (
                          <button onClick={() => api.post('/orders', { action: 'updateStatus', orderId: o.id, status: 'delivered' }).then(refresh)}
                            className="flex-1 py-2 rounded-xl bg-emerald-500 text-white font-bold text-sm active:scale-95">
                            {t.ui.driver_markDelivered}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {delivered.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{t.ui.driver_historyLabel}</h2>
                <div className="space-y-2">
                  {delivered.map((o) => (
                    <div key={o.id} className="flex justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50 text-sm">
                      <div>
                        <p className="text-white font-medium">{o.id}</p>
                        <p className="text-xs text-zinc-500">{o.customer.name}</p>
                      </div>
                      <span className="text-emerald-400 font-bold">{formatPrice(o.total)} €</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {active.length === 0 && delivered.length === 0 && (
              <p className="text-center text-zinc-500 py-8 text-sm">{t.ui.driver_noDeliveries}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function DriverPage() {
  return (
    <ProtectedRoute allowedRoles={['livreur']}>
      <DriverContent />
    </ProtectedRoute>
  );
}
