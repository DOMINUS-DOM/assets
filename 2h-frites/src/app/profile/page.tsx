'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, isAuthenticated, loaded, updateProfile, changePassword } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  useEffect(() => {
    if (loaded && !isAuthenticated) router.replace('/login');
    if (user) { setName(user.name); setPhone(user.phone); setEmail(user.email); }
  }, [loaded, isAuthenticated, user, router]);

  if (!loaded || !user) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name, phone, email });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChangePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg('');
    if (newPw.length < 6) { setPwMsg(t.ui.auth_passwordTooShort); return; }
    const ok = await changePassword(oldPw, newPw);
    setPwMsg(ok ? '✅' : t.ui.auth_badCredentials);
    if (ok) { setOldPw(''); setNewPw(''); }
  };

  const ic = 'w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500/50';

  const ROLE_LABELS: Record<string, string> = {
    patron: 'bg-amber-500/20 text-amber-400',
    manager: 'bg-blue-500/20 text-blue-400',
    employe: 'bg-emerald-500/20 text-emerald-400',
    livreur: 'bg-orange-500/20 text-orange-400',
    client: 'bg-zinc-700/50 text-zinc-300',
  };

  return (
    <div className="min-h-screen max-w-lg mx-auto pb-20 bg-zinc-950">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/" className="text-amber-400 font-medium text-sm">← Menu</Link>
          <h1 className="text-sm font-bold text-white">{t.ui.auth_profile}</h1>
          <div className="w-12" />
        </div>
      </header>

      <div className="px-4 pt-6 space-y-8">
        {/* Avatar + Role */}
        <div className="text-center">
          <div className="relative inline-block mb-3">
            <div className="w-20 h-20 rounded-full bg-amber-500/20 text-amber-400 font-bold text-3xl flex items-center justify-center overflow-hidden">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0)
              )}
            </div>
            <label className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center cursor-pointer hover:bg-amber-400 transition-colors">
              <span className="text-xs">📷</span>
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const formData = new FormData();
                formData.append('file', file);
                formData.append('locationId', user.locationId || 'global');
                formData.append('name', `avatar-${user.id}`);
                try {
                  const token = localStorage.getItem('2h-auth-token');
                  const res = await fetch('/api/signage/media', {
                    method: 'POST',
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                    body: formData,
                  });
                  const media = await res.json();
                  if (media.url) {
                    await api.post('/auth', { action: 'updateAvatar', avatarUrl: media.url });
                    window.location.reload();
                  }
                } catch {}
              }} />
            </label>
          </div>
          <p className="text-lg font-bold text-white">{user.name}</p>
          <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${ROLE_LABELS[user.role]}`}>
            {t.ui[`role_${user.role}`]}
          </span>
        </div>

        {/* Edit profile */}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t.ui.auth_editProfile}</h2>
          <input className={ic} placeholder={t.ui.checkout_name} value={name} onChange={(e) => setName(e.target.value)} required />
          <input className={ic} type="email" placeholder={t.ui.auth_email} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={ic} type="tel" placeholder={t.ui.checkout_phone} value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <button type="submit"
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${saved ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-zinc-950'}`}>
            {saved ? '✅' : t.ui.auth_editProfile}
          </button>
        </form>

        {/* Change password */}
        <form onSubmit={handleChangePw} className="space-y-4">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t.ui.auth_changePassword}</h2>
          <input className={ic} type="password" placeholder={t.ui.auth_oldPassword} value={oldPw} onChange={(e) => setOldPw(e.target.value)} required />
          <input className={ic} type="password" placeholder={t.ui.auth_newPassword} value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
          {pwMsg && <p className="text-sm text-center">{pwMsg}</p>}
          <button type="submit" className="w-full py-3 rounded-xl bg-zinc-800 text-white font-bold text-sm">
            {t.ui.auth_changePassword}
          </button>
        </form>
      </div>
    </div>
  );
}
