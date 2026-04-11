'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useLocation } from '@/contexts/LocationContext';
import { formatPrice } from '@/utils/format';

type Tab = 'all' | 'draft' | 'validated' | 'paid';
type View = 'list' | 'create' | 'detail';

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Brouillon', cls: 'bg-zinc-700 text-zinc-300' },
  validated: { label: 'Validee', cls: 'bg-blue-500/20 text-blue-400' },
  paid: { label: 'Payee', cls: 'bg-emerald-500/20 text-emerald-400' },
};

const ic = 'w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-amber-500/50';

export default function InvoicesPage() {
  const { locationId } = useLocation();
  const [tab, setTab] = useState<Tab>('all');
  const [view, setView] = useState<View>('list');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [loading, setLoading] = useState(false);

  // Create form state
  const [form, setForm] = useState({
    supplierId: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    notes: '',
    imageUrl: '',
  });
  const [lines, setLines] = useState<any[]>([{ description: '', ingredientId: '', quantity: 1, unitPrice: 0, vatRate: 0.06 }]);
  const [extracting, setExtracting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const locParam = locationId ? `?locationId=${locationId}` : '';
      const statusParam = tab !== 'all' ? `${locParam ? '&' : '?'}status=${tab}` : '';
      const fromParam = filterFrom ? `${(locParam || statusParam) ? '&' : '?'}from=${filterFrom}` : '';
      const toParam = filterTo ? `${(locParam || statusParam || fromParam) ? '&' : '?'}to=${filterTo}` : '';
      const data = await api.get<any[]>(`/invoices/purchase${locParam}${statusParam}${fromParam}${toParam}`);
      setInvoices(data);
    } catch {}
  }, [locationId, tab, filterFrom, filterTo]);

  const loadMeta = useCallback(async () => {
    try {
      const locParam = locationId ? `?locationId=${locationId}` : '';
      const inv = await api.get<{ ingredients: any[]; suppliers: any[] }>(`/inventory${locParam}`);
      setIngredients(inv.ingredients || []);
      setSuppliers(inv.suppliers || []);
    } catch {}
  }, [locationId]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { loadMeta(); }, [loadMeta]);

  const filteredInvoices = invoices.filter((inv) => {
    if (filterSupplier && inv.supplierId !== filterSupplier) return false;
    return true;
  });

  const handleUploadImage = async (file: File) => {
    if (!locationId) { alert('Selectionnez un site d\'abord'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('locationId', locationId);
      fd.append('name', file.name);
      fd.append('folder', 'invoices');

      const token = typeof window !== 'undefined' ? localStorage.getItem('2h-auth-token') : null;
      const res = await fetch('/api/signage/media', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const media = await res.json();
      if (media.url) {
        setForm({ ...form, imageUrl: media.url });
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleExtract = async () => {
    if (!form.imageUrl) { alert('Uploadez une image d\'abord'); return; }
    setExtracting(true);
    try {
      const data = await api.post<any>('/invoices/purchase/extract', { imageUrl: form.imageUrl });
      // Fill form from AI data
      if (data.invoiceNumber) setForm((f) => ({ ...f, invoiceNumber: data.invoiceNumber }));
      if (data.invoiceDate) setForm((f) => ({ ...f, invoiceDate: data.invoiceDate }));
      // Match supplier by name
      if (data.supplierName) {
        const match = suppliers.find((s) => s.name.toLowerCase().includes(data.supplierName.toLowerCase()));
        if (match) setForm((f) => ({ ...f, supplierId: match.id }));
      }
      // Fill lines
      if (data.lines && data.lines.length > 0) {
        setLines(data.lines.map((l: any) => ({
          description: l.description || '',
          ingredientId: '',
          quantity: l.quantity || 1,
          unitPrice: l.unitPrice || 0,
          vatRate: l.vatRate || 0.06,
        })));
      }
    } catch (err: any) {
      alert('Erreur extraction IA: ' + (err.error || err.message || 'Erreur inconnue'));
    } finally {
      setExtracting(false);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const invoice = await api.post<any>('/invoices/purchase', {
        action: 'create',
        locationId,
        supplierId: form.supplierId || null,
        invoiceNumber: form.invoiceNumber,
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate || null,
        notes: form.notes,
        imageUrl: form.imageUrl || null,
        lines: lines.filter((l) => l.description || l.ingredientId),
      });
      setView('list');
      resetForm();
      refresh();
    } catch (err: any) {
      alert('Erreur: ' + (err.error || 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.post('/invoices/purchase', { action: 'updateStatus', id, status });
      refresh();
      if (selectedInvoice?.id === id) {
        setSelectedInvoice({ ...selectedInvoice, status });
      }
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette facture brouillon ?')) return;
    try {
      await api.post('/invoices/purchase', { action: 'delete', id });
      setView('list');
      setSelectedInvoice(null);
      refresh();
    } catch (err: any) {
      alert(err.error || 'Erreur');
    }
  };

  const resetForm = () => {
    setForm({ supplierId: '', invoiceNumber: '', invoiceDate: new Date().toISOString().slice(0, 10), dueDate: '', notes: '', imageUrl: '' });
    setLines([{ description: '', ingredientId: '', quantity: 1, unitPrice: 0, vatRate: 0.06 }]);
  };

  const addLine = () => setLines([...lines, { description: '', ingredientId: '', quantity: 1, unitPrice: 0, vatRate: 0.06 }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: string, value: any) => {
    const updated = [...lines];
    updated[i] = { ...updated[i], [field]: value };
    setLines(updated);
  };

  const calcLineTotal = (l: any) => l.quantity * l.unitPrice;
  const calcSubtotal = () => lines.reduce((s, l) => s + calcLineTotal(l), 0);
  const calcVat = () => lines.reduce((s, l) => s + calcLineTotal(l) * l.vatRate, 0);
  const calcGrand = () => calcSubtotal() + calcVat();

  const TABS: { key: Tab; label: string }[] = [
    { key: 'all', label: 'Toutes' },
    { key: 'draft', label: 'Brouillon' },
    { key: 'validated', label: 'Validees' },
    { key: 'paid', label: 'Payees' },
  ];

  // ─── DETAIL VIEW ───
  if (view === 'detail' && selectedInvoice) {
    const inv = selectedInvoice;
    const badge = STATUS_BADGE[inv.status] || STATUS_BADGE.draft;
    return (
      <div className="space-y-4">
        <button onClick={() => { setView('list'); setSelectedInvoice(null); }}
          className="text-sm text-zinc-400 hover:text-white">&larr; Retour</button>

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Facture {inv.invoiceNumber || '#' + inv.id.slice(-6)}</h1>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.cls}`}>{badge.label}</span>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-zinc-500">Fournisseur:</span> <span className="text-white">{inv.supplier?.name || '-'}</span></div>
            <div><span className="text-zinc-500">Date:</span> <span className="text-white">{inv.invoiceDate}</span></div>
            <div><span className="text-zinc-500">Echeance:</span> <span className="text-white">{inv.dueDate || '-'}</span></div>
            <div><span className="text-zinc-500">N:</span> <span className="text-white">{inv.invoiceNumber || '-'}</span></div>
          </div>
          {inv.notes && <p className="text-xs text-zinc-500 italic mt-2">{inv.notes}</p>}
          {inv.imageUrl && (
            <div className="mt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={inv.imageUrl} alt="Facture" className="max-h-48 rounded-lg border border-zinc-700" />
            </div>
          )}
        </div>

        {/* Lines */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
          <h3 className="text-xs font-bold text-zinc-400 uppercase mb-3">Lignes</h3>
          <div className="space-y-2">
            {(inv.lines || []).map((line: any) => (
              <div key={line.id} className="flex items-center justify-between text-sm py-1.5 border-b border-zinc-800/30 last:border-0">
                <div>
                  <span className="text-white">{line.description || line.ingredient?.name || '-'}</span>
                  {line.ingredient && <span className="text-xs text-zinc-500 ml-2">({line.ingredient.name})</span>}
                </div>
                <div className="flex items-center gap-4 text-zinc-400">
                  <span>{line.quantity} x {formatPrice(line.unitPrice)}</span>
                  <span className="text-xs">TVA {(line.vatRate * 100).toFixed(0)}%</span>
                  <span className="text-amber-400 font-bold">{formatPrice(line.total)} &euro;</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-700 space-y-1">
            <div className="flex justify-between text-sm"><span className="text-zinc-400">Sous-total HT</span><span className="text-white">{formatPrice(inv.subtotal)} &euro;</span></div>
            <div className="flex justify-between text-sm"><span className="text-zinc-400">TVA</span><span className="text-white">{formatPrice(inv.totalVat)} &euro;</span></div>
            <div className="flex justify-between text-sm font-bold border-t border-zinc-700 pt-2"><span className="text-white">Total TTC</span><span className="text-amber-400">{formatPrice(inv.grandTotal)} &euro;</span></div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {inv.status === 'draft' && (
            <>
              <button onClick={() => handleStatusChange(inv.id, 'validated')}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold">Valider</button>
              <button onClick={() => handleDelete(inv.id)}
                className="px-4 py-2 rounded-lg bg-red-600/20 text-red-400 text-sm font-medium">Supprimer</button>
            </>
          )}
          {inv.status === 'validated' && (
            <button onClick={() => handleStatusChange(inv.id, 'paid')}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold">Marquer payee</button>
          )}
        </div>
      </div>
    );
  }

  // ─── CREATE VIEW ───
  if (view === 'create') {
    return (
      <div className="space-y-4">
        <button onClick={() => { setView('list'); resetForm(); }}
          className="text-sm text-zinc-400 hover:text-white">&larr; Retour</button>

        <h1 className="text-xl font-bold text-white">Nouvelle facture fournisseur</h1>

        {/* Image upload */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-3">
          <h3 className="text-xs font-bold text-zinc-400 uppercase">Photo de la facture</h3>
          {form.imageUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.imageUrl} alt="Facture" className="max-h-48 rounded-lg border border-zinc-700" />
              <button onClick={() => setForm({ ...form, imageUrl: '' })}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">&times;</button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-32 rounded-lg border-2 border-dashed border-zinc-700 hover:border-amber-500/50 cursor-pointer transition-colors">
              <span className="text-zinc-500 text-sm">{uploading ? 'Upload en cours...' : 'Cliquez pour uploader'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadImage(f);
              }} disabled={uploading} />
            </label>
          )}
          {form.imageUrl && (
            <button onClick={handleExtract} disabled={extracting}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold disabled:opacity-50">
              {extracting ? 'Extraction IA en cours...' : 'Extraire avec IA'}
            </button>
          )}
        </div>

        {/* Header fields */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-3">
          <h3 className="text-xs font-bold text-zinc-400 uppercase">Informations</h3>
          <div className="grid grid-cols-2 gap-2">
            <select className={ic} value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">Fournisseur</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input className={ic} placeholder="N de facture" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
            <input className={ic} type="date" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} />
            <input className={ic} type="date" placeholder="Echeance" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <textarea className={ic} placeholder="Notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>

        {/* Lines */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-400 uppercase">Lignes</h3>
            <button onClick={addLine} className="text-xs text-amber-400 hover:text-amber-300 font-medium">+ Ligne</button>
          </div>
          {lines.map((line, i) => (
            <div key={i} className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Ligne {i + 1}</span>
                {lines.length > 1 && (
                  <button onClick={() => removeLine(i)} className="text-xs text-red-400 hover:text-red-300">&times;</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className={ic} placeholder="Description" value={line.description}
                  onChange={(e) => updateLine(i, 'description', e.target.value)} />
                <select className={ic} value={line.ingredientId}
                  onChange={(e) => updateLine(i, 'ingredientId', e.target.value)}>
                  <option value="">Ingredient (optionnel)</option>
                  {ingredients.map((ing) => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                </select>
                <input className={ic} type="number" step="0.01" placeholder="Quantite" value={line.quantity}
                  onChange={(e) => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)} />
                <input className={ic} type="number" step="0.01" placeholder="Prix unitaire" value={line.unitPrice}
                  onChange={(e) => updateLine(i, 'unitPrice', parseFloat(e.target.value) || 0)} />
                <select className={ic} value={line.vatRate}
                  onChange={(e) => updateLine(i, 'vatRate', parseFloat(e.target.value))}>
                  <option value={0}>TVA 0%</option>
                  <option value={0.06}>TVA 6%</option>
                  <option value={0.12}>TVA 12%</option>
                  <option value={0.21}>TVA 21%</option>
                </select>
                <div className="flex items-center px-3 text-sm text-amber-400 font-bold">
                  = {formatPrice(calcLineTotal(line))} &euro; HT
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-amber-500/30 space-y-1">
          <div className="flex justify-between text-sm"><span className="text-zinc-400">Sous-total HT</span><span className="text-white font-bold">{formatPrice(calcSubtotal())} &euro;</span></div>
          <div className="flex justify-between text-sm"><span className="text-zinc-400">TVA</span><span className="text-white">{formatPrice(calcVat())} &euro;</span></div>
          <div className="flex justify-between text-sm font-bold border-t border-zinc-700 pt-2">
            <span className="text-white">Total TTC</span>
            <span className="text-amber-400 text-lg">{formatPrice(calcGrand())} &euro;</span>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-2">
          <button onClick={() => { setView('list'); resetForm(); }}
            className="flex-1 py-3 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium">Annuler</button>
          <button onClick={handleCreate} disabled={loading}
            className="flex-1 py-3 rounded-lg bg-amber-500 text-zinc-950 font-bold text-sm disabled:opacity-50">
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Factures fournisseurs</h1>
        <button onClick={() => setView('create')}
          className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 font-bold text-sm">+ Nouvelle facture</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const count = t.key === 'all' ? invoices.length : invoices.filter((i) => i.status === t.key).length;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === t.key ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500'
              }`}>
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select className={`${ic} !w-auto`} value={filterSupplier} onChange={(e) => setFilterSupplier(e.target.value)}>
          <option value="">Tous fournisseurs</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="date" className={`${ic} !w-auto`} value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} placeholder="Du" />
        <input type="date" className={`${ic} !w-auto`} value={filterTo} onChange={(e) => setFilterTo(e.target.value)} placeholder="Au" />
      </div>

      {/* Invoice list */}
      <div className="space-y-2">
        {filteredInvoices.map((inv) => {
          const badge = STATUS_BADGE[inv.status] || STATUS_BADGE.draft;
          return (
            <button key={inv.id} onClick={() => { setSelectedInvoice(inv); setView('detail'); }}
              className="w-full p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 hover:border-amber-500/30 transition-colors text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{inv.supplier?.name || 'Sans fournisseur'}</p>
                    <p className="text-xs text-zinc-500">{inv.invoiceDate} &middot; {inv.invoiceNumber || 'Sans numero'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-400">{formatPrice(inv.grandTotal)} &euro;</p>
                    <p className="text-xs text-zinc-500">TVA {formatPrice(inv.totalVat)} &euro;</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                </div>
              </div>
            </button>
          );
        })}
        {filteredInvoices.length === 0 && (
          <p className="text-zinc-500 text-sm text-center py-8">Aucune facture</p>
        )}
      </div>
    </div>
  );
}
