import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Affichage',
  description: 'Affichage dynamique',
};

export default function DisplayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-screen bg-zinc-950 text-white overflow-hidden cursor-none select-none">
      {children}
    </div>
  );
}
