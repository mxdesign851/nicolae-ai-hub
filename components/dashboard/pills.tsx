import { cn } from '@/lib/utils';

export function StatusPill({ value }: { value: string }) {
  const cls =
    value === 'APPROVED'
      ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30'
      : value === 'DRAFTED'
        ? 'bg-blue-500/15 text-blue-200 border-blue-500/30'
        : value === 'SENT'
          ? 'bg-purple-500/15 text-purple-200 border-purple-500/30'
          : value === 'ARCHIVED'
            ? 'bg-slate-500/20 text-slate-200 border-slate-500/30'
            : 'bg-amber-500/15 text-amber-200 border-amber-500/30';

  return <span className={cn('badge border', cls)}>{value}</span>;
}

export function SentimentPill({ value }: { value: string }) {
  const cls =
    value === 'POS'
      ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30'
      : value === 'NEG'
        ? 'bg-rose-500/15 text-rose-200 border-rose-500/30'
        : 'bg-slate-500/15 text-slate-200 border-slate-500/30';

  return <span className={cn('badge border', cls)}>{value}</span>;
}
