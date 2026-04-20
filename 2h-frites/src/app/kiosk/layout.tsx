import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kiosk',
  description: 'Borne de commande',
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
