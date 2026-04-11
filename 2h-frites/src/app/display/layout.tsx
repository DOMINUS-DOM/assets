import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '2H Frites — Affichage',
  description: 'Affichage dynamique 2H Frites Artisanales',
};

export default function DisplayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 overflow-hidden cursor-none select-none">
      {children}
    </div>
  );
}
