'use client';

import { useState, useEffect } from 'react';
import { store } from '@/stores/store';
import { Driver } from '@/types/order';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', zone: '', contractType: 'freelance', ratePerDelivery: 3.5, bonusRate: 0, notes: '' });

  useEffect(() => {
    setDrivers(store.getDrivers());
    return store.subscribe(() => setDrivers(store.getDrivers()));
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    store.addDriver({ ...form, active: true });
    setForm({ name: '', phone: '', email: '', zone: '', contractType: 'freelance', ratePerDelivery: 3.5, bonusRate: 0, notes: '' });
    setShowForm(false);
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500/50';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Livreurs</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm active:scale-95 transition-transform"
        >
          {showForm ? 'Annuler' : '+ Ajouter'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-3 animate-slide-up">
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} placeholder="Nom *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className={inputClass} placeholder="Téléphone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            <input className={inputClass} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className={inputClass} placeholder="Zone" value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <select className={inputClass} value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value })}>
              <option value="freelance">Freelance</option>
              <option value="étudiant">Étudiant</option>
              <option value="salarié">Salarié</option>
            </select>
            <input className={inputClass} placeholder="€/course" type="number" step="0.5" value={form.ratePerDelivery} onChange={(e) => setForm({ ...form, ratePerDelivery: +e.target.value })} />
            <input className={inputClass} placeholder="Bonus/course" type="number" step="0.5" value={form.bonusRate} onChange={(e) => setForm({ ...form, bonusRate: +e.target.value })} />
          </div>
          <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm">Ajouter</button>
        </form>
      )}

      <div className="space-y-3">
        {drivers.map((d) => (
          <div key={d.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${d.active ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                  <h3 className="text-sm font-bold text-white">{d.name}</h3>
                  <span className="text-xs text-zinc-500">{d.contractType}</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">{d.phone} — {d.email}</p>
                <p className="text-xs text-zinc-500">📍 {d.zone} — {d.ratePerDelivery} €/course{d.bonusRate > 0 ? ` + ${d.bonusRate} € bonus` : ''}</p>
                {d.notes && <p className="text-xs text-zinc-600 mt-1 italic">💬 {d.notes}</p>}
              </div>
              <button
                onClick={() => store.toggleDriverActive(d.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  d.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                {d.active ? 'Actif' : 'Inactif'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
