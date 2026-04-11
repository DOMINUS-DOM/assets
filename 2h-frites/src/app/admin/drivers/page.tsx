'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';
import { useLocation } from '@/contexts/LocationContext';

type Tab = 'drivers' | 'applications';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>('drivers');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', zone: '', contractType: 'freelance', ratePerDelivery: 3.5, bonusRate: 0, notes: '' });
  const { t } = useLanguage();
  const { locationId } = useLocation();
  const locParam = locationId ? '?locationId=' + locationId : '';

  const refresh = async () => {
    try {
      const d = await api.get<{ drivers: any[]; applications: any[] }>('/drivers' + locParam);
      setDrivers(d.drivers);
      setApplications(d.applications || []);
    } catch {}
  };
  useEffect(() => { refresh(); }, []);

  const resetForm = () => {
    setForm({ name: '', phone: '', email: '', zone: '', contractType: 'freelance', ratePerDelivery: 3.5, bonusRate: 0, notes: '' });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      await api.post('/drivers', { action: 'updateDriver', data: { id: editId, ...form } });
    } else {
      await api.post('/drivers', { action: 'addDriver', data: { ...form, active: true, locationId: locationId || null } });
    }
    resetForm(); refresh();
  };

  const startEdit = (d: any) => {
    setEditId(d.id);
    setForm({ name: d.name, phone: d.phone, email: d.email, zone: d.zone, contractType: d.contractType, ratePerDelivery: d.ratePerDelivery, bonusRate: d.bonusRate, notes: d.notes || '' });
    setShowForm(true);
    setTab('drivers');
  };

  const ic = 'w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500/50';
  const APP_STATUS_COLORS: Record<string, string> = { new: 'bg-blue-500/15 text-blue-400', accepted: 'bg-emerald-500/15 text-emerald-400', rejected: 'bg-red-500/15 text-red-400', contacted: 'bg-amber-500/15 text-amber-400' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">{t.ui.admin_drivers}</h1>
        <button onClick={() => { if (showForm) resetForm(); else { setShowForm(true); setTab('drivers'); } }}
          className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm active:scale-95">
          {showForm ? t.ui.admin_cancel : t.ui.admin_add}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5">
        <button onClick={() => setTab('drivers')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${tab === 'drivers' ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500'}`}>
          Livreurs ({drivers.length})
        </button>
        <button onClick={() => setTab('applications')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium relative ${tab === 'applications' ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500'}`}>
          Candidatures
          {applications.filter((a: any) => a.status === 'new').length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
              {applications.filter((a: any) => a.status === 'new').length}
            </span>
          )}
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && tab === 'drivers' && (
        <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-zinc-900 border border-amber-500/30 space-y-3">
          <h3 className="text-sm font-bold text-white">{editId ? 'Modifier le livreur' : 'Nouveau livreur'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <input className={ic} placeholder={t.ui.checkout_name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className={ic} placeholder={t.ui.checkout_phone} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            <input className={ic} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className={ic} placeholder={t.ui.admin_zone} value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <select className={ic} value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value })}>
              <option value="freelance">Freelance</option>
              <option value="étudiant">Étudiant</option>
              <option value="salarié">Salarié</option>
            </select>
            <input className={ic} placeholder={t.ui.admin_perDelivery} type="number" step="0.5" value={form.ratePerDelivery} onChange={(e) => setForm({ ...form, ratePerDelivery: +e.target.value })} />
            <input className={ic} placeholder={t.ui.admin_bonusPerDelivery} type="number" step="0.5" value={form.bonusRate} onChange={(e) => setForm({ ...form, bonusRate: +e.target.value })} />
          </div>
          <textarea className={ic + ' resize-none'} rows={2} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-2">
            <button type="button" onClick={resetForm} className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm">Annuler</button>
            <button type="submit" className="flex-1 py-2 rounded-lg bg-amber-500 text-zinc-950 font-bold text-sm">{editId ? 'Enregistrer' : t.ui.admin_add}</button>
          </div>
        </form>
      )}

      {/* Drivers list */}
      {tab === 'drivers' && (
        <div className="space-y-3">
          {drivers.map((d) => (
            <div key={d.id} className={`p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 ${!d.active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${d.active ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                    <h3 className="text-sm font-bold text-white">{d.name}</h3>
                    <span className="text-xs text-zinc-500">{d.contractType}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{d.phone} &mdash; {d.email}</p>
                  <p className="text-xs text-zinc-500">{d.zone} &mdash; {d.ratePerDelivery} &euro;/livr.{d.bonusRate > 0 ? ` + ${d.bonusRate} &euro; bonus` : ''}</p>
                  {d.notes && <p className="text-xs text-zinc-600 mt-1 italic">{d.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => startEdit(d)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-amber-400 text-xs font-medium transition-colors">Modifier</button>
                  <button onClick={() => api.post('/drivers', { action: 'toggleActive', id: d.id }).then(refresh)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${d.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                    {d.active ? t.ui.admin_active : t.ui.admin_inactive}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {drivers.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">Aucun livreur</p>}
        </div>
      )}

      {/* Applications tab */}
      {tab === 'applications' && (
        <div className="space-y-3">
          {applications.map((app: any) => (
            <div key={app.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-bold text-white">{app.name}</p>
                  <p className="text-xs text-zinc-400">{app.phone} &mdash; {app.email}</p>
                  <p className="text-xs text-zinc-500">{app.city} &mdash; {app.transport} &mdash; {app.availability}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${APP_STATUS_COLORS[app.status] || APP_STATUS_COLORS.new}`}>
                  {app.status}
                </span>
              </div>
              {app.status === 'new' && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => api.post('/drivers', { action: 'updateApplicationStatus', id: app.id, status: 'contacted' }).then(refresh)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-medium">Contact&eacute;</button>
                  <button onClick={() => api.post('/drivers', { action: 'updateApplicationStatus', id: app.id, status: 'accepted' }).then(refresh)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium">Accepter</button>
                  <button onClick={() => api.post('/drivers', { action: 'updateApplicationStatus', id: app.id, status: 'rejected' }).then(refresh)}
                    className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-medium">Refuser</button>
                </div>
              )}
              <p className="text-[10px] text-zinc-600 mt-2">{new Date(app.createdAt).toLocaleDateString('fr-BE')}</p>
            </div>
          ))}
          {applications.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">Aucune candidature</p>}
        </div>
      )}
    </div>
  );
}
