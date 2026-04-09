import { MenuItem } from './index';

// ─── Cart ───
export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  sizeKey?: string;
  categoryId: string;
}

// ─── Customer ───
export interface Customer {
  name: string;
  phone: string;
  email?: string;
}

// ─── Delivery Address ───
export interface DeliveryAddress {
  street: string;
  city: string;
  postalCode: string;
  instructions?: string;
}

// ─── Order Status ───
export type OrderStatus = 'received' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'picked_up' | 'cancelled';

export type OrderType = 'pickup' | 'delivery';

export type PaymentMethod = 'online' | 'on_delivery' | 'on_pickup';
export type PaymentStatus = 'pending' | 'paid';

export interface Payment {
  method: PaymentMethod;
  status: PaymentStatus;
}

export interface StatusEntry {
  status: OrderStatus;
  at: string;
}

// ─── Order ───
export interface Order {
  id: string;
  items: CartItem[];
  type: OrderType;
  status: OrderStatus;
  customer: Customer;
  deliveryAddress?: DeliveryAddress;
  pickupTime?: string;
  payment: Payment;
  total: number;
  driverId?: string;
  createdAt: string;
  statusHistory: StatusEntry[];
}

// ─── Driver ───
export interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string;
  active: boolean;
  contractType: string;
  zone: string;
  notes: string;
  ratePerDelivery: number;
  bonusRate: number;
}

// ─── Driver Application ───
export type ApplicationStatus = 'new' | 'contacted' | 'accepted' | 'rejected';

export interface DriverApplication {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  transport: string;
  availability: string;
  status: ApplicationStatus;
  createdAt: string;
}
