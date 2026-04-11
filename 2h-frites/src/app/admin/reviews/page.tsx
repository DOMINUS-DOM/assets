'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';
import { useLocation } from '@/contexts/LocationContext';

export default function ReviewsPage() {
  const { t } = useLanguage();
  const { locationId } = useLocation();
  const locParam = locationId ? `?locationId=${locationId}` : '';
  const [reviews, setReviews] = useState<any[]>([]);
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const refresh = async () => { try { setReviews(await api.get<any[]>(`/reviews${locParam}`)); } catch {} };
  useEffect(() => { refresh(); }, []);

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">{t.ui.rev_title}</h1>
        <div className="text-right">
          <p className="text-2xl font-extrabold text-amber-400">⭐ {avgRating}</p>
          <p className="text-xs text-zinc-500">{reviews.length} {t.ui.rev_reviews}</p>
        </div>
      </div>

      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-bold text-white">{r.customerName}</p>
                <p className="text-xs text-zinc-500">{r.orderId} — {new Date(r.createdAt).toLocaleDateString('fr-BE')}</p>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} className={s <= r.rating ? 'text-amber-400' : 'text-zinc-700'}>★</span>
                ))}
              </div>
            </div>
            {r.comment && <p className="text-sm text-zinc-300 mb-2">{r.comment}</p>}
            {r.reply && (
              <div className="p-2 rounded-lg bg-zinc-800 text-xs text-zinc-400 mb-2">
                💬 {r.reply}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => api.post('/reviews', { action: 'togglePublish', id: r.id }).then(refresh)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${r.published ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                {r.published ? '👁 Publié' : '🔒 Masqué'}
              </button>
              {!r.reply && (
                <div className="flex gap-1 flex-1">
                  <input className="flex-1 px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-xs"
                    placeholder={t.ui.rev_replyPlaceholder} value={replyText[r.id] || ''}
                    onChange={(e) => setReplyText({ ...replyText, [r.id]: e.target.value })} />
                  <button onClick={() => { api.post('/reviews', { action: 'reply', id: r.id, reply: replyText[r.id] }).then(refresh); }}
                    className="px-2 py-1 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-medium">↩</button>
                </div>
              )}
            </div>
          </div>
        ))}
        {reviews.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">{t.ui.rev_empty}</p>}
      </div>
    </div>
  );
}
