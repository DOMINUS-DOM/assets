'use client';

import { useState, useEffect } from 'react';
import { store } from '@/stores/store';
import { Order, Driver } from '@/types/order';
import { formatPrice } from '@/utils/format';

export default function PayrollPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  useEffect(() => {
    setOrders(store.getOrders());
    setDrivers(store.getDrivers());
    return store.subscribe(() => {
      setOrders(store.getOrders());
      setDrivers(store.getDrivers());
    });
  }, []);

  const deliveredOrders = orders.filter((o) => ['delivered'].includes(o.status));

  const driverStats = drivers.map((driver) => {
    const driverOrders = deliveredOrders.filter((o) => o.driverId === driver.id);
    const deliveryCount = driverOrders.length;
    const baseEarnings = deliveryCount * driver.ratePerDelivery;
    const bonusEarnings = deliveryCount * driver.bonusRate;
    const totalEarnings = baseEarnings + bonusEarnings;

    return {
      driver,
      deliveryCount,
      baseEarnings,
      bonusEarnings,
      totalEarnings,
      orders: driverOrders,
    };
  });

  const totalPaid = driverStats.reduce((sum, s) => sum + s.totalEarnings, 0);
  const totalDeliveries = driverStats.reduce((sum, s) => sum + s.deliveryCount, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Paye livreurs</h1>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <p className="text-2xl font-extrabold text-amber-400">{formatPrice(totalPaid)} €</p>
          <p className="text-xs text-zinc-500">Total à payer</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <p className="text-2xl font-extrabold text-white">{totalDeliveries}</p>
          <p className="text-xs text-zinc-500">Livraisons effectuées</p>
        </div>
      </div>

      {/* Per driver */}
      <div className="space-y-3">
        {driverStats.map(({ driver, deliveryCount, baseEarnings, bonusEarnings, totalEarnings }) => (
          <div key={driver.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${driver.active ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                  <h3 className="text-sm font-bold text-white">{driver.name}</h3>
                </div>
                <p className="text-xs text-zinc-500 mt-1">{driver.contractType} — {driver.zone}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-extrabold text-amber-400">{formatPrice(totalEarnings)} €</p>
                <p className="text-xs text-zinc-500">{deliveryCount} livraison(s)</p>
              </div>
            </div>
            {deliveryCount > 0 && (
              <div className="mt-3 pt-3 border-t border-zinc-800 space-y-1 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Base ({deliveryCount} × {formatPrice(driver.ratePerDelivery)} €)</span>
                  <span>{formatPrice(baseEarnings)} €</span>
                </div>
                {bonusEarnings > 0 && (
                  <div className="flex justify-between text-zinc-400">
                    <span>Bonus ({deliveryCount} × {formatPrice(driver.bonusRate)} €)</span>
                    <span>{formatPrice(bonusEarnings)} €</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
