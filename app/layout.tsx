import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Review Reply Manager',
  description: 'Multi-tenant SaaS for AI-powered review reply workflows'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
