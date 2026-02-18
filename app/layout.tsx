import './globals.css';
import type { Metadata } from 'next';
import { AppProviders } from '@/components/providers';

export const metadata: Metadata = {
  title: 'ReviewPilot | AI Review Reply Manager',
  description: 'Multi-tenant SaaS for AI-generated customer review replies with approvals, analytics, and billing.',
  metadataBase: new URL('https://reply-zen.com')
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
