import type { Metadata } from 'next';
import '@/styles/globals.css';
import { TenantProvider } from '@/context/tenant-context';
import { AuthProvider } from '@/context/auth-context';
import { DynamicTitle } from '@/components/layout/dynamic-title';

export const metadata: Metadata = {
  metadataBase: new URL('https://belttrack.app'),
  title: 'Dashboard',
  description: 'Private martial arts dojo management and belt progression platform.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
  openGraph: {
    title: 'Dashboard',
    description: 'Private martial arts dojo management and belt progression platform.',
    url: 'https://belttrack.app',
    siteName: 'BeltTrack',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'BeltTrack - Martial Arts Dojo Management OS',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dashboard',
    description: 'Private martial arts dojo management and belt progression platform.',
    images: ['/og-image.svg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-surface text-surface-foreground font-body antialiased">
        <TenantProvider>
          <AuthProvider>
            <DynamicTitle />
            {children}
          </AuthProvider>
        </TenantProvider>
      </body>
    </html>
  );
}
