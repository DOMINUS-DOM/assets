'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

export default function NewOrganizationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Organization
  const [orgName, setOrgName] = useState('');
  const [slug, setSlug] = useState('');

  // Step 2: Location
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Step 3: Admin user
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const handleOrgNameChange = (v: string) => {
    setOrgName(v);
    setSlug(slugify(v));
  };

  const canNext = () => {
    if (step === 1) return orgName.length >= 2 && slug.length >= 2;
    if (step === 2) return locationName && address && city && postalCode && phone && email;
    if (step === 3) return adminName && adminEmail && adminPassword.length >= 6;
    return false;
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      const result = await api.post<any>('/organizations', {
        action: 'create',
        orgName,
        slug,
        locationName,
        address,
        city,
        postalCode,
        phone,
        email,
        adminName,
        adminEmail,
        adminPassword,
      });
      router.push('/admin/organizations');
    } catch (e: any) {
      const msg = e?.error === 'slug_taken' ? 'Ce slug est deja utilise.'
        : e?.error === 'email_taken' ? 'Cet email est deja utilise.'
        : 'Erreur lors de la creation. Reessayez.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand/50";

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold text-white">Nouvelle organisation</h1>

      {/* Progress */}
      <div className="flex gap-1">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`flex-1 h-1 rounded-full ${s <= step ? 'bg-brand' : 'bg-zinc-800'}`} />
        ))}
      </div>

      {/* Step 1: Organization */}
      {step === 1 && (
        <div className="space-y-4 p-5 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">1. Organisation</h2>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Nom du restaurant</label>
            <input value={orgName} onChange={(e) => handleOrgNameChange(e.target.value)} placeholder="Ex: Pizza Mario" className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Slug (sous-domaine)</label>
            <div className="flex items-center gap-2">
              <input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="pizza-mario" className={inputClass} />
              <span className="text-xs text-zinc-500 whitespace-nowrap shrink-0">.platform.com</span>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Location */}
      {step === 2 && (
        <div className="space-y-4 p-5 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">2. Premier site</h2>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Nom du site</label>
            <input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Ex: Pizza Mario — Centre-ville" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Adresse</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rue de..." className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Ville</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bruxelles" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Code postal</label>
              <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="1000" className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Telephone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+32..." className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@..." className={inputClass} />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Admin */}
      {step === 3 && (
        <div className="space-y-4 p-5 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">3. Administrateur</h2>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Nom complet</label>
            <input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Mario Rossi" className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Email</label>
            <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="mario@pizzamario.be" className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Mot de passe (min 6 car.)</label>
            <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="••••••" className={inputClass} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 1 && (
          <button onClick={() => setStep(step - 1)} className="px-4 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium">
            ← Retour
          </button>
        )}
        <div className="flex-1" />
        {step < 3 ? (
          <button onClick={() => setStep(step + 1)} disabled={!canNext()}
            className="px-6 py-2.5 rounded-lg bg-brand text-zinc-950 font-bold text-sm disabled:opacity-40">
            Suivant →
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={!canNext() || saving}
            className="px-6 py-2.5 rounded-lg bg-brand text-zinc-950 font-bold text-sm disabled:opacity-40">
            {saving ? 'Creation...' : 'Creer l\'organisation'}
          </button>
        )}
      </div>
    </div>
  );
}
