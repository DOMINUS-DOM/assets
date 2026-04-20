'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const ic = 'w-full px-4 py-3.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-brand/50';

  if (!token) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <span className="text-5xl block mb-3">⚠️</span>
          <h1 className="text-xl font-bold text-white mb-2">Lien invalide</h1>
          <p className="text-zinc-400 text-sm mb-6">
            Aucun jeton n&apos;a été fourni. Demandez un nouveau lien de réinitialisation.
          </p>
          <Link href="/forgot-password" className="text-brand-light text-sm font-medium">
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth', { action: 'resetPasswordWithToken', token, newPassword: password });
      setDone(true);
      setTimeout(() => router.replace('/login'), 2500);
    } catch (e: any) {
      if (e?.error === 'invalid_token') {
        setError('Ce lien est expiré ou a déjà été utilisé. Demandez un nouveau lien.');
      } else if (e?.error === 'password_too_short') {
        setError('Le mot de passe doit contenir au moins 8 caractères.');
      } else {
        setError('Erreur. Réessayez.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <span className="text-4xl block mb-3">✅</span>
          <h1 className="text-xl font-bold text-white mb-2">Mot de passe mis à jour</h1>
          <p className="text-zinc-400 text-sm">Redirection vers la connexion…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <span className="text-5xl block mb-3">🔑</span>
          <h1 className="text-xl font-bold text-white">Nouveau mot de passe</h1>
          <p className="text-zinc-500 text-sm mt-1">Choisissez un mot de passe d&apos;au moins 8 caractères.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className={ic}
            type="password"
            placeholder="Nouveau mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
          <input
            className={ic}
            type="password"
            placeholder="Confirmer"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-brand text-zinc-950 font-bold text-sm active:scale-[0.97] transition-transform disabled:opacity-50"
          >
            {loading ? 'Enregistrement…' : 'Mettre à jour le mot de passe'}
          </button>
          <Link href="/login" className="text-zinc-500 text-xs block text-center mt-2">
            Retour à la connexion
          </Link>
        </form>
      </div>
    </div>
  );
}
