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
      <svg viewBox="0 0 200 200" aria-label="Casa Nicolae HYAPP logo" className={iconClass}>
        <g fill="#b274ad">
          <ellipse cx="100" cy="48" rx="34" ry="46" />
          <ellipse cx="55" cy="85" rx="34" ry="46" transform="rotate(-40 55 85)" />
          <ellipse cx="145" cy="85" rx="34" ry="46" transform="rotate(40 145 85)" />
          <ellipse cx="70" cy="145" rx="34" ry="46" transform="rotate(28 70 145)" />
          <ellipse cx="130" cy="145" rx="34" ry="46" transform="rotate(-28 130 145)" />
        </g>
        <circle cx="100" cy="104" r="39" fill="#e8e8e8" />
        <ellipse cx="90" cy="94" rx="5.8" ry="8" fill="#ad69a4" />
        <ellipse cx="110" cy="94" rx="5.8" ry="8" fill="#ad69a4" />
        <path d="M82 113c8 19 28 19 36 0" stroke="#ad69a4" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <path d="M76 82c8-11 19-16 31-17" stroke="#ffffff" strokeWidth="3.1" fill="none" strokeLinecap="round" />
        <path d="M125 114c13 0 23-2 33-7" stroke="#ffffff" strokeWidth="3.1" fill="none" strokeLinecap="round" />
        <path d="M88 136c-7 0-14 3-20 10" stroke="#ffffff" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <text x="100" y="34" textAnchor="middle" fill="#ffff3b" fontSize="24" fontWeight="700">
          H
        </text>
        <text x="56" y="92" textAnchor="middle" fill="#ffff3b" fontSize="24" fontWeight="700">
          Y
        </text>
        <text x="145" y="92" textAnchor="middle" fill="#ffff3b" fontSize="24" fontWeight="700">
          A
        </text>
        <text x="69" y="149" textAnchor="middle" fill="#ffff3b" fontSize="24" fontWeight="700">
          P
        </text>
        <text x="130" y="149" textAnchor="middle" fill="#ffff3b" fontSize="24" fontWeight="700">
          P
        </text>
      </svg>
      {withWordmark ? (
        <div className="leading-tight">
          <p className={titleClass}>Casa Nicolae</p>
          <p className={domainClass}>HYAPP AI Hub</p>
        </div>
      ) : null}
    </div>
  );
}
