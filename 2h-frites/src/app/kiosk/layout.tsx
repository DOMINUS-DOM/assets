import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '2H Frites — Commander',
  description: 'Borne de commande 2H Frites Artisanales',
};

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 overflow-hidden select-none cursor-default">
      {children}
    </div>
  );
}
