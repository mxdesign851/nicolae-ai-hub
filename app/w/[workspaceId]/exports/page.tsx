import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { assertWorkspaceAccess } from '@/lib/tenant';
import { PLAN_LIMITS } from '@/lib/plans';
import { ExportPanel } from '@/components/dashboard/export-panel';

export default async function ExportsPage({ params }: { params: { workspaceId: string } }) {
  const { user } = await requireUser();
  const membership = await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
  const reviews = await prisma.review.findMany({
    where: { workspaceId: params.workspaceId },
    select: {
      id: true,
      authorName: true,
      rating: true,
      status: true,
      approvedReply: true,
      replyDraft: true
    },
    orderBy: { reviewDate: 'desc' },
    take: 300
  });
  const canExport = PLAN_LIMITS[membership.workspace.plan].hasExports;

  return (
    <main className="space-y-4">
      <section className="card p-5">
        <h1 className="text-2xl font-semibold">Exports</h1>
        <p className="mt-1 text-sm text-slate-400">Copy replies to clipboard or export selected reviews as CSV.</p>
      </section>
      <ExportPanel workspaceId={params.workspaceId} reviews={reviews} canExport={canExport} />
    </main>
  );
}
