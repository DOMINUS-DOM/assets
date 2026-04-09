import { User, UserRole, AuthToken } from '@/types/auth';

// Simple hash (demo only — replace with bcrypt on real backend)
function hashPassword(plain: string): string {
  let h = 0;
  for (let i = 0; i < plain.length; i++) {
    h = ((h << 5) - h + plain.charCodeAt(i)) | 0;
  }
  return 'h_' + Math.abs(h).toString(36);
}

let counter = 200;
function genId() { return `usr-${++counter}`; }

// Demo users
const DEMO_USERS: User[] = [
  { id: 'usr-1', email: 'patron@2hfrites.be', passwordHash: hashPassword('patron123'), name: 'Hassan B.', phone: '+32 470 000 001', role: 'patron', active: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'usr-2', email: 'manager@2hfrites.be', passwordHash: hashPassword('manager123'), name: 'Fatima L.', phone: '+32 470 000 002', role: 'manager', active: true, createdAt: '2026-01-15T00:00:00Z' },
  { id: 'usr-3', email: 'employe@2hfrites.be', passwordHash: hashPassword('employe123'), name: 'Youssef K.', phone: '+32 470 000 003', role: 'employe', active: true, createdAt: '2026-02-01T00:00:00Z' },
  { id: 'usr-4', email: 'karim@2hfrites.be', passwordHash: hashPassword('livreur123'), name: 'Karim B.', phone: '+32 470 123 456', role: 'livreur', active: true, driverId: 'drv-1', createdAt: '2026-02-15T00:00:00Z' },
  { id: 'usr-5', email: 'sophie@2hfrites.be', passwordHash: hashPassword('livreur123'), name: 'Sophie M.', phone: '+32 471 234 567', role: 'livreur', active: true, driverId: 'drv-2', createdAt: '2026-03-01T00:00:00Z' },
  { id: 'usr-6', email: 'client@2hfrites.be', passwordHash: hashPassword('client123'), name: 'Martin D.', phone: '+32 475 111 000', role: 'client', active: true, createdAt: '2026-03-15T00:00:00Z' },
];

let users: User[] = [...DEMO_USERS];
let listeners: (() => void)[] = [];
function notify() { listeners.forEach((l) => l()); }

// Token helpers
const TOKEN_DURATION = 24 * 60 * 60 * 1000; // 24h

function generateToken(user: User): string {
  const payload: AuthToken = { userId: user.id, role: user.role, exp: Date.now() + TOKEN_DURATION };
  return btoa(JSON.stringify(payload));
}

export function parseToken(token: string): AuthToken | null {
  try {
    const payload = JSON.parse(atob(token)) as AuthToken;
    if (payload.exp && payload.exp > Date.now()) return payload;
    return null;
  } catch { return null; }
}

export const authStore = {
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => { listeners = listeners.filter((l) => l !== listener); };
  },

  getUsers: () => users,
  getUserById: (id: string) => users.find((u) => u.id === id),
  getUserByEmail: (email: string) => users.find((u) => u.email.toLowerCase() === email.toLowerCase()),

  login(email: string, password: string): { token: string; user: User } | null {
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.active);
    if (!user) return null;
    if (user.passwordHash !== hashPassword(password)) return null;
    return { token: generateToken(user), user };
  },

  register(data: { email: string; password: string; name: string; phone: string; role?: UserRole }): { token: string; user: User } | null {
    if (users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) return null;
    const user: User = {
      id: genId(),
      email: data.email.toLowerCase(),
      passwordHash: hashPassword(data.password),
      name: data.name,
      phone: data.phone,
      role: data.role || 'client',
      active: true,
      createdAt: new Date().toISOString(),
    };
    users = [...users, user];
    notify();
    return { token: generateToken(user), user };
  },

  updateUser(id: string, data: Partial<Pick<User, 'name' | 'phone' | 'email'>>) {
    users = users.map((u) => (u.id === id ? { ...u, ...data } : u));
    notify();
    return users.find((u) => u.id === id);
  },

  changePassword(id: string, oldPassword: string, newPassword: string): boolean {
    const user = users.find((u) => u.id === id);
    if (!user || user.passwordHash !== hashPassword(oldPassword)) return false;
    users = users.map((u) => (u.id === id ? { ...u, passwordHash: hashPassword(newPassword) } : u));
    notify();
    return true;
  },
};
