import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { assertWorkspaceAccess } from '@/lib/tenant';
import { PLAN_LIMITS } from '@/lib/plans';
import { LocationManager } from '@/components/dashboard/location-manager';

export default async function LocationsPage({ params }: { params: { workspaceId: string } }) {
  const { user } = await requireUser();
  const membership = await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
  const locations = await prisma.location.findMany({
    where: { workspaceId: params.workspaceId },
    include: { _count: { select: { reviews: true } } },
    orderBy: { createdAt: 'asc' }
  });

  const limits = PLAN_LIMITS[membership.workspace.plan];
  const canCreate = ['OWNER', 'ADMIN'].includes(membership.role) && locations.length < limits.maxLocations;

  return (
    <main className="space-y-4">
      <section className="card p-5">
        <h1 className="text-2xl font-semibold">Locations</h1>
        <p className="mt-1 text-sm text-slate-400">
          {locations.length} / {limits.maxLocations === Number.MAX_SAFE_INTEGER ? 'Unlimited' : limits.maxLocations} locations in
          current plan.
        </p>
      </section>
      <LocationManager workspaceId={params.workspaceId} locations={locations} canCreate={canCreate} />
    </main>
  );
}
