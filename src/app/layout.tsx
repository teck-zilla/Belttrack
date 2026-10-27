import type { Metadata } from 'next';
import '@/styles/globals.css';
import { TenantProvider } from '@/context/tenant-context';
import { AuthProvider } from '@/context/auth-context';

export const metadata: Metadata = {
  title: 'BeltTrack - Martial Arts School Management & Rank Progression',
  description: 'Private, multi-tenant martial arts school management platform. Strictly isolated dojo tenants, curriculum rank tracking, roll-call attendance, and zero-monetization internal ledgers.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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
            {children}
          </AuthProvider>
        </TenantProvider>
      </body>
    </html>
  );
}
