'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  ALL_PERMISSIONS, PERMISSION_LABELS, PERMISSION_GROUPS,
  ROLE_DEFAULT_PERMISSIONS, ROLE_HIERARCHY, getUserPermissions,
  type PermissionKey,
} from '@/lib/permissions';

// ─── Types ───
interface UserRow {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  active: boolean;
  avatarUrl?: string | null;
  permissionsJson?: string | null;
  driverId?: string | null;
  locationId?: string | null;
  createdAt: string;
  location?: { id: string; name: string } | null;
}

interface LocationOption {
  id: string;
  name: string;
}

// ─── Role labels & colors ───
const ROLE_LABELS: Record<string, string> = {
  franchisor_admin: 'Admin Franchise',
  patron: 'Patron',
  franchisee_owner: 'Franchis\u00e9',
  location_manager: 'Responsable site',
  manager: 'Manager',
  employe: 'Employ\u00e9',
  livreur: 'Livreur',
  client: 'Client',
};

const ROLE_COLORS: Record<string, string> = {
  franchisor_admin: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  patron: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  franchisee_owner: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  location_manager: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  manager: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  employe: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  livreur: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  client: 'bg-zinc-800 text-zinc-500 border-zinc-700',
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [showPerms, setShowPerms] = useState<UserRow | null>(null);
  const [showResetPw, setShowResetPw] = useState<UserRow | null>(null);

  // Create form — password is generated server-side and emailed to the invitee.
  const [createForm, setCreateForm] = useState({
    name: '', email: '', phone: '', role: 'employe', locationId: '',
  });
  const [createError, setCreateError] = useState('');

  // Edit form
  const [editForm, setEditForm] = useState({
    name: '', phone: '', role: '', locationId: '', active: true,
  });

  // Reset password
  const [newPassword, setNewPassword] = useState('');

  // Permissions override
  const [permOverrides, setPermOverrides] = useState<Record<string, boolean>>({});

  const refresh = async () => {
    try {
      const data = await api.get<{ users: UserRow[]; locations: LocationOption[] }>('/users');
      setUsers(data.users);
      setLocations(data.locations);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  // Filtered users
  const filtered = useMemo(() => {
    let list = users;
    if (roleFilter !== 'all') list = list.filter((u) => u.role === roleFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(q)
      );
    }
    return list;
  }, [users, roleFilter, search]);

  // Roles the current user can assign (lower in hierarchy)
  const assignableRoles = useMemo(() => {
    if (!currentUser) return [];
    const callerLevel = ROLE_HIERARCHY[currentUser.role] || 0;
    return Object.entries(ROLE_HIERARCHY)
      .filter(([_, level]) => level < callerLevel)
      .sort((a, b) => b[1] - a[1])
      .map(([role]) => role);
  }, [currentUser]);

  // ─── Handlers ───
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    try {
      await api.post('/users', { action: 'create', ...createForm, locationId: createForm.locationId || null });
      setShowCreate(false);
      setCreateForm({ name: '', email: '', phone: '', role: 'employe', locationId: '' });
      refresh();
    } catch (err: any) {
      const code = err?.error || 'error';
      const messages: Record<string, string> = {
        email_taken: 'Cet email est d\u00e9j\u00e0 utilis\u00e9',
        role_escalation: 'Vous ne pouvez pas cr\u00e9er un utilisateur avec ce r\u00f4le',
        missing_fields: 'Champs obligatoires manquants',
      };
      setCreateError(messages[code] || 'Erreur lors de la cr\u00e9ation');
    }
  };

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setEditForm({ name: u.name, phone: u.phone, role: u.role, locationId: u.locationId || '', active: u.active });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    try {
      await api.post('/users', {
        action: 'update',
        userId: editUser.id,
        ...editForm,
        locationId: editForm.locationId || null,
      });
      setEditUser(null);
      refresh();
    } catch {}
  };

  const handleToggleActive = async (u: UserRow) => {
    try {
      await api.post('/users', { action: 'update', userId: u.id, active: !u.active });
      refresh();
    } catch {}
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResetPw || !newPassword) return;
    try {
      await api.post('/users', { action: 'resetPassword', userId: showResetPw.id, newPassword });
      setShowResetPw(null);
      setNewPassword('');
    } catch {}
  };

  const openPerms = (u: UserRow) => {
    setShowPerms(u);
    try {
      setPermOverrides(JSON.parse(u.permissionsJson || '{}'));
    } catch {
      setPermOverrides({});
    }
  };

  const handleSavePerms = async () => {
    if (!showPerms) return;
    // Clean: remove keys that match role default
    const defaults = ROLE_DEFAULT_PERMISSIONS[showPerms.role] || {};
    const cleaned: Record<string, boolean> = {};
    for (const key of ALL_PERMISSIONS) {
      const overrideVal = permOverrides[key];
      const defaultVal = defaults[key] === true;
      if (overrideVal !== undefined && overrideVal !== defaultVal) {
        cleaned[key] = overrideVal;
      }
    }
    try {
      await api.post('/users', {
        action: 'update',
        userId: showPerms.id,
        permissionsJson: JSON.stringify(cleaned),
      });
      setShowPerms(null);
      refresh();
    } catch {}
  };

  // ─── Styles ───
  const ic = 'w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-amber-500/50';
  const btn = 'px-4 py-2.5 rounded-xl font-bold text-sm transition-colors';

  if (loading) {
    return <div className="text-center py-20 text-zinc-500">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Gestion des utilisateurs</h1>
          <p className="text-sm text-zinc-500">{users.length} utilisateur{users.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className={`${btn} bg-amber-500 text-zinc-950 hover:bg-amber-400`}>
          + Nouvel utilisateur
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className={`${ic} sm:max-w-xs`}
          placeholder="Rechercher (nom, email, t\u00e9l)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={`${ic} sm:w-44`} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">Tous les r\u00f4les</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Users table */}
      <div className="rounded-xl border border-zinc-800/50 overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900/50 text-zinc-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Utilisateur</th>
                <th className="text-left px-4 py-3">R\u00f4le</th>
                <th className="text-left px-4 py-3">Site</th>
                <th className="text-left px-4 py-3">Statut</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filtered.map((u) => (
                <tr key={u.id} className={`hover:bg-zinc-900/30 transition-colors ${!u.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 uppercase shrink-0">
                        {u.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          u.name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">{u.name}</p>
                        <p className="text-zinc-500 text-xs truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-bold px-2 py-1 rounded-full border ${ROLE_COLORS[u.role] || ROLE_COLORS.client}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {u.location?.name || <span className="text-zinc-600">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${u.active ? 'text-emerald-400' : 'text-red-400'}`}>
                      {u.active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {u.id !== currentUser?.id && (
                        <>
                          <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors" title="Modifier">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                            </svg>
                          </button>
                          <button onClick={() => openPerms(u)} className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors" title="Permissions">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                            </svg>
                          </button>
                          <button onClick={() => setShowResetPw(u)} className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors" title="R\u00e9init. mot de passe">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                            </svg>
                          </button>
                          <button onClick={() => handleToggleActive(u)}
                            className={`p-1.5 rounded-lg transition-colors ${u.active ? 'text-zinc-400 hover:text-red-400 hover:bg-red-500/10' : 'text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                            title={u.active ? 'D\u00e9sactiver' : 'R\u00e9activer'}>
                            {u.active ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                        </>
                      )}
                      {u.id === currentUser?.id && (
                        <span className="text-[10px] text-zinc-600 italic px-2">vous</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-zinc-800/50">
          {filtered.map((u) => (
            <div key={u.id} className={`p-4 ${!u.active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400 uppercase shrink-0">
                    {u.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      u.name.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{u.name}</p>
                    <p className="text-zinc-500 text-xs truncate">{u.email}</p>
                    {u.location && <p className="text-zinc-600 text-[10px] mt-0.5">{u.location.name}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ROLE_COLORS[u.role] || ROLE_COLORS.client}`}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                  <span className={`text-[10px] ${u.active ? 'text-emerald-400' : 'text-red-400'}`}>
                    {u.active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
              {u.id !== currentUser?.id && (
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-zinc-800/30">
                  <button onClick={() => openEdit(u)} className="text-xs text-zinc-400 hover:text-white">Modifier</button>
                  <span className="text-zinc-700">|</span>
                  <button onClick={() => openPerms(u)} className="text-xs text-amber-400 hover:text-amber-300">Permissions</button>
                  <span className="text-zinc-700">|</span>
                  <button onClick={() => setShowResetPw(u)} className="text-xs text-cyan-400">Mot de passe</button>
                  <span className="text-zinc-700">|</span>
                  <button onClick={() => handleToggleActive(u)} className={`text-xs ${u.active ? 'text-red-400' : 'text-emerald-400'}`}>
                    {u.active ? 'D\u00e9sactiver' : 'R\u00e9activer'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-zinc-500 text-sm">Aucun utilisateur trouv\u00e9</div>
        )}
      </div>

      {/* ═══ CREATE MODAL ═══ */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)} />
          <div className="relative bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-md p-6 space-y-4 animate-slide-up max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white">Nouvel utilisateur</h2>
            <p className="text-xs text-zinc-400 -mt-2">
              Un email d&apos;invitation avec un mot de passe temporaire sera envoy\u00e9. L&apos;utilisateur devra le changer \u00e0 sa premi\u00e8re connexion.
            </p>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Nom complet *</label>
                <input className={ic} required value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Email *</label>
                <input className={ic} type="email" required value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">T\u00e9l\u00e9phone</label>
                <input className={ic} value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">R\u00f4le *</label>
                <select className={ic} value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}>
                  {assignableRoles.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Site</label>
                <select className={ic} value={createForm.locationId}
                  onChange={(e) => setCreateForm({ ...createForm, locationId: e.target.value })}>
                  <option value="">Aucun (tous les sites)</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              {createError && (
                <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{createError}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className={`${btn} flex-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-700`}>Annuler</button>
                <button type="submit"
                  className={`${btn} flex-1 bg-amber-500 text-zinc-950 hover:bg-amber-400`}>Cr\u00e9er</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ EDIT MODAL ═══ */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditUser(null)} />
          <div className="relative bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-md p-6 space-y-4 animate-slide-up max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white">Modifier : {editUser.name}</h2>

            <form onSubmit={handleEdit} className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Nom</label>
                <input className={ic} value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">T\u00e9l\u00e9phone</label>
                <input className={ic} value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">R\u00f4le</label>
                <select className={ic} value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                  {assignableRoles.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                  ))}
                  {/* Keep current role if it's above caller's level */}
                  {!assignableRoles.includes(editUser.role) && (
                    <option value={editUser.role}>{ROLE_LABELS[editUser.role] || editUser.role}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Site</label>
                <select className={ic} value={editForm.locationId}
                  onChange={(e) => setEditForm({ ...editForm, locationId: e.target.value })}>
                  <option value="">Aucun (tous les sites)</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="editActive" checked={editForm.active}
                  onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                  className="rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500" />
                <label htmlFor="editActive" className="text-sm text-zinc-300">Compte actif</label>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditUser(null)}
                  className={`${btn} flex-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-700`}>Annuler</button>
                <button type="submit"
                  className={`${btn} flex-1 bg-amber-500 text-zinc-950 hover:bg-amber-400`}>Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ PERMISSIONS MODAL ═══ */}
      {showPerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowPerms(null)} />
          <div className="relative bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-lg p-6 space-y-4 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div>
              <h2 className="text-lg font-bold text-white">Permissions : {showPerms.name}</h2>
              <p className="text-xs text-zinc-500 mt-1">
                R\u00f4le : <span className={`font-bold ${ROLE_COLORS[showPerms.role]?.split(' ')[1] || 'text-zinc-400'}`}>
                  {ROLE_LABELS[showPerms.role]}
                </span>
                {' '}&mdash; Les cases gris\u00e9es sont les permissions par d\u00e9faut du r\u00f4le. Cochez/d\u00e9cochez pour surcharger.
              </p>
            </div>

            <div className="space-y-4">
              {PERMISSION_GROUPS.map((group) => {
                const defaults = ROLE_DEFAULT_PERMISSIONS[showPerms.role] || {};
                return (
                  <div key={group.title}>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">{group.title}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {group.keys.map((key) => {
                        const defaultVal = defaults[key] === true;
                        const overrideVal = permOverrides[key];
                        const effectiveVal = overrideVal !== undefined ? overrideVal : defaultVal;
                        const isOverridden = overrideVal !== undefined && overrideVal !== defaultVal;

                        return (
                          <label key={key}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                              isOverridden
                                ? 'bg-amber-500/10 border border-amber-500/30'
                                : 'bg-zinc-800/50 border border-transparent'
                            }`}>
                            <input
                              type="checkbox"
                              checked={effectiveVal}
                              onChange={(e) => {
                                const newOverrides = { ...permOverrides };
                                const checked = e.target.checked;
                                if (checked === defaultVal) {
                                  delete newOverrides[key];
                                } else {
                                  newOverrides[key] = checked;
                                }
                                setPermOverrides(newOverrides);
                              }}
                              className="rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500"
                            />
                            <span className={`text-xs ${effectiveVal ? 'text-white' : 'text-zinc-500'}`}>
                              {PERMISSION_LABELS[key]}
                            </span>
                            {isOverridden && (
                              <span className="text-[9px] text-amber-400 font-bold ml-auto">CUSTOM</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowPerms(null)}
                className={`${btn} flex-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-700`}>Annuler</button>
              <button onClick={() => { setPermOverrides({}); }}
                className={`${btn} bg-zinc-700 text-zinc-300 hover:bg-zinc-600`}>R\u00e9init.</button>
              <button onClick={handleSavePerms}
                className={`${btn} flex-1 bg-amber-500 text-zinc-950 hover:bg-amber-400`}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ RESET PASSWORD MODAL ═══ */}
      {showResetPw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowResetPw(null)} />
          <div className="relative bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-sm p-6 space-y-4 animate-slide-up">
            <h2 className="text-lg font-bold text-white">R\u00e9initialiser le mot de passe</h2>
            <p className="text-sm text-zinc-400">Pour : <span className="text-white font-medium">{showResetPw.name}</span></p>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Nouveau mot de passe</label>
                <input className={ic} type="password" required minLength={6} value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)} />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowResetPw(null); setNewPassword(''); }}
                  className={`${btn} flex-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-700`}>Annuler</button>
                <button type="submit"
                  className={`${btn} flex-1 bg-cyan-500 text-zinc-950 hover:bg-cyan-400`}>R\u00e9initialiser</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
