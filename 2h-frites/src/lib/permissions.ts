// ─── Permission System ───
// Each permission maps to a module/feature in the admin panel.
// Role defaults define what each role can access out of the box.
// Per-user overrides in permissionsJson can grant or revoke access.

export const ALL_PERMISSIONS = [
  'dashboard', 'locations', 'orders', 'kitchen', 'menu', 'zones', 'tables',
  'inventory', 'staff', 'drivers', 'recruitment', 'payroll', 'payments',
  'crm', 'analytics', 'forecast', 'channels', 'reviews', 'signage',
  'qrcode', 'settings', 'users',
] as const;

export type PermissionKey = (typeof ALL_PERMISSIONS)[number];

// Human-readable labels for the admin UI
export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  dashboard: 'Dashboard',
  locations: 'Sites / Locations',
  orders: 'Commandes',
  kitchen: 'Cuisine (KDS)',
  menu: 'Menu / Carte',
  zones: 'Zones de livraison',
  tables: 'Plan de salle',
  inventory: 'Stock / Inventaire',
  staff: 'Personnel / RH',
  drivers: 'Livreurs',
  recruitment: 'Recrutement',
  payroll: 'Paie',
  payments: 'Paiements',
  crm: 'Clients / CRM',
  analytics: 'Analytics',
  forecast: 'Prévisions',
  channels: 'Canaux de vente',
  reviews: 'Avis clients',
  signage: 'Affichage dynamique',
  qrcode: 'QR Codes',
  settings: 'Paramètres',
  users: 'Gestion utilisateurs',
};

// Permission groups for the UI
export const PERMISSION_GROUPS: { title: string; keys: PermissionKey[] }[] = [
  { title: 'Principal', keys: ['dashboard', 'locations'] },
  { title: 'Commandes', keys: ['orders', 'kitchen'] },
  { title: 'Catalogue', keys: ['menu', 'zones', 'tables', 'inventory'] },
  { title: 'Équipe', keys: ['staff', 'drivers', 'recruitment', 'payroll', 'users'] },
  { title: 'Business', keys: ['payments', 'crm', 'analytics', 'forecast', 'channels', 'reviews'] },
  { title: 'Outils', keys: ['signage', 'qrcode', 'settings'] },
];

// Default permissions per role (derived from current admin nav roles arrays)
const t = true;
export const ROLE_DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  franchisor_admin: {
    dashboard: t, locations: t, orders: t, kitchen: t, menu: t, zones: t, tables: t,
    inventory: t, staff: t, drivers: t, recruitment: t, payroll: t, payments: t,
    crm: t, analytics: t, forecast: t, channels: t, reviews: t, signage: t,
    qrcode: t, settings: t, users: t,
  },
  patron: {
    dashboard: t, orders: t, kitchen: t, menu: t, zones: t, tables: t,
    inventory: t, staff: t, drivers: t, recruitment: t, payroll: t, payments: t,
    crm: t, analytics: t, forecast: t, channels: t, reviews: t, signage: t,
    qrcode: t, settings: t, users: t,
  },
  franchisee_owner: {
    dashboard: t, orders: t, kitchen: t, menu: t, zones: t, tables: t,
    inventory: t, staff: t, drivers: t, recruitment: t, payments: t,
    crm: t, analytics: t, reviews: t, signage: t, settings: t, users: t,
  },
  location_manager: {
    dashboard: t, zones: t, tables: t, signage: t,
  },
  manager: {
    dashboard: t, orders: t, kitchen: t, menu: t, zones: t, tables: t,
    inventory: t, staff: t, drivers: t, recruitment: t, payments: t,
    crm: t, analytics: t, forecast: t, reviews: t, signage: t, qrcode: t,
  },
  employe: {
    dashboard: t, orders: t, kitchen: t, tables: t,
  },
  livreur: {},
  client: {},
};

// Role hierarchy for privilege escalation prevention
export const ROLE_HIERARCHY: Record<string, number> = {
  franchisor_admin: 100,
  patron: 90,
  franchisee_owner: 80,
  location_manager: 70,
  manager: 60,
  employe: 50,
  livreur: 40,
  client: 10,
};

// ─── Resolution Logic ───

export function getUserPermissions(user: { role: string; permissionsJson?: string | null }): Record<string, boolean> {
  const defaults = ROLE_DEFAULT_PERMISSIONS[user.role] || {};
  let overrides: Record<string, boolean> = {};
  try {
    overrides = JSON.parse(user.permissionsJson || '{}');
  } catch {}
  return { ...defaults, ...overrides };
}

export function hasPermission(user: { role: string; permissionsJson?: string | null } | null, permission: string): boolean {
  if (!user) return false;
  const perms = getUserPermissions(user);
  return perms[permission] === true;
}

export function canManageRole(callerRole: string, targetRole: string): boolean {
  return (ROLE_HIERARCHY[callerRole] || 0) > (ROLE_HIERARCHY[targetRole] || 0);
}
