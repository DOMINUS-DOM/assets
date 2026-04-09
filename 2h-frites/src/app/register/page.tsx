'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import Link from 'next/link';

export default function RegisterPage() {
  const { register } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError(t.ui.auth_passwordMismatch); return; }
    if (password.length < 6) { setError(t.ui.auth_passwordTooShort); return; }
    const err = await register({ email, password, name, phone });
    if (err) { setError(t.ui[err] || err); return; }
    router.replace('/');
  };

  const ic = 'w-full px-4 py-3.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500/50';

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl block mb-3">🍟</span>
          <h1 className="text-2xl font-extrabold text-white">{t.ui.auth_register}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input className={ic} placeholder={t.ui.checkout_name} value={name} onChange={(e) => setName(e.target.value)} required />
          <input className={ic} type="email" placeholder={t.ui.auth_email} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={ic} type="tel" placeholder={t.ui.checkout_phone} value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <input className={ic} type="password" placeholder={t.ui.auth_password} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <input className={ic} type="password" placeholder={t.ui.auth_confirmPassword} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit"
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-bold text-sm active:scale-[0.97] transition-transform">
            {t.ui.auth_registerBtn}
          </button>
        </form>

        <p className="mt-6 text-center">
          <Link href="/login" className="text-amber-400 text-sm font-medium">{t.ui.auth_hasAccount}</Link>
        </p>
      </div>
    </div>
  );
}
