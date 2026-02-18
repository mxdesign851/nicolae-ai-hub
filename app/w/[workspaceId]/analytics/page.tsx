import { Role } from '@prisma/client';
import { requireUser } from '@/lib/session';
import { assertWorkspaceAccess } from '@/lib/tenant';
import { getWorkspaceAnalytics } from '@/lib/analytics';

export default async function AnalyticsPage({ params }: { params: { workspaceId: string } }) {
  const { user } = await requireUser();
  await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
  const analytics = await getWorkspaceAnalytics(params.workspaceId);

  return (
    <main className="space-y-5">
      <section className="card p-5">
        <h1 className="text-2xl font-semibold">Workspace Analytics</h1>
        <p className="mt-1 text-sm text-slate-400">Track volume, quality, workflow progress, and generation usage.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        {[
          ['Reviews', analytics.totalReviews],
          ['Avg rating', analytics.avgRating],
          ['Drafted', analytics.draftedCount],
          ['Approved', analytics.approvedCount],
          ['AI usage', `${analytics.generationUsage.used}/${analytics.generationUsage.limit}`]
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="card p-5">
          <h2 className="text-lg font-semibold">Sentiment breakdown</h2>
          <div className="mt-4 space-y-2 text-sm">
            {(['POS', 'NEU', 'NEG'] as const).map((key) => (
              <div key={key} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <p className="font-medium">{key}</p>
                <p className="text-slate-400">
                  {analytics.sentiment.counts[key]} reviews ({analytics.sentiment.percentages[key]}%)
                </p>
              </div>
            ))}
          </div>
        </article>
        <article className="card p-5">
          <h2 className="text-lg font-semibold">Top tags</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {analytics.topTags.length ? (
              analytics.topTags.map((tag) => (
                <span key={tag.name} className="badge border-slate-700 bg-slate-950 px-2 py-1 text-sm">
                  {tag.name} ({tag.count})
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-400">No tags yet.</p>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
