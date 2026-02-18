'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
};

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="grid gap-1">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-slate-100',
              isActive ? 'bg-slate-800 text-slate-100' : ''
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
