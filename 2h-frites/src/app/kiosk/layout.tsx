import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '2H Frites — Commander',
  description: 'Borne de commande 2H Frites Artisanales',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 overflow-hidden select-none touch-manipulation"
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}>
      {children}
    </div>
  );
}
