'use client';

import { useState } from 'react';
import Link from 'next/link';
import BrizoAuthLayout from '@/components/BrizoAuthLayout';

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

export default function SignupPage() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [restaurantName, setRestaurantName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const canSubmit = restaurantName.length >= 2 && adminName && adminEmail.includes('@') && adminPassword.length >= 8;

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName, adminName, adminEmail, adminPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Erreur lors de la création.');
        setSaving(false);
        return;
      }

      // Session cookie is set by the server (HttpOnly, .brizoapp.com)
      // Also store in localStorage as fallback for custom domains
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect to tenant admin — cookie travels automatically on *.brizoapp.com
      const slug = data.organization.slug;
      const appDomain = window.location.hostname.includes('brizoapp.com') ? 'brizoapp.com' : window.location.host;
      window.location.href = `https://${slug}.${appDomain}/admin/welcome`;
    } catch {
      setError('Erreur réseau. Réessayez.');
      setSaving(false);
    }
  };

  const ic = 'w-full px-4 py-3 rounded-xl bg-[#FAFAF8] border border-[#E5E2DC] text-[#1A1A1A] text-[14px] placeholder-[#B0ADA6] focus:outline-none focus:border-[#7C3AED]/40 focus:ring-1 focus:ring-[#7C3AED]/10 transition-all';

  return (
    <BrizoAuthLayout>
      <div>
        {/* Header */}
        <div className="lg:hidden text-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brizo-icon.svg" alt="BrizoApp" className="h-10 w-10 mx-auto mb-3" />
        </div>
        <h1 className="text-2xl font-extrabold text-[#1A1A1A] tracking-tight mb-1">Créez votre restaurant</h1>
        <p className="text-sm text-[#8A8A8A] mb-6">Opérationnel en 2 minutes. Sans engagement.</p>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="text-[12px] font-medium text-[#8A8A8A] mb-2 block tracking-wide">Nom du restaurant</label>
            <input className={ic} placeholder="Ex: Chez Mario" value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} autoFocus />
          </div>
          {restaurantName.length >= 2 && (
            <p className="text-xs text-gray-400">
              Votre adresse : <span className="font-medium text-violet-600">{slugify(restaurantName)}.brizoapp.com</span>
            </p>
          )}
          <div>
            <label className="text-[12px] font-medium text-[#8A8A8A] mb-2 block tracking-wide">Votre nom</label>
            <input className={ic} placeholder="Mario Rossi" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#8A8A8A] mb-2 block tracking-wide">Email</label>
            <input className={ic} type="email" placeholder="mario@restaurant.com" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#8A8A8A] mb-2 block tracking-wide">Mot de passe (min 8 car.)</label>
            <input className={ic} type="password" placeholder="••••••••" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-center">{error}</div>
        )}

        {/* Submit */}
        <div className="mt-8">
          <button onClick={handleSubmit} disabled={!canSubmit || saving}
            className="w-full px-8 py-3 rounded-xl bg-[#1A1A1A] text-white font-medium text-[14px] hover:bg-[#333] disabled:opacity-40 transition-all">
            {saving ? 'Création en cours...' : 'Créer mon restaurant'}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Déjà un compte ? <Link href="/login" className="text-violet-600 font-medium hover:text-violet-700">Se connecter</Link>
          </p>
        </div>
      </div>
    </BrizoAuthLayout>
  );
}
