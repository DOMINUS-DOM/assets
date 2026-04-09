// ─── Transaction ───
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type TransactionMethod = 'cash' | 'card' | 'online' | 'bancontact';

export interface Transaction {
  id: string;
  orderId: string;
  amount: number;
  method: TransactionMethod;
  status: TransactionStatus;
  reference?: string; // Stripe/Mollie payment ID
  createdAt: string;
}

// ─── Invoice ───
export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  total: number;
  vatAmount: number;
}

export interface Invoice {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  lines: InvoiceLine[];
  subtotal: number;
  totalVat: number;
  deliveryFee: number;
  grandTotal: number;
  vatNumber: string;
  businessName: string;
  businessAddress: string;
  createdAt: string;
}

// ─── Daily Report ───
export interface DailyReport {
  date: string;
  orderCount: number;
  totalRevenue: number;
  totalVat: number;
  cashTotal: number;
  onlineTotal: number;
  refundTotal: number;
  deliveryFeeTotal: number;
  avgOrderValue: number;
}
