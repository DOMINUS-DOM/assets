'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useApiData } from '@/hooks/useApiData';
import { useLanguage } from '@/i18n/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { formatPrice } from '@/utils/format';

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

type Tab = 'general' | 'hours' | 'delivery' | 'closedDays' | 'display';

export default function SettingsPage() {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<any>({});
  const [tab, setTab] = useState<Tab>('general');
  const [saved, setSaved] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [zoneForm, setZoneForm] = useState({ name: '', postalCodes: '', fee: '3', minOrder: '15' });
  const [showZoneForm, setShowZoneForm] = useState(false);

  useEffect(() => {
    api.get<any>('/settings').then(setSettings).catch(() => {});
  }, []);

  const ic = 'w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-amber-500/50';

  const save = (data: Partial<any>) => {
    const updated = { ...settings, ...data };
    setSettings(updated);
    api.post('/settings', updated).catch(() => {});
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'general', label: t.ui.set_general },
    { key: 'hours', label: t.ui.set_hours },
    { key: 'delivery', label: t.ui.set_delivery },
    { key: 'closedDays', label: t.ui.set_closedDays },
    { key: 'display', label: 'Interface' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">{t.ui.set_title}</h1>
        {/* Quick toggle: accepting orders */}
        <button onClick={() => save({ acceptingOrders: !settings.acceptingOrders })}
          className={`px-4 py-2 rounded-xl font-bold text-sm active:scale-95 transition-all ${
            settings.acceptingOrders ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}>
          {settings.acceptingOrders ? `🟢 ${t.ui.set_open}` : `🔴 ${t.ui.set_closed}`}
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === tb.key ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500'}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {saved && <p className="text-emerald-400 text-sm text-center animate-fade-in">✅ {t.ui.set_saved}</p>}

      {/* ─── GENERAL ─── */}
      {tab === 'general' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">{t.ui.set_businessName}</label>
              <input className={ic} value={settings.name} onChange={(e) => save({ name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">{t.ui.set_address}</label>
              <input className={ic} value={settings.address} onChange={(e) => save({ address: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">{t.ui.set_phone}</label>
              <input className={ic} value={settings.phone} onChange={(e) => save({ phone: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Email</label>
              <input className={ic} value={settings.email} onChange={(e) => save({ email: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">{t.ui.set_vat}</label>
              <input className={ic} value={settings.vatNumber} onChange={(e) => save({ vatNumber: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">{t.ui.set_maxOrders}</label>
              <input className={ic} type="number" value={settings.maxOrdersPerHour} onChange={(e) => save({ maxOrdersPerHour: +e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">{t.ui.set_vatFood} (%)</label>
              <input className={ic} type="number" step="1" value={Math.round(settings.vatRate * 100)} onChange={(e) => save({ vatRate: +e.target.value / 100 })} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">{t.ui.set_vatAlcohol} (%)</label>
              <input className={ic} type="number" step="1" value={Math.round(settings.vatRateDrinks * 100)} onChange={(e) => save({ vatRateDrinks: +e.target.value / 100 })} />
            </div>
          </div>
        </div>
      )}

      {/* ─── HOURS ─── */}
      {tab === 'hours' && (
        <div className="space-y-2">
          {(settings.hours || []).map((h: any) => (
            <div key={h.day} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <span className="text-sm font-medium text-white w-24">{DAY_NAMES[h.day]}</span>
              <button onClick={() => save({ hours: (settings.hours || []).map((x: any) => x.day === h.day ? { ...x, closed: !x.closed } : x) })}
                className={`px-2 py-1 rounded-lg text-xs font-medium ${h.closed ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                {h.closed ? t.ui.set_closed : t.ui.set_open}
              </button>
              {!h.closed && (
                <>
                  <input className="px-2 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm w-20 text-center"
                    type="time" value={h.open} onChange={(e) => save({ hours: (settings.hours || []).map((x: any) => x.day === h.day ? { ...x, open: e.target.value } : x) })} />
                  <span className="text-zinc-500">→</span>
                  <input className="px-2 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm w-20 text-center"
                    type="time" value={h.close} onChange={(e) => save({ hours: (settings.hours || []).map((x: any) => x.day === h.day ? { ...x, close: e.target.value } : x) })} />
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── DELIVERY ZONES ─── */}
      {tab === 'delivery' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">{t.ui.set_defaultFee}</label>
              <input className={ic} type="number" step="0.5" value={settings.defaultDeliveryFee}
                onChange={(e) => save({ defaultDeliveryFee: +e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">{t.ui.set_minOrder}</label>
              <input className={ic} type="number" step="1" value={settings.minOrderDelivery}
                onChange={(e) => save({ minOrderDelivery: +e.target.value })} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t.ui.set_zones}</h2>
            <button onClick={() => setShowZoneForm(!showZoneForm)}
              className="text-xs text-amber-400 font-medium">{showZoneForm ? t.ui.admin_cancel : t.ui.admin_add}</button>
          </div>

          {showZoneForm && (
            <form onSubmit={(e) => {
              e.preventDefault();
              save({ deliveryZones: [...(settings.deliveryZones || []), { id: `zone-${Date.now()}`, name: zoneForm.name, postalCodes: zoneForm.postalCodes.split(',').map((s: string) => s.trim()), fee: +zoneForm.fee, minOrder: +zoneForm.minOrder, active: true }] });
              setZoneForm({ name: '', postalCodes: '', fee: '3', minOrder: '15' });
              setShowZoneForm(false);
            }} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-3 animate-slide-up">
              <div className="grid grid-cols-2 gap-2">
                <input className={ic} placeholder={t.ui.set_zoneName} value={zoneForm.name} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} required />
                <input className={ic} placeholder={t.ui.set_postalCodes} value={zoneForm.postalCodes} onChange={(e) => setZoneForm({ ...zoneForm, postalCodes: e.target.value })} required />
                <input className={ic} placeholder={t.ui.set_fee} type="number" step="0.5" value={zoneForm.fee} onChange={(e) => setZoneForm({ ...zoneForm, fee: e.target.value })} />
                <input className={ic} placeholder={t.ui.set_minOrder} type="number" value={zoneForm.minOrder} onChange={(e) => setZoneForm({ ...zoneForm, minOrder: e.target.value })} />
              </div>
              <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm">{t.ui.admin_add}</button>
            </form>
          )}

          <div className="space-y-2">
            {(settings.deliveryZones || []).map((z: any) => (
              <div key={z.id} className={`flex items-center justify-between p-3 rounded-xl border ${z.active ? 'bg-zinc-900 border-zinc-800/50' : 'bg-zinc-900/50 border-zinc-800/30 opacity-60'}`}>
                <div>
                  <p className="text-sm font-medium text-white">{z.name}</p>
                  <p className="text-xs text-zinc-500">{z.postalCodes.join(', ')} — min. {formatPrice(z.minOrder)} €</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-amber-400">{formatPrice(z.fee)} €</span>
                  <button onClick={() => save({ deliveryZones: (settings.deliveryZones || []).map((x: any) => x.id === z.id ? { ...x, active: !x.active } : x) })}
                    className={`px-2 py-1 rounded-lg text-xs font-medium ${z.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                    {z.active ? '✓' : '✗'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── CLOSED DAYS ─── */}
      {tab === 'closedDays' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input className={ic} type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            <button onClick={() => { if (newDate) { save({ closedDates: [...(settings.closedDates || []), newDate].sort() }); setNewDate(''); } }}
              className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm shrink-0">{t.ui.admin_add}</button>
          </div>
          <div className="space-y-2">
            {(settings.closedDates || []).map((d: string) => (
              <div key={d} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800/50">
                <span className="text-sm text-white">{d}</span>
                <button onClick={() => save({ closedDates: (settings.closedDates || []).filter((x: string) => x !== d) })}
                  className="text-xs text-red-400 hover:text-red-300">✕</button>
              </div>
            ))}
            {settings.closedDates.length === 0 && <p className="text-zinc-500 text-sm text-center py-4">{t.ui.set_noClosedDays}</p>}
          </div>
        </div>
      )}

      {/* ─── DISPLAY ─── */}
      {tab === 'display' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white dark:text-white text-gray-900 mb-3">Theme</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setTheme('dark')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  theme === 'dark' ? 'border-amber-500 bg-zinc-900' : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                }`}>
                <div className="w-full h-16 rounded-lg bg-zinc-950 border border-zinc-800 mb-3 flex items-center px-3 gap-2">
                  <div className="w-8 h-full bg-zinc-900 rounded" />
                  <div className="flex-1 space-y-1">
                    <div className="h-2 bg-zinc-800 rounded w-3/4" />
                    <div className="h-2 bg-zinc-800 rounded w-1/2" />
                  </div>
                </div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-amber-400' : 'text-zinc-400'}`}>Mode sombre</p>
              </button>
              <button onClick={() => setTheme('light')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  theme === 'light' ? 'border-amber-500 bg-zinc-900' : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                }`}>
                <div className="w-full h-16 rounded-lg bg-white border border-gray-200 mb-3 flex items-center px-3 gap-2">
                  <div className="w-8 h-full bg-gray-100 rounded" />
                  <div className="flex-1 space-y-1">
                    <div className="h-2 bg-gray-200 rounded w-3/4" />
                    <div className="h-2 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
                <p className={`text-sm font-medium ${theme === 'light' ? 'text-amber-400' : 'text-zinc-400'}`}>Mode clair</p>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
