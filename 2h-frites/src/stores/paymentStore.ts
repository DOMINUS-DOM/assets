import { Transaction, TransactionStatus, TransactionMethod, Invoice, InvoiceLine, DailyReport } from '@/types/payment';
import { store as orderStore } from './store';
import { settingsStore } from './settingsStore';

let counter = 700;
function genId(prefix: string) { return `${prefix}-${++counter}`; }
function now() { return new Date().toISOString(); }

// ─── Demo transactions from demo orders ───
function createDemoTransactions(): Transaction[] {
  const orders = orderStore.getOrders();
  return orders.filter((o) => o.payment.status === 'paid').map((o) => ({
    id: genId('txn'),
    orderId: o.id,
    amount: o.total,
    method: o.payment.method === 'online' ? 'online' as const : 'cash' as const,
    status: 'completed' as const,
    createdAt: o.createdAt,
  }));
}

let transactions: Transaction[] = createDemoTransactions();
let invoices: Invoice[] = [];
let listeners: (() => void)[] = [];
function notify() { listeners.forEach((l) => l()); }

export const paymentStore = {
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => { listeners = listeners.filter((l) => l !== listener); };
  },

  // ─── Transactions ───
  getTransactions: () => transactions,
  getTransaction: (id: string) => transactions.find((t) => t.id === id),
  getTransactionByOrder: (orderId: string) => transactions.find((t) => t.orderId === orderId),

  createTransaction(data: { orderId: string; amount: number; method: TransactionMethod }): Transaction {
    const txn: Transaction = {
      id: genId('txn'),
      ...data,
      status: data.method === 'online' || data.method === 'bancontact' ? 'pending' : 'completed',
      createdAt: now(),
    };
    transactions = [txn, ...transactions];
    notify();
    return txn;
  },

  completeTransaction(id: string, reference?: string) {
    transactions = transactions.map((t) =>
      t.id === id ? { ...t, status: 'completed' as const, reference } : t
    );
    // Also mark order as paid
    const txn = transactions.find((t) => t.id === id);
    if (txn) orderStore.updatePaymentStatus(txn.orderId, 'paid');
    notify();
  },

  refundTransaction(id: string) {
    transactions = transactions.map((t) =>
      t.id === id ? { ...t, status: 'refunded' as const } : t
    );
    notify();
  },

  // ─── Simulate online payment (Stripe/Mollie mock) ───
  simulateOnlinePayment(orderId: string, amount: number): { success: boolean; transactionId: string } {
    const txn = paymentStore.createTransaction({ orderId, amount, method: 'online' });
    // Simulate 95% success rate
    const success = Math.random() > 0.05;
    if (success) {
      paymentStore.completeTransaction(txn.id, `stripe_${Date.now()}`);
    } else {
      transactions = transactions.map((t) =>
        t.id === txn.id ? { ...t, status: 'failed' as const } : t
      );
      notify();
    }
    return { success, transactionId: txn.id };
  },

  // ─── Invoices ───
  getInvoices: () => invoices,
  getInvoice: (id: string) => invoices.find((i) => i.id === id),
  getInvoiceByOrder: (orderId: string) => invoices.find((i) => i.orderId === orderId),

  generateInvoice(orderId: string): Invoice | null {
    const order = orderStore.getOrder(orderId);
    if (!order) return null;
    const biz = settingsStore.get();

    const existing = invoices.find((i) => i.orderId === orderId);
    if (existing) return existing;

    const lines: InvoiceLine[] = order.items.map((item) => {
      const isAlcohol = item.categoryId === 'boissons' && ['jupiler', 'desperados', 'carlsberg', 'blanche_rosee', 'grimbergen', 'chimay', 'leffe', 'vin'].includes(item.menuItemId);
      const vatRate = isAlcohol ? biz.vatRateDrinks : biz.vatRate;
      const total = item.price * item.quantity;
      const vatAmount = Math.round(total * vatRate * 100) / 100;
      return { description: item.name, quantity: item.quantity, unitPrice: item.price, vatRate, total, vatAmount };
    });

    const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
    const totalVat = lines.reduce((sum, l) => sum + l.vatAmount, 0);
    const deliveryFee = order.type === 'delivery' ? (order.total - subtotal > 0 ? order.total - subtotal : 0) : 0;

    const invoice: Invoice = {
      id: genId('inv'),
      orderId,
      customerName: order.customer.name,
      customerPhone: order.customer.phone,
      customerAddress: order.deliveryAddress ? `${order.deliveryAddress.street}, ${order.deliveryAddress.city} ${order.deliveryAddress.postalCode}` : undefined,
      lines,
      subtotal: Math.round(subtotal * 100) / 100,
      totalVat: Math.round(totalVat * 100) / 100,
      deliveryFee,
      grandTotal: order.total,
      vatNumber: biz.vatNumber,
      businessName: biz.name,
      businessAddress: biz.address,
      createdAt: now(),
    };

    invoices = [invoice, ...invoices];
    notify();
    return invoice;
  },

  // ─── Reports ───
  getDailyReport(date: string): DailyReport {
    const dayTxns = transactions.filter((t) => t.createdAt.startsWith(date));
    const completed = dayTxns.filter((t) => t.status === 'completed');
    const refunded = dayTxns.filter((t) => t.status === 'refunded');

    const totalRevenue = completed.reduce((sum, t) => sum + t.amount, 0);
    const cashTotal = completed.filter((t) => t.method === 'cash').reduce((sum, t) => sum + t.amount, 0);
    const onlineTotal = completed.filter((t) => ['online', 'bancontact', 'card'].includes(t.method)).reduce((sum, t) => sum + t.amount, 0);
    const refundTotal = refunded.reduce((sum, t) => sum + t.amount, 0);
    const biz = settingsStore.get();
    const totalVat = Math.round(totalRevenue * biz.vatRate * 100) / 100;

    return {
      date,
      orderCount: completed.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalVat,
      cashTotal: Math.round(cashTotal * 100) / 100,
      onlineTotal: Math.round(onlineTotal * 100) / 100,
      refundTotal: Math.round(refundTotal * 100) / 100,
      deliveryFeeTotal: 0,
      avgOrderValue: completed.length > 0 ? Math.round((totalRevenue / completed.length) * 100) / 100 : 0,
    };
  },
};
