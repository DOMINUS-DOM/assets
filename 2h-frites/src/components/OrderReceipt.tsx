'use client';

import { formatPrice } from '@/utils/format';
import { useTenant } from '@/contexts/TenantContext';

interface ReceiptProps {
  order: any;
  onClose?: () => void;
}

export default function OrderReceipt({ order, onClose }: ReceiptProps) {
  const { tenant } = useTenant();
  const businessName = tenant?.branding?.brandName || tenant?.name || 'Restaurant';
  const businessTagline = tenant?.branding?.tagline || '';
  const handlePrint = () => {
    window.print();
  };

  if (!order) return null;

  const items = order.items || [];
  const total = order.total || 0;
  const date = order.createdAt ? new Date(order.createdAt) : new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 print:bg-white print:static print:inset-auto" onClick={onClose}>
      <div className="bg-white text-black rounded-xl max-w-sm w-full mx-4 p-6 print:shadow-none print:rounded-none print:p-2 print:max-w-none print:mx-0" onClick={(e) => e.stopPropagation()}>

        {/* Receipt content */}
        <div className="text-center mb-4 print:mb-2">
          <h1 className="text-lg font-extrabold">{businessName}</h1>
          {businessTagline && <p className="text-xs text-gray-500">{businessTagline}</p>}
        </div>

        <div className="border-t border-dashed border-gray-300 pt-3 mb-3 print:pt-1 print:mb-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{date.toLocaleDateString('fr-BE')}</span>
            <span>{date.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="font-bold">{order.orderNumber || order.id}</span>
            <span>{order.type === 'delivery' ? 'Livraison' : order.deliveryNotes?.includes('Table') ? 'Sur place' : 'A emporter'}</span>
          </div>
          {order.customerName && order.customerName !== 'Client comptoir' && (
            <p className="text-xs mt-1">Client : {order.customerName}</p>
          )}
          {order.deliveryNotes?.includes('Table') && (
            <p className="text-xs font-bold mt-1">{order.deliveryNotes}</p>
          )}
        </div>

        {/* Items */}
        <div className="border-t border-dashed border-gray-300 pt-2 space-y-1 print:pt-1">
          {items.map((item: any, i: number) => (
            <div key={i} className="flex justify-between text-sm">
              <span>
                {item.quantity}x {item.name}
                {item.sizeKey && <span className="text-gray-500 text-xs ml-1">({item.sizeKey})</span>}
              </span>
              <span className="font-medium">{formatPrice(item.price * item.quantity)} €</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="border-t border-dashed border-gray-300 mt-3 pt-2 print:mt-1 print:pt-1">
          <div className="flex justify-between text-base font-extrabold">
            <span>TOTAL</span>
            <span>{formatPrice(total)} €</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>TVA 6%</span>
            <span>{formatPrice(total * 0.06)} €</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Paiement</span>
            <span>{order.paymentMethod === 'cash' || order.paymentMethod === 'on_pickup' ? 'Espèces' : order.paymentMethod === 'online' ? 'En ligne' : 'Carte'}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 pt-3 border-t border-dashed border-gray-300 print:mt-2 print:pt-1">
          <p className="text-xs text-gray-500">Merci de votre visite !</p>
          <p className="text-xs text-gray-400"></p>
        </div>

        {/* Print button (hidden in print) */}
        <div className="mt-4 flex gap-2 print:hidden">
          <button onClick={handlePrint}
            className="flex-1 py-3 rounded-xl bg-zinc-900 text-white font-bold text-sm active:scale-95">
            🖨️ Imprimer
          </button>
          {onClose && (
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-zinc-200 text-zinc-700 font-bold text-sm active:scale-95">
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
