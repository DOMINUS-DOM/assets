import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Caisse POS',
  description: 'Point de vente',
};

export default function POSLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 overflow-hidden select-none">
      {children}
    </div>
  );
}
