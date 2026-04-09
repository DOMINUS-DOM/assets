export interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  loyaltyPoints: number;
  segment: 'new' | 'regular' | 'vip' | 'inactive';
  notes: string;
  createdAt: string;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  pointsCost: number;
  description: string;
  active: boolean;
}
