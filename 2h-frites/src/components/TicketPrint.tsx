'use client';

import { useEffect, useRef } from 'react';
import { useTenant } from '@/contexts/TenantContext';

interface TicketItem {
  name: string;
  quantity: number;
  price: number;
  extras?: string; // JSON string or parsed
}

interface TicketData {
  orderNumber: string;
  type: 'dine_in' | 'pickup' | 'delivery';
  customerName?: string;
  items: TicketItem[];
  total: number;
  paymentMethod?: string;
  createdAt?: string;
}

interface TicketPrintProps {
  order: TicketData;
  mode: 'kitchen' | 'client';
  onPrinted?: () => void;
}

function parseExtras(extras: any): string[] {
  if (!extras) return [];
  try {
    const parsed = typeof extras === 'string' ? JSON.parse(extras) : extras;
    if (Array.isArray(parsed)) return parsed.map((e: any) => e.name || e);
    return [];
  } catch { return []; }
}

function parseExtrasFromName(name: string): { displayName: string; extras: string[] } {
  const match = name.match(/^(.+?)\s*\((.+)\)$/);
  if (match) {
    return { displayName: match[1].trim(), extras: match[2].split(',').map((s) => s.trim()) };
  }
  return { displayName: name, extras: [] };
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return new Date().toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
  return new Date(dateStr).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return new Date().toLocaleDateString('fr-BE');
  return new Date(dateStr).toLocaleDateString('fr-BE');
}

export default function TicketPrint({ order, mode, onPrinted }: TicketPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { tenant } = useTenant();
  const businessName = tenant?.branding?.brandName || tenant?.name || 'Restaurant';
  const businessTagline = tenant?.branding?.tagline || '';

  useEffect(() => {
    // Auto-print after render, then advance to next mode
    const timer = setTimeout(() => {
      window.print();
      if (onPrinted) onPrinted();
    }, 300);
    return () => clearTimeout(timer);
  }, [mode, onPrinted]);

  const typeLabel = order.type === 'dine_in' ? 'SUR PLACE' : order.type === 'pickup' ? 'A EMPORTER' : 'LIVRAISON';
  const isKitchen = mode === 'kitchen';

  return (
    <>
      {/* Print-only styles */}
      <style jsx global>{`
        @media print {
          body > *:not(.ticket-print-container) { display: none !important; }
          .ticket-print-container { display: block !important; }
          @page {
            size: 80mm auto;
            margin: 2mm;
          }
        }
      `}</style>

      <div className="ticket-print-container" style={{ display: 'none' }} ref={printRef}>
        <div style={{
          fontFamily: "'Courier New', monospace",
          fontSize: '12px',
          lineHeight: '1.4',
          width: '72mm',
          padding: '2mm',
          color: '#000',
          backgroundColor: '#fff',
        }}>

          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '4px', marginBottom: '6px' }}>
            {isKitchen ? (
              <>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>🍳 CUISINE</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '4px 0' }}>{order.orderNumber}</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', padding: '4px 8px', border: '2px solid #000', display: 'inline-block' }}>
                  {typeLabel}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{businessName}</div>
                <div style={{ fontSize: '10px' }}>{businessTagline}</div>
                <div style={{ fontSize: '10px', marginTop: '4px' }}>
                  {order.orderNumber} — {formatDate(order.createdAt)} {formatTime(order.createdAt)}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>{typeLabel}</div>
              </>
            )}
            {order.customerName && order.customerName !== 'Client comptoir' && (
              <div style={{ fontSize: '12px', marginTop: '2px' }}>{order.customerName}</div>
            )}
          </div>

          {/* Items */}
          <div style={{ borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '6px' }}>
            {order.items.map((item, i) => {
              let extras = parseExtras(item.extras);
              let displayName = item.name;

              // Fallback: parse extras from name if no extras field
              if (extras.length === 0) {
                const parsed = parseExtrasFromName(item.name);
                if (parsed.extras.length > 0) {
                  displayName = parsed.displayName;
                  extras = parsed.extras;
                }
              }

              return (
                <div key={i} style={{ marginBottom: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>{item.quantity}× {displayName}</span>
                    {!isKitchen && <span>{(item.price * item.quantity).toFixed(2)} €</span>}
                  </div>
                  {extras.map((extra, j) => (
                    <div key={j} style={{ paddingLeft: '16px', fontSize: '11px' }}>
                      → {extra}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {isKitchen ? (
            <div style={{ textAlign: 'center', fontSize: '10px' }}>
              {formatTime(order.createdAt)}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                <span>TOTAL</span>
                <span>{order.total.toFixed(2)} €</span>
              </div>
              {order.paymentMethod && (
                <div style={{ fontSize: '10px', marginBottom: '8px' }}>
                  Paiement : {order.paymentMethod === 'card' ? 'Carte' : order.paymentMethod === 'cash' || order.paymentMethod === 'on_pickup' ? 'Espèces' : order.paymentMethod}
                </div>
              )}
              <div style={{ textAlign: 'center', borderTop: '1px dashed #000', paddingTop: '6px', fontSize: '10px' }}>
                <div>Merci et bon appétit !</div>
                <div>brizoapp.com</div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
