'use client';

import { useState, useEffect } from 'react';
import { store } from '@/stores/store';
import { Order, Driver } from '@/types/order';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatPrice } from '@/utils/format';

export default function PayrollPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const { t } = useLanguage();

  useEffect(() => {
    setOrders(store.getOrders()); setDrivers(store.getDrivers());
    return store.subscribe(() => { setOrders(store.getOrders()); setDrivers(store.getDrivers()); });
  }, []);

  const deliveredOrders = orders.filter((o) => ['delivered', 'picked_up'].includes(o.status));

  const driverStats = drivers.map((driver) => {
    const driverOrders = deliveredOrders.filter((o) => o.driverId === driver.id);
    const count = driverOrders.length;
    const base = count * driver.ratePerDelivery;
    const bonus = count * driver.bonusRate;
    return { driver, count, base, bonus, total: base + bonus };
  });

  const totalPaid = driverStats.reduce((sum, s) => sum + s.total, 0);
  const totalDeliveries = driverStats.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">{t.ui.admin_driverPayroll}</h1>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <p className="text-2xl font-extrabold text-amber-400">{formatPrice(totalPaid)} €</p>
          <p className="text-xs text-zinc-500">{t.ui.admin_totalToPay}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <p className="text-2xl font-extrabold text-white">{totalDeliveries}</p>
          <p className="text-xs text-zinc-500">{t.ui.admin_deliveriesDone}</p>
        </div>
      </div>
      <div className="space-y-3">
        {driverStats.map(({ driver, count, base, bonus, total }) => (
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
                <p className="text-lg font-extrabold text-amber-400">{formatPrice(total)} €</p>
                <p className="text-xs text-zinc-500">{count} {t.ui.admin_deliveryCount}</p>
              </div>
            </div>
            {count > 0 && (
              <div className="mt-3 pt-3 border-t border-zinc-800 space-y-1 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>{t.ui.admin_base} ({count} × {formatPrice(driver.ratePerDelivery)} €)</span>
                  <span>{formatPrice(base)} €</span>
                </div>
                {bonus > 0 && (
                  <div className="flex justify-between text-zinc-400">
                    <span>{t.ui.admin_bonusLabel} ({count} × {formatPrice(driver.bonusRate)} €)</span>
                    <span>{formatPrice(bonus)} €</span>
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
