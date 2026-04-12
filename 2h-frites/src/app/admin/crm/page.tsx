'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatPrice } from '@/utils/format';

const SEG_COLORS: Record<string, string> = {
  new: 'bg-blue-500/15 text-blue-400',
  regular: 'bg-amber-500/15 text-amber-400',
  vip: 'bg-purple-500/15 text-purple-400',
  inactive: 'bg-zinc-700/50 text-zinc-400',
};

const DISCOUNT_LABELS: Record<string, string> = {
  item: 'Article',
  amount: 'Montant',
  percentage: 'Pourcentage',
};

type Tab = 'customers' | 'rewards' | 'stats';

interface LoyaltyTx {
  id: string;
  type: string;
  points: number;
  reason: string;
  createdAt: string;
}

interface Customer {
  id: string;
  phone: string;
  name: string;
  email?: string;
  address?: string;
  notes: string;
  segment: string;
  loyaltyPoints: number;
  lifetimePoints: number;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  createdAt: string;
  loyaltyTransactions: LoyaltyTx[];
}

interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  discountType: string;
  discountValue: number;
  active: boolean;
  imageUrl?: string;
  timesRedeemed: number;
}

interface Stats {
  totalCustomers: number;
  totalPointsIssued: number;
  totalRedeemed: number;
  avgPointsPerCustomer: number;
}

