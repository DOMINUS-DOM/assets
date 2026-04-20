'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { api } from '@/lib/api';

export default function ChangePasswordPage() {
  const { user, logout } = useAuth();
  const { isPlatform } = useTenant();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) {
    router.replace('/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caracteres.');
      return;
    }
    if (newPassword !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/auth', { action: 'forceChangePassword', newPassword });
      router.replace('/admin');
    } catch (e: any) {
      setError(e?.error || 'Erreur. Reessayez.');
    } finally {
      setSaving(false);
    }
  };

  const ic = isPlatform
    ? 'w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all'
    : 'w-full px-4 py-3.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-brand/50';

  return (
    <div className={`min-h-screen flex items-center justify-center px-6 ${isPlatform ? 'bg-[#fafbfc]' : 'bg-zinc-950'}`}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {isPlatform ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brizo-icon.svg" alt="BrizoApp" className="h-12 w-12 mx-auto mb-4" />
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Changement de mot de passe</h1>
              <p className="text-sm text-slate-500 mt-1">Votre mot de passe temporaire doit etre modifie.</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold text-white">Changement de mot de passe</h1>
              <p className="text-sm text-zinc-500 mt-1">Votre mot de passe temporaire doit etre modifie.</p>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`text-xs font-medium mb-1.5 block ${isPlatform ? 'text-slate-500' : 'text-zinc-500'}`}>Nouveau mot de passe</label>
            <input className={ic} type="password" placeholder="Min. 8 caracteres" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className={`text-xs font-medium mb-1.5 block ${isPlatform ? 'text-slate-500' : 'text-zinc-500'}`}>Confirmer</label>
            <input className={ic} type="password" placeholder="Retapez le mot de passe" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button type="submit" disabled={saving}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 ${
              isPlatform
                ? 'bg-gradient-to-r from-[#108eff] to-[#9f32fd] text-white shadow-lg shadow-violet-500/25'
                : 'bg-gradient-to-r from-brand to-orange-500 text-zinc-950'
            }`}>
            {saving ? 'Enregistrement...' : 'Enregistrer le nouveau mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}
