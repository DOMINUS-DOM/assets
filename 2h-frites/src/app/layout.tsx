import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import ErrorBoundary from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: '2H Frites Artisanales — Les Deux Haine',
  description: 'Menu interactif — Frites artisanales & snacks belges. Consultez notre carte, prix, allergènes et trouvez votre plat préféré.',
  keywords: ['frites', 'friterie', 'snack', 'menu', 'Les Deux Haine', 'belgique', 'Hainaut'],
  authors: [{ name: 'Les Deux Haine' }],
  openGraph: {
    title: '2H Frites Artisanales — Les Deux Haine',
    description: 'Frites artisanales & snacks belges. Consultez notre menu interactif !',
    type: 'website',
    locale: 'fr_BE',
    siteName: '2H Frites Artisanales',
  },
  twitter: {
    card: 'summary',
    title: '2H Frites Artisanales',
    description: 'Frites artisanales & snacks belges. Consultez notre menu interactif !',
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#09090b',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="font-sans">
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
