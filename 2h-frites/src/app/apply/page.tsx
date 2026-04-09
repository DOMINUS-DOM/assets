'use client';

import { useState } from 'react';
import { store } from '@/stores/store';
import Link from 'next/link';

export default function ApplyPage() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', city: '', transport: '', availability: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.city || !form.transport) return;
    store.addApplication(form);
    setSubmitted(true);
  };

  const inputClass = 'w-full px-4 py-3.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500/50';

  if (submitted) {
    return (
      <div className="min-h-screen max-w-lg mx-auto flex items-center justify-center bg-zinc-950 px-6">
        <div className="text-center animate-scale-in">
          <span className="text-6xl block mb-4">🎉</span>
          <h1 className="text-xl font-bold text-white mb-2">Candidature envoyée !</h1>
          <p className="text-zinc-400 text-sm mb-6">Merci ! Nous vous contacterons très bientôt.</p>
          <Link href="/" className="inline-block px-6 py-3 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm active:scale-95 transition-transform">
            ← Retour au menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto pb-20 bg-zinc-950">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/" className="text-amber-400 font-medium text-sm">← Menu</Link>
          <h1 className="text-sm font-bold text-white">Devenir livreur</h1>
          <div className="w-12" />
        </div>
      </header>

      <div className="px-4 pt-6">
        <div className="text-center mb-8">
          <span className="text-5xl block mb-3">🛵</span>
          <h2 className="text-lg font-bold text-white">Rejoins l'équipe 2H Frites !</h2>
          <p className="text-zinc-400 text-sm mt-2">Tu veux livrer des frites et gagner de l'argent ? Remplis ce formulaire, on te recontacte.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block">Nom complet *</label>
            <input className={inputClass} placeholder="Ton nom et prénom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block">Téléphone *</label>
            <input className={inputClass} placeholder="+32 470 ..." type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block">Email</label>
            <input className={inputClass} placeholder="ton@email.be" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block">Ville / Zone *</label>
            <input className={inputClass} placeholder="La Louvière, Manage..." value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block">Moyen de transport *</label>
            <select
              className={inputClass}
              value={form.transport}
              onChange={(e) => setForm({ ...form, transport: e.target.value })}
              required
            >
              <option value="">Choisir...</option>
              <option value="Scooter">🛵 Scooter</option>
              <option value="Voiture">🚗 Voiture</option>
              <option value="Vélo">🚲 Vélo</option>
              <option value="Vélo électrique">⚡ Vélo électrique</option>
              <option value="À pied">🚶 À pied</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1 block">Disponibilités</label>
            <input className={inputClass} placeholder="Soir et week-end, temps plein..." value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} />
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500
              text-zinc-950 font-bold text-sm active:scale-[0.97] transition-transform
              shadow-lg shadow-amber-500/20 mt-4"
          >
            Envoyer ma candidature 🚀
          </button>
        </form>
      </div>
    </div>
  );
}
