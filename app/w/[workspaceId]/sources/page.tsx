import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { assertWorkspaceAccess } from '@/lib/tenant';
import { SourceImportPanel } from '@/components/dashboard/source-import-panel';

export default async function SourcesPage({ params }: { params: { workspaceId: string } }) {
  const { user } = await requireUser();
  await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
  const [locations, sources] = await Promise.all([
    prisma.location.findMany({ where: { workspaceId: params.workspaceId }, orderBy: { name: 'asc' } }),
    prisma.sourceConnection.findMany({ where: { workspaceId: params.workspaceId }, orderBy: { provider: 'asc' } })
  ]);

  return (
    <main className="space-y-4">
      <section className="card p-5">
        <h1 className="text-2xl font-semibold">Sources & Imports</h1>
        <p className="mt-1 text-sm text-slate-400">
          Start with manual entry or CSV import. Connector architecture is ready for future API-based source sync.
        </p>
      </section>
      <SourceImportPanel workspaceId={params.workspaceId} locations={locations} sources={sources} />
    </main>
  );
}
