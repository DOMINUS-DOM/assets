import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '2H Frites — Caisse',
  description: 'Point de vente 2H Frites Artisanales',
};

export default function POSLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 overflow-hidden select-none">
      {children}
    </div>
  );
}