export default function CRMPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [stats, setStats] = useState<Stats>({ totalCustomers: 0, totalPointsIssued: 0, totalRedeemed: 0, avgPointsPerCustomer: 0 });
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Customer detail edit state
  const [editNotes, setEditNotes] = useState('');
  const [editSegment, setEditSegment] = useState('');
  const [bonusPoints, setBonusPoints] = useState('');
  const [bonusReason, setBonusReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Reward form state
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [rwName, setRwName] = useState('');
  const [rwDesc, setRwDesc] = useState('');
  const [rwCost, setRwCost] = useState('');
  const [rwType, setRwType] = useState('item');
  const [rwValue, setRwValue] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const d = await api.get<{ customers: Customer[]; rewards: Reward[]; stats: Stats }>('/loyalty');
      setCustomers(d.customers);
      setRewards(d.rewards);
      setStats(d.stats);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // When selecting a customer, sync edit fields
  useEffect(() => {
    if (selectedCustomer) {
      setEditNotes(selectedCustomer.notes || '');
      setEditSegment(selectedCustomer.segment);
      setBonusPoints('');
      setBonusReason('');
    }
  }, [selectedCustomer]);

  const segments = useMemo(() => ({
    total: customers.length,
    new: customers.filter((c) => c.segment === 'new').length,
    regular: customers.filter((c) => c.segment === 'regular').length,
    vip: customers.filter((c) => c.segment === 'vip').length,
    inactive: customers.filter((c) => c.segment === 'inactive').length,
  }), [customers]);

  const filtered = useMemo(() => {
    let list = filter === 'all' ? customers : customers.filter((c) => c.segment === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [customers, filter, search]);

  const topCustomers = useMemo(() =>
    [...customers].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10),
    [customers]
  );

  // ─── Actions ───
  const exportCSV = () => {
    const csv = [
      'Nom,Tel,Email,Segment,Commandes,Points,Total depense',
      ...customers.map((c) =>
        `${c.name},${c.phone},${c.email || ''},${c.segment},${c.totalOrders},${c.loyaltyPoints},${c.totalSpent}`
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clients.csv';
    a.click();
  };

  const saveCustomer = async () => {
    if (!selectedCustomer) return;
    setSaving(true);
    try {
      await api.post('/loyalty', {
        action: 'updateCustomer',
        id: selectedCustomer.id,
        notes: editNotes,
        segment: editSegment,
      });
      await fetchData();
      setSelectedCustomer((prev) =>
        prev ? { ...prev, notes: editNotes, segment: editSegment } : null
      );
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const awardBonus = async () => {
    if (!selectedCustomer || !bonusPoints || !bonusReason) return;
    setSaving(true);
    try {
      await api.post('/loyalty', {
        action: 'bonus',
        phone: selectedCustomer.phone,
        points: parseInt(bonusPoints),
        reason: bonusReason,
      });
      setBonusPoints('');
      setBonusReason('');
      await fetchData();
      // Refresh selected customer
      const refreshed = (await api.get<{ customers: Customer[] }>('/loyalty')).customers.find(
        (c) => c.id === selectedCustomer.id
      );
      if (refreshed) setSelectedCustomer(refreshed);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const resetRewardForm = () => {
    setRwName('');
    setRwDesc('');
    setRwCost('');
    setRwType('item');
    setRwValue('');
    setEditingReward(null);
    setShowRewardForm(false);
  };

  const openEditReward = (rw: Reward) => {
    setEditingReward(rw);
    setRwName(rw.name);
    setRwDesc(rw.description);
    setRwCost(String(rw.pointsCost));
    setRwType(rw.discountType);
    setRwValue(String(rw.discountValue));
    setShowRewardForm(true);
  };

  const saveReward = async () => {
    setSaving(true);
    try {
      if (editingReward) {
        await api.post('/loyalty', {
          action: 'updateReward',
          id: editingReward.id,
          name: rwName,
          description: rwDesc,
          pointsCost: parseInt(rwCost),
          discountType: rwType,
          discountValue: parseFloat(rwValue || '0'),
        });
      } else {
        await api.post('/loyalty', {
          action: 'createReward',
          name: rwName,
          description: rwDesc,
          pointsCost: parseInt(rwCost),
          discountType: rwType,
          discountValue: parseFloat(rwValue || '0'),
        });
      }
      resetRewardForm();
      await fetchData();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const deleteReward = async (id: string) => {
    try {
      await api.post('/loyalty', { action: 'deleteReward', id });
      await fetchData();
    } catch {
      // silent
    }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'customers', label: t.ui.crm_customers },
    { key: 'rewards', label: t.ui.crm_loyalty },
    { key: 'stats', label: t.ui.crm_segments },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-white shrink-0">{t.ui.crm_title}</h1>
        <div className="flex items-center gap-2">
          {tab === 'customers' && (
            <>
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 w-40"
              />
              <button onClick={exportCSV} className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-medium hover:text-white">
                CSV
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            onClick={() => { setTab(tb.key); setSelectedCustomer(null); }}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === tb.key ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-zinc-500 text-sm text-center py-8">Chargement...</p>}

      {/* ═══ CLIENTS TAB ═══ */}
      {!loading && tab === 'customers' && (
        <div className="flex gap-4">
          {/* Left: customer list */}
          <div className={`space-y-3 ${selectedCustomer ? 'w-1/2' : 'w-full'} transition-all`}>
            {/* Segment filters */}
            <div className="flex gap-1.5 overflow-x-auto">
              {['all', 'vip', 'regular', 'new', 'inactive'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    filter === s ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-900 text-zinc-500'
                  }`}
                >
                  {s === 'all' ? t.ui.admin_all : t.ui[`crm_seg_${s}` as keyof typeof t.ui]}
                  {' '}({s === 'all' ? customers.length : customers.filter((c) => c.segment === s).length})
                </button>
              ))}
            </div>

            {/* Customer cards */}
            {filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCustomer(c)}
                className={`p-4 rounded-xl bg-zinc-900 border cursor-pointer transition-colors ${
                  selectedCustomer?.id === c.id
                    ? 'border-amber-500/50'
                    : 'border-zinc-800/50 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">{c.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${SEG_COLORS[c.segment]}`}>
                        {t.ui[`crm_seg_${c.segment}` as keyof typeof t.ui]}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {c.phone}{c.email ? ` -- ${c.email}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-400">{formatPrice(c.totalSpent)} EUR</p>
                    <p className="text-[10px] text-zinc-500">
                      {c.totalOrders} {t.ui.crm_orders} -- {c.loyaltyPoints} pts
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-zinc-500 text-sm text-center py-8">{t.ui.crm_noCustomers}</p>
            )}
          </div>

          {/* Right: customer detail panel */}
          {selectedCustomer && (
            <div className="w-1/2 space-y-4">
              <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">{selectedCustomer.name}</h2>
                    <p className="text-xs text-zinc-400">{selectedCustomer.phone}</p>
                    {selectedCustomer.email && (
                      <p className="text-xs text-zinc-400">{selectedCustomer.email}</p>
                    )}
                    {selectedCustomer.address && (
                      <p className="text-xs text-zinc-500 mt-1">{selectedCustomer.address}</p>
                    )}
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="text-zinc-500 hover:text-white text-sm">
                    X
                  </button>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-zinc-950 text-center">
                    <p className="text-lg font-bold text-amber-400">{selectedCustomer.loyaltyPoints}</p>
                    <p className="text-[10px] text-zinc-500">Points</p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-950 text-center">
                    <p className="text-lg font-bold text-white">{selectedCustomer.totalOrders}</p>
                    <p className="text-[10px] text-zinc-500">{t.ui.crm_orders}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-950 text-center">
                    <p className="text-lg font-bold text-white">{formatPrice(selectedCustomer.totalSpent)} EUR</p>
                    <p className="text-[10px] text-zinc-500">Total</p>
                  </div>
                </div>

                {/* Segment override */}
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Segment</label>
                  <select
                    value={editSegment}
                    onChange={(e) => setEditSegment(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="new">{t.ui.crm_seg_new}</option>
                    <option value="regular">{t.ui.crm_seg_regular}</option>
                    <option value="vip">{t.ui.crm_seg_vip}</option>
                    <option value="inactive">{t.ui.crm_seg_inactive}</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-none focus:border-amber-500/50 resize-none"
                    placeholder="Notes sur le client..."
                  />
                </div>

                <button
                  onClick={saveCustomer}
                  disabled={saving}
                  className="w-full py-2 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-medium hover:bg-amber-500/25 disabled:opacity-50"
                >
                  {saving ? 'Enregistrement...' : 'Sauvegarder'}
                </button>

                {/* Bonus points */}
                <div className="border-t border-zinc-800 pt-4">
                  <p className="text-xs text-zinc-400 mb-2 font-medium">Bonus points</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={bonusPoints}
                      onChange={(e) => setBonusPoints(e.target.value)}
                      placeholder="Points"
                      className="w-20 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-none focus:border-amber-500/50"
                    />
                    <input
                      type="text"
                      value={bonusReason}
                      onChange={(e) => setBonusReason(e.target.value)}
                      placeholder="Raison"
                      className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-none focus:border-amber-500/50"
                    />
                    <button
                      onClick={awardBonus}
                      disabled={saving || !bonusPoints || !bonusReason}
                      className="px-3 py-2 rounded-lg bg-purple-500/15 text-purple-400 text-xs font-medium hover:bg-purple-500/25 disabled:opacity-50"
                    >
                      + Bonus
                    </button>
                  </div>
                </div>

                {/* Transaction history */}
                <div className="border-t border-zinc-800 pt-4">
                  <p className="text-xs text-zinc-400 mb-2 font-medium">Historique fidelite</p>
                  {selectedCustomer.loyaltyTransactions.length === 0 && (
                    <p className="text-xs text-zinc-600">Aucune transaction.</p>
                  )}
                  {selectedCustomer.loyaltyTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between py-1.5 border-b border-zinc-800/50 last:border-0">
                      <div>
                        <span className={`text-xs font-medium ${
                          tx.points > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {tx.points > 0 ? '+' : ''}{tx.points} pts
                        </span>
                        <span className="text-[10px] text-zinc-500 ml-2">{tx.type}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-zinc-500">{tx.reason}</p>
                        <p className="text-[10px] text-zinc-600">
                          {new Date(tx.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ REWARDS TAB ═══ */}
      {!loading && tab === 'rewards' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">{t.ui.crm_loyaltyHint}</p>
            <button
              onClick={() => { resetRewardForm(); setShowRewardForm(true); }}
              className="px-3 py-2 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-medium hover:bg-amber-500/25"
            >
              + Ajouter
            </button>
          </div>

          {/* Add/Edit reward form */}
          {showRewardForm && (
            <div className="p-4 rounded-xl bg-zinc-900 border border-amber-500/30 space-y-3">
              <p className="text-sm font-bold text-white">
                {editingReward ? 'Modifier la recompense' : 'Nouvelle recompense'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Nom</label>
                  <input
                    value={rwName}
                    onChange={(e) => setRwName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Cout en points</label>
                  <input
                    type="number"
                    value={rwCost}
                    onChange={(e) => setRwCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Type de reduction</label>
                  <select
                    value={rwType}
                    onChange={(e) => setRwType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="item">Article offert</option>
                    <option value="amount">Reduction montant (EUR)</option>
                    <option value="percentage">Reduction pourcentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Valeur</label>
                  <input
                    type="number"
                    value={rwValue}
                    onChange={(e) => setRwValue(e.target.value)}
                    placeholder={rwType === 'percentage' ? 'ex: 10' : 'ex: 5'}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Description</label>
                <input
                  value={rwDesc}
                  onChange={(e) => setRwDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveReward}
                  disabled={saving || !rwName || !rwCost}
                  className="px-4 py-2 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-medium hover:bg-amber-500/25 disabled:opacity-50"
                >
                  {saving ? '...' : editingReward ? 'Modifier' : 'Creer'}
                </button>
                <button
                  onClick={resetRewardForm}
                  className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-medium hover:text-white"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Rewards list */}
          {rewards.map((rw) => (
            <div key={rw.id} className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
              <div>
                <p className="text-sm font-bold text-white">{rw.name}</p>
                <p className="text-xs text-zinc-400">{rw.description}</p>
                <p className="text-[10px] text-zinc-500 mt-1">
                  {DISCOUNT_LABELS[rw.discountType] || rw.discountType}
                  {rw.discountValue > 0 && `: ${rw.discountType === 'percentage' ? `${rw.discountValue}%` : `${rw.discountValue} EUR`}`}
                  {' -- '}{rw.timesRedeemed}x utilise
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-amber-400">{rw.pointsCost} pts</span>
                <button
                  onClick={() => openEditReward(rw)}
                  className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-xs hover:text-white"
                >
                  Mod.
                </button>
                <button
                  onClick={() => deleteReward(rw.id)}
                  className="p-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20"
                >
                  Supp.
                </button>
              </div>
            </div>
          ))}
          {rewards.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-8">Aucune recompense active.</p>
          )}
        </div>
      )}

      {/* ═══ STATS TAB ═══ */}
      {!loading && tab === 'stats' && (
        <div className="space-y-4">
          {/* Overview cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 text-center">
              <p className="text-2xl font-extrabold text-white">{stats.totalCustomers}</p>
              <p className="text-xs text-zinc-500">{t.ui.crm_totalClients}</p>
            </div>
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center">
              <p className="text-2xl font-extrabold text-amber-400">{stats.totalPointsIssued}</p>
              <p className="text-xs text-zinc-500">Points emis</p>
            </div>
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-center">
              <p className="text-2xl font-extrabold text-red-400">{stats.totalRedeemed}</p>
              <p className="text-xs text-zinc-500">Points utilises</p>
            </div>
            <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 text-center">
              <p className="text-2xl font-extrabold text-purple-400">{stats.avgPointsPerCustomer}</p>
              <p className="text-xs text-zinc-500">Moy. par client</p>
            </div>
          </div>

          {/* Customers by segment */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
            <p className="text-sm font-bold text-white mb-3">Clients par segment</p>
            <div className="space-y-2">
              {[
                { key: 'vip', color: 'bg-purple-500', label: 'VIP', count: segments.vip },
                { key: 'regular', color: 'bg-amber-500', label: t.ui.crm_seg_regular, count: segments.regular },
                { key: 'new', color: 'bg-blue-500', label: t.ui.crm_seg_new, count: segments.new },
                { key: 'inactive', color: 'bg-zinc-600', label: t.ui.crm_seg_inactive, count: segments.inactive },
              ].map((seg) => (
                <div key={seg.key} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 w-16">{seg.label}</span>
                  <div className="flex-1 bg-zinc-800 rounded-full h-4 overflow-hidden">
                    <div
                      className={`${seg.color} h-full rounded-full transition-all`}
                      style={{ width: `${segments.total > 0 ? (seg.count / segments.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400 w-8 text-right">{seg.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue summary */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
            <p className="text-xs text-zinc-400 mb-1">{t.ui.crm_totalRevenue}</p>
            <p className="text-2xl font-extrabold text-amber-400">
              {formatPrice(customers.reduce((sum, c) => sum + c.totalSpent, 0))} EUR
            </p>
          </div>

          {/* Top customers */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
            <p className="text-sm font-bold text-white mb-3">Top clients par depenses</p>
            <div className="space-y-2">
              {topCustomers.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-zinc-800/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-600 w-4">{i + 1}.</span>
                    <span className="text-xs text-white font-medium">{c.name}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${SEG_COLORS[c.segment]}`}>
                      {c.segment}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-amber-400 font-bold">{formatPrice(c.totalSpent)} EUR</span>
                    <span className="text-[10px] text-zinc-500 ml-2">{c.totalOrders} cmd</span>
                  </div>
                </div>
              ))}
              {topCustomers.length === 0 && (
                <p className="text-xs text-zinc-600">Aucun client.</p>
              )}
            </div>
          </div>

          {/* Recent transactions across all customers */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50">
            <p className="text-sm font-bold text-white mb-3">Transactions recentes</p>
            <div className="space-y-1">
              {customers
                .flatMap((c) =>
                  c.loyaltyTransactions.map((tx) => ({ ...tx, customerName: c.name, customerPhone: c.phone }))
                )
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 15)
                .map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-1.5 border-b border-zinc-800/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${tx.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.points > 0 ? '+' : ''}{tx.points}
                      </span>
                      <span className="text-xs text-white">{tx.customerName}</span>
                      <span className="text-[10px] text-zinc-500">{tx.type}</span>
                    </div>
                    <span className="text-[10px] text-zinc-600">
                      {new Date(tx.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                ))}
              {customers.flatMap((c) => c.loyaltyTransactions).length === 0 && (
                <p className="text-xs text-zinc-600">Aucune transaction.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
