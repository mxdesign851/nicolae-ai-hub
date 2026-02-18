import Link from 'next/link';
import { Role, ReviewSource, ReviewStatus, Sentiment } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { assertWorkspaceAccess } from '@/lib/tenant';
import { StatusPill, SentimentPill } from '@/components/dashboard/pills';

type InboxPageProps = {
  params: { workspaceId: string };
  searchParams: {
    status?: ReviewStatus;
    source?: ReviewSource;
    sentiment?: Sentiment;
    rating?: string;
    tag?: string;
    dateFrom?: string;
    dateTo?: string;
  };
};

export default async function InboxPage({ params, searchParams }: InboxPageProps) {
  const { user } = await requireUser();
  await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

  const rating = searchParams.rating ? Number(searchParams.rating) : undefined;
  const where = {
    workspaceId: params.workspaceId,
    ...(searchParams.status ? { status: searchParams.status } : {}),
    ...(searchParams.source ? { source: searchParams.source } : {}),
    ...(searchParams.sentiment ? { sentiment: searchParams.sentiment } : {}),
    ...(searchParams.tag ? { tags: { has: searchParams.tag } } : {}),
    ...(Number.isFinite(rating) ? { rating } : {}),
    ...((searchParams.dateFrom || searchParams.dateTo)
      ? {
          reviewDate: {
            ...(searchParams.dateFrom ? { gte: new Date(searchParams.dateFrom) } : {}),
            ...(searchParams.dateTo ? { lte: new Date(searchParams.dateTo) } : {})
          }
        }
      : {})
  };

  const [reviews, workspace, allTags] = await Promise.all([
    prisma.review.findMany({
      where,
      include: { location: true },
      orderBy: { reviewDate: 'desc' },
      take: 200
    }),
    prisma.workspace.findUniqueOrThrow({
      where: { id: params.workspaceId },
      select: { name: true, plan: true, aiGenerationsUsed: true }
    }),
    prisma.review.findMany({ where: { workspaceId: params.workspaceId }, select: { tags: true }, take: 500 })
  ]);

  const tags = Array.from(new Set(allTags.flatMap((item) => item.tags))).slice(0, 40);

  return (
    <main className="space-y-5">
      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Inbox</h1>
            <p className="text-sm text-slate-400">
              {workspace.name} - {reviews.length} filtered reviews
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/w/${params.workspaceId}/sources`} className="btn btn-secondary">
              Import reviews
            </Link>
            <Link href={`/w/${params.workspaceId}/analytics`} className="btn btn-primary">
              View analytics
            </Link>
          </div>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-300">Filters</h2>
        <form className="grid gap-3 md:grid-cols-4">
          <select name="status" defaultValue={searchParams.status ?? ''} className="input">
            <option value="">All statuses</option>
            {Object.values(ReviewStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select name="source" defaultValue={searchParams.source ?? ''} className="input">
            <option value="">All sources</option>
            {Object.values(ReviewSource).map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
          <select name="sentiment" defaultValue={searchParams.sentiment ?? ''} className="input">
            <option value="">All sentiment</option>
            {Object.values(Sentiment).map((sentiment) => (
              <option key={sentiment} value={sentiment}>
                {sentiment}
              </option>
            ))}
          </select>
          <input className="input" name="rating" placeholder="Rating (1-5)" defaultValue={searchParams.rating ?? ''} />

          <select name="tag" defaultValue={searchParams.tag ?? ''} className="input">
            <option value="">All tags</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
          <input className="input" type="date" name="dateFrom" defaultValue={searchParams.dateFrom ?? ''} />
          <input className="input" type="date" name="dateTo" defaultValue={searchParams.dateTo ?? ''} />
          <button className="btn btn-primary">Apply filters</button>
        </form>
      </section>

      <section className="card overflow-hidden">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Review</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Sentiment</th>
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.id} className="border-b border-slate-900/80 align-top text-slate-200">
                <td className="px-4 py-3">
                  <Link href={`/w/${params.workspaceId}/reviews/${review.id}`} className="font-medium text-blue-300">
                    {review.authorName || 'Anonymous'}
                  </Link>
                  <p className="mt-1 line-clamp-2 max-w-md text-xs text-slate-400">{review.text}</p>
                </td>
                <td className="px-4 py-3">{review.rating}/5</td>
                <td className="px-4 py-3">{review.source}</td>
                <td className="px-4 py-3">{review.location.name}</td>
                <td className="px-4 py-3">
                  <StatusPill value={review.status} />
                </td>
                <td className="px-4 py-3">
                  <SentimentPill value={review.sentiment} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex max-w-[220px] flex-wrap gap-1">
                    {review.tags.length ? review.tags.map((tag) => <span key={tag} className="badge">{tag}</span>) : <span>-</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">{review.reviewDate.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
            {!reviews.length ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
                  No reviews found for current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
