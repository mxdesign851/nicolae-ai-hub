import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Casa Nicolae | HYAPP AI Hub',
  description: 'Aplicatie interna cu AI pentru medicamente, monitorizare si profil psihosocial orientativ.',
  metadataBase: new URL('https://casa-nicolae.local')
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
