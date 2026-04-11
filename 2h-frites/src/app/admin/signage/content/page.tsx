'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useLocation } from '@/contexts/LocationContext';
import { useApiData } from '@/hooks/useApiData';
import { menuStore } from '@/stores/menuStore';
import Link from 'next/link';

const ic = 'w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-500/50';

const CONTENT_TYPES = [
  { value: 'menu', label: 'Menu' },
  { value: 'text', label: 'Texte' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
];

function typeBadge(type: string) {
  const colors: Record<string, string> = {
    menu: 'bg-blue-500/20 text-blue-400',
    text: 'bg-purple-500/20 text-purple-400',
    image: 'bg-emerald-500/20 text-emerald-400',
    video: 'bg-orange-500/20 text-orange-400',
  };
  return colors[type] || 'bg-zinc-700 text-zinc-400';
}

interface ContentForm {
  name: string;
  type: string;
  duration: number;
  status: string;
  text: string;
  fontSize: string;
  bgColor: string;
  textColor: string;
  menuCategories: string[];
  mediaUrl: string;
}

const emptyForm: ContentForm = {
  name: '',
  type: 'text',
  duration: 10,
  status: 'draft',
  text: '',
  fontSize: '24',
  bgColor: '#000000',
  textColor: '#ffffff',
  mediaUrl: '',
  menuCategories: [],
};

// ─── Preview Component ───

function ContentPreview({ form, categories }: { form: ContentForm; categories: any[] }) {
  if (form.type === 'text' && form.text) {
    const fontSize = Math.min(parseInt(form.fontSize) || 24, 48);
    // Scale down the font for preview
    const previewFontSize = Math.max(Math.round(fontSize * 0.5), 10);
    return (
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <p className="text-xs text-zinc-500 font-medium px-3 py-1.5 bg-zinc-800/50">Apercu</p>
        <div
          className="flex items-center justify-center p-6 min-h-[100px]"
          style={{ backgroundColor: form.bgColor }}
        >
          <p
            className="font-extrabold text-center leading-tight whitespace-pre-wrap"
            style={{ fontSize: `${previewFontSize}px`, color: form.textColor }}
          >
            {form.text}
          </p>
        </div>
      </div>
    );
  }

  if (form.type === 'menu') {
    const selectedCount = form.menuCategories.length;
    const selectedNames = categories
      .filter((c: any) => form.menuCategories.includes(c.id))
      .map((c: any) => c.name);

    return (
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <p className="text-xs text-zinc-500 font-medium px-3 py-1.5 bg-zinc-800/50">Apercu</p>
        <div className="p-4 bg-zinc-950 min-h-[80px] flex flex-col justify-center">
          <p className="text-sm font-semibold text-amber-400">
            {selectedCount} categorie{selectedCount > 1 ? 's' : ''} selectionnee{selectedCount > 1 ? 's' : ''}
          </p>
          {selectedNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {selectedNames.map((name: string) => (
                <span
                  key={name}
                  className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
          {selectedCount === 0 && (
            <p className="text-xs text-zinc-600 mt-1">Aucune categorie selectionnee</p>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// ─── Main Page ───

export default function ContentPage() {
  const { locationId } = useLocation();
  const locParam = locationId ? `?locationId=${locationId}` : '';
  const { data: contents, refresh } = useApiData<any[]>(`/signage/content${locParam}`, []);
  const { data: mediaList } = useApiData<any[]>(`/signage/media${locParam}`, []);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContentForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    setCategories(menuStore.getCategories());
  }, []);

  const buildConfigJson = (): string => {
    if (form.type === 'text') {
      return JSON.stringify({
        text: form.text,
        fontSize: form.fontSize,
        bgColor: form.bgColor,
        textColor: form.textColor,
      });
    }
    if (form.type === 'menu') {
      return JSON.stringify({ categories: form.menuCategories });
    }
    if (form.type === 'image' || form.type === 'video') {
      return JSON.stringify({ mediaUrl: form.mediaUrl });
    }
    return '{}';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !locationId) return;
    setSaving(true);
    try {
      const payload: any = {
        action: editingId ? 'update' : 'create',
        name: form.name,
        type: form.type,
        duration: form.duration,
        status: form.status,
        configJson: buildConfigJson(),
      };
      if (editingId) {
        payload.id = editingId;
      } else {
        payload.locationId = locationId;
      }
      await api.post('/signage/content', payload);
      resetForm();
      refresh();
    } catch {}
    setSaving(false);
  };

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (content: any) => {
    let config: any = {};
    try { config = JSON.parse(content.configJson || '{}'); } catch {}

    setForm({
      name: content.name,
      type: content.type,
      duration: content.duration,
      status: content.status,
      text: config.text || '',
      fontSize: config.fontSize || '24',
      bgColor: config.bgColor || '#000000',
      textColor: config.textColor || '#ffffff',
      menuCategories: config.categories || [],
      mediaUrl: config.mediaUrl || '',
    });
    setEditingId(content.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce contenu ?')) return;
    try {
      await api.post('/signage/content', { action: 'delete', id });
      refresh();
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/signage" className="text-zinc-500 hover:text-white transition-colors">
            &larr;
          </Link>
          <h1 className="text-xl font-bold text-white">Contenus</h1>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors"
        >
          {showForm && !editingId ? 'Annuler' : '+ Nouveau contenu'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-300">
            {editingId ? 'Modifier le contenu' : 'Nouveau contenu'}
          </h3>
          <input
            className={ic}
            placeholder="Nom du contenu"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-3 gap-3">
            <select
              className={ic}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {CONTENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <div className="relative">
              <input
                type="number"
                className={ic}
                placeholder="Duree (s)"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 10 })}
                min={1}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">sec</span>
            </div>
            <select
              className={ic}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="draft">Brouillon</option>
              <option value="published">Publie</option>
            </select>
          </div>

          {/* Type-specific config */}
          {form.type === 'text' && (
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 font-medium">Configuration du texte</p>
              <textarea
                className={`${ic} min-h-[80px]`}
                placeholder="Texte a afficher..."
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                rows={3}
              />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Taille police</label>
                  <input
                    type="number"
                    className={ic}
                    value={form.fontSize}
                    onChange={(e) => setForm({ ...form, fontSize: e.target.value })}
                    min={12}
                    max={120}
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Fond</label>
                  <input
                    type="color"
                    className="w-full h-[42px] rounded-lg bg-zinc-800 border border-zinc-700 cursor-pointer"
                    value={form.bgColor}
                    onChange={(e) => setForm({ ...form, bgColor: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Texte</label>
                  <input
                    type="color"
                    className="w-full h-[42px] rounded-lg bg-zinc-800 border border-zinc-700 cursor-pointer"
                    value={form.textColor}
                    onChange={(e) => setForm({ ...form, textColor: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {form.type === 'menu' && (
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 font-medium">Categories du menu a afficher</p>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat: any) => (
                  <label key={cat.id} className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.menuCategories.includes(cat.id)}
                      onChange={(e) => {
                        const updated = e.target.checked
                          ? [...form.menuCategories, cat.id]
                          : form.menuCategories.filter((id) => id !== cat.id);
                        setForm({ ...form, menuCategories: updated });
                      }}
                      className="rounded border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-amber-500/50"
                    />
                    {cat.name}
                  </label>
                ))}
              </div>
              {categories.length === 0 && (
                <p className="text-xs text-zinc-600">Aucune categorie trouvee dans le menu.</p>
              )}
            </div>
          )}

          {/* Image/Video media selector */}
          {(form.type === 'image' || form.type === 'video') && (
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 font-medium">
                {form.type === 'image' ? 'Selectionnez une image' : 'Selectionnez une video'}
              </p>
              {mediaList.filter((m: any) => m.type === form.type).length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-zinc-600 mb-2">Aucun media de ce type.</p>
                  <Link href="/admin/signage/media" className="text-xs text-amber-400 hover:text-amber-300">
                    Aller a la mediatheque &rarr;
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {mediaList.filter((m: any) => m.type === form.type).map((m: any) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setForm({ ...form, mediaUrl: m.url })}
                      className={`aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                        form.mediaUrl === m.url
                          ? 'border-amber-500 ring-1 ring-amber-500/30'
                          : 'border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.thumbnailUrl || m.url}
                        alt={m.name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
              {form.mediaUrl && (
                <p className="text-[10px] text-zinc-600 truncate">URL: {form.mediaUrl}</p>
              )}
            </div>
          )}

          {/* Live preview */}
          <ContentPreview form={form} categories={categories} />

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : editingId ? 'Mettre a jour' : 'Creer'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg bg-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-600 transition-colors"
              >
                Annuler
              </button>
            )}
          </div>
        </form>
      )}

      {contents.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucun contenu cree. Ajoutez-en un pour commencer.</p>
      ) : (
        <div className="space-y-3">
          {contents.map((content: any) => (
            <div
              key={content.id}
              className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{content.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{content.duration}s</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadge(content.type)}`}>
                    {content.type}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      content.status === 'published'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-zinc-700 text-zinc-400'
                    }`}
                  >
                    {content.status === 'published' ? 'Publie' : 'Brouillon'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => startEdit(content)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 font-medium transition-colors"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(content.id)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 font-medium transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
