import { CustomerProfile, LoyaltyReward } from '@/types/crm';
import { store as orderStore } from './store';

let counter = 900;
function genId(prefix: string) { return `${prefix}-${++counter}`; }

function buildProfiles(): CustomerProfile[] {
  const orders = orderStore.getOrders();
  const map: Record<string, CustomerProfile> = {};

  orders.forEach((o) => {
    const key = o.customer.phone;
    if (!map[key]) {
      map[key] = {
        id: genId('cust'), name: o.customer.name, phone: o.customer.phone,
        email: o.customer.email, address: o.deliveryAddress ? `${o.deliveryAddress.street}, ${o.deliveryAddress.city}` : undefined,
        totalOrders: 0, totalSpent: 0, loyaltyPoints: 0, segment: 'new', notes: '', createdAt: o.createdAt,
      };
    }
    const p = map[key];
    p.totalOrders++;
    p.totalSpent += o.total;
    p.loyaltyPoints += Math.floor(o.total);
    if (!p.lastOrderDate || o.createdAt > p.lastOrderDate) p.lastOrderDate = o.createdAt;
  });

  return Object.values(map).map((p) => ({
    ...p,
    segment: (p.totalOrders >= 5 ? 'vip' : p.totalOrders >= 2 ? 'regular' : 'new') as CustomerProfile['segment'],
    totalSpent: Math.round(p.totalSpent * 100) / 100,
  })).sort((a, b) => b.totalSpent - a.totalSpent);
}

const DEMO_REWARDS: LoyaltyReward[] = [
  { id: 'rw-1', name: 'Frites gratuites', pointsCost: 50, description: 'Un cornet de frites moyen offert', active: true },
  { id: 'rw-2', name: 'Sauce offerte', pointsCost: 20, description: 'Une sauce au choix', active: true },
  { id: 'rw-3', name: '-5€ sur la commande', pointsCost: 100, description: 'Réduction de 5€', active: true },
];

let rewards: LoyaltyReward[] = [...DEMO_REWARDS];
let listeners: (() => void)[] = [];
function notify() { listeners.forEach((l) => l()); }

export const crmStore = {
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => { listeners = listeners.filter((l) => l !== listener); };
  },
  getCustomers: () => buildProfiles(),
  getCustomer: (phone: string) => buildProfiles().find((c) => c.phone === phone),
  getRewards: () => rewards,
  addReward(data: Omit<LoyaltyReward, 'id'>): LoyaltyReward {
    const rw: LoyaltyReward = { ...data, id: genId('rw') };
    rewards = [...rewards, rw];
    notify();
    return rw;
  },
  getSegmentCounts() {
    const profiles = buildProfiles();
    return { total: profiles.length, new: profiles.filter((p) => p.segment === 'new').length, regular: profiles.filter((p) => p.segment === 'regular').length, vip: profiles.filter((p) => p.segment === 'vip').length };
  },
};
