import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { assertWorkspaceAccess } from '@/lib/tenant';
import { downgradeExpiredSubscriptions } from '@/lib/billing';
import { BillingPanel } from '@/components/dashboard/billing-panel';

export default async function BillingPage({ params }: { params: { workspaceId: string } }) {
  const { user } = await requireUser();
  await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
  await downgradeExpiredSubscriptions();

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: params.workspaceId },
    include: { subscription: true }
  });

  return (
    <main className="space-y-4">
      <section className="card p-5">
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage subscriptions using Stripe or PayPal. Plan updates are handled through webhook events.
        </p>
      </section>
      <BillingPanel workspaceId={params.workspaceId} currentPlan={workspace.plan} subscription={workspace.subscription} />
    </main>
  );
}
