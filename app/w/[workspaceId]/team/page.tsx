import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { assertWorkspaceAccess } from '@/lib/tenant';
import { PLAN_LIMITS, planDisplayName } from '@/lib/plans';
import { TeamManager } from '@/components/dashboard/team-manager';

export default async function TeamPage({ params }: { params: { workspaceId: string } }) {
  const { user } = await requireUser();
  const membership = await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
  const members = await prisma.workspaceMembership.findMany({
    where: { workspaceId: params.workspaceId },
    include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }]
  });

  const limits = PLAN_LIMITS[membership.workspace.plan];
  const canManage = ['OWNER', 'ADMIN'].includes(membership.role);

  return (
    <main className="space-y-4">
      <section className="card p-5">
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="mt-1 text-sm text-slate-400">
          {members.length} / {limits.maxUsers === Number.MAX_SAFE_INTEGER ? 'Unlimited' : limits.maxUsers} seats -{' '}
          {planDisplayName(membership.workspace.plan)} plan
        </p>
        {membership.workspace.plan !== 'AGENCY' ? (
          <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Role customization is fully enabled on Agency plan. Non-Agency invites default to MEMBER.
          </p>
        ) : null}
      </section>

      <TeamManager workspaceId={params.workspaceId} members={members} canManageRoles={canManage} canInvite={canManage} />
    </main>
  );
}
