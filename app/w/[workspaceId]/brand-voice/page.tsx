import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { assertWorkspaceAccess } from '@/lib/tenant';
import { PLAN_LIMITS, planDisplayName } from '@/lib/plans';
import { BrandVoiceForm } from '@/components/dashboard/brand-voice-form';

export default async function BrandVoicePage({ params }: { params: { workspaceId: string } }) {
  const { user } = await requireUser();
  const membership = await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
  const [workspaceVoice, locationVoices, locations] = await Promise.all([
    prisma.brandVoice.findUnique({ where: { workspaceId: params.workspaceId } }),
    prisma.brandVoice.findMany({ where: { location: { workspaceId: params.workspaceId } } }),
    prisma.location.findMany({ where: { workspaceId: params.workspaceId }, orderBy: { name: 'asc' } })
  ]);

  const canUseBrandVoice = PLAN_LIMITS[membership.workspace.plan].hasBrandVoice;

  return (
    <main className="space-y-4">
      <section className="card p-5">
        <h1 className="text-2xl font-semibold">Brand Voice</h1>
        <p className="mt-1 text-sm text-slate-400">
          Configure tone, do/don't guidance, banned words, and sign-off defaults at workspace or location level.
        </p>
        {!canUseBrandVoice ? (
          <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Your {planDisplayName(membership.workspace.plan)} plan does not include custom brand voice. Upgrade to Pro or
            Agency.
          </p>
        ) : null}
      </section>
      {canUseBrandVoice ? (
        <BrandVoiceForm
          workspaceId={params.workspaceId}
          workspaceVoice={workspaceVoice}
          locationVoices={locationVoices}
          locations={locations}
        />
      ) : null}
    </main>
  );
}
