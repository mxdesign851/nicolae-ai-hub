import { cn } from '@/lib/utils';

type LogoProps = {
  className?: string;
  withWordmark?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

export function Logo({ className, withWordmark = true, size = 'md' }: LogoProps) {
  const iconClass = size === 'lg' ? 'h-14 w-14' : size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  const titleClass = size === 'lg' ? 'text-xl font-semibold' : 'text-sm font-semibold';
  const domainClass =
    size === 'lg'
      ? 'text-xs uppercase tracking-[0.22em] opacity-70'
      : 'text-[11px] uppercase tracking-[0.18em] opacity-70';

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 64 64" aria-label="ReplyZen logo" className={iconClass}>
        <rect x="4" y="4" width="56" height="56" rx="14" fill="#111826" />
        <path d="M16 21h19c7 0 12 5 12 12s-5 12-12 12H16V21Z" fill="#4F7CFF" />
        <path d="M23 28h12a5 5 0 0 1 0 10H23V28Z" fill="#0D1527" />
        <circle cx="46" cy="46" r="6" fill="#68E1FD" />
      </svg>
      {withWordmark ? (
        <div className="leading-tight">
          <p className={titleClass}>ReplyZen</p>
          <p className={domainClass}>reply-zen.com</p>
        </div>
      ) : null}
    </div>
  );
}
