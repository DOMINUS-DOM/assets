'use client';

import { useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useLocation } from '@/contexts/LocationContext';
import { useApiData } from '@/hooks/useApiData';
import Link from 'next/link';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function MediaPage() {
  const { locationId } = useLocation();
  const locParam = locationId ? `?locationId=${locationId}` : '';
  const { data: media, refresh } = useApiData<any[]>(`/signage/media${locParam}`, []);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = filter === 'all' ? media : media.filter((m) => m.type === filter);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !locationId) return;

    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Upload ${i + 1}/${files.length} : ${file.name}`);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('locationId', locationId);
      formData.append('name', file.name.replace(/\.[^.]+$/, ''));

      try {
        const token = localStorage.getItem('2h-auth-token');
        await fetch('/api/signage/media', {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: formData,
        });
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }

    setUploading(false);
    setUploadProgress('');
    if (fileRef.current) fileRef.current.value = '';
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce media ?')) return;
    try {
      await api.post('/signage/media', { action: 'delete', id });
      refresh();
    } catch {}
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/signage" className="text-zinc-500 hover:text-white transition-colors">&larr;</Link>
          <h1 className="text-xl font-bold text-white">Mediatheque</h1>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleUpload}
            className="hidden"
            id="media-upload"
          />
          <label
            htmlFor="media-upload"
            className={`px-3 py-1.5 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {uploading ? uploadProgress : '+ Upload'}
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'image', 'video'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {f === 'all' ? 'Tous' : f === 'image' ? 'Images' : 'Videos'}
            {f === 'all' ? ` (${media.length})` : ` (${media.filter((m: any) => m.type === f).length})`}
          </button>
        ))}
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2">
            <span className="animate-spin text-amber-400">&#9696;</span>
            <span className="text-sm text-amber-400">{uploadProgress}</span>
          </div>
        </div>
      )}

      {/* Media grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-5xl block mb-3">🖼️</span>
          <p className="text-zinc-500 text-sm">Aucun media. Uploadez des images ou videos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((m: any) => (
            <div key={m.id} className="rounded-xl bg-zinc-900 border border-zinc-800/50 overflow-hidden group">
              {/* Thumbnail */}
              <div className="aspect-video bg-zinc-800 relative overflow-hidden">
                {m.type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                ) : m.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.thumbnailUrl} alt={m.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-3xl">🎬</span>
                  </div>
                )}
                {m.type === 'video' && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium">
                    {m.duration ? `${Math.round(m.duration)}s` : 'Video'}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-3 space-y-1">
                <p className="text-sm font-medium text-white truncate">{m.name}</p>
                <p className="text-xs text-zinc-500">
                  {m.format?.toUpperCase()} {m.width && m.height ? `${m.width}x${m.height}` : ''} — {formatBytes(m.bytes || 0)}
                </p>
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => copyUrl(m.url)}
                    className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    Copier URL
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
