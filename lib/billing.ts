import { Plan, SubscriptionProvider, SubscriptionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const DEFAULT_GRACE_DAYS = 7;

export function mapPlanFromStripePriceId(priceId?: string | null): Plan {
  if (!priceId) return 'FREE';
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'PRO';
  if (priceId === process.env.STRIPE_PRICE_AGENCY) return 'AGENCY';
  return 'FREE';
}

export function mapPlanFromPayPalPlanId(planId?: string | null): Plan {
  if (!planId) return 'FREE';
  if (planId === process.env.PAYPAL_PLAN_PRO) return 'PRO';
  if (planId === process.env.PAYPAL_PLAN_AGENCY) return 'AGENCY';
  return 'FREE';
}

export function normalizeStripeStatus(status?: string | null): SubscriptionStatus {
  switch (status) {
    case 'active':
      return 'ACTIVE';
    case 'trialing':
      return 'TRIALING';
    case 'past_due':
      return 'PAST_DUE';
    case 'canceled':
      return 'CANCELED';
    case 'incomplete':
      return 'INCOMPLETE';
    case 'unpaid':
      return 'UNPAID';
    default:
      return 'INCOMPLETE';
  }
}

export function normalizePayPalStatus(status?: string | null): SubscriptionStatus {
  switch (status) {
    case 'ACTIVE':
      return 'ACTIVE';
    case 'APPROVAL_PENDING':
      return 'APPROVAL_PENDING';
    case 'SUSPENDED':
      return 'PAST_DUE';
    case 'CANCELLED':
      return 'CANCELED';
    case 'EXPIRED':
      return 'CANCELED';
    default:
      return 'INCOMPLETE';
  }
}

export function isSubscriptionActive(status: SubscriptionStatus) {
  return status === 'ACTIVE' || status === 'TRIALING';
}

type SubscriptionUpsertInput = {
  workspaceId: string;
  provider: SubscriptionProvider;
  externalId?: string | null;
  status: SubscriptionStatus;
  plan: Plan;
  currentPeriodEnd?: Date | null;
  metadata?: unknown;
};

export async function upsertSubscriptionAndPlan(input: SubscriptionUpsertInput) {
  const gracePeriodEndsAt =
    input.status === 'PAST_DUE' || input.status === 'UNPAID'
      ? new Date(Date.now() + DEFAULT_GRACE_DAYS * 24 * 60 * 60 * 1000)
      : null;

  await prisma.$transaction([
    prisma.subscription.upsert({
      where: { workspaceId: input.workspaceId },
      create: {
        workspaceId: input.workspaceId,
        provider: input.provider,
        externalId: input.externalId ?? null,
        status: input.status,
        plan: input.plan,
        currentPeriodEnd: input.currentPeriodEnd ?? null,
        gracePeriodEndsAt,
        metadata: input.metadata ?? undefined
      },
      update: {
        provider: input.provider,
        externalId: input.externalId ?? null,
        status: input.status,
        plan: input.plan,
        currentPeriodEnd: input.currentPeriodEnd ?? null,
        gracePeriodEndsAt,
        metadata: input.metadata ?? undefined
      }
    }),
    prisma.workspace.update({
      where: { id: input.workspaceId },
      data: {
        plan: isSubscriptionActive(input.status) ? input.plan : 'FREE',
        gracePeriodEndsAt
      }
    })
  ]);
}

export async function markSubscriptionPastDue(workspaceId: string) {
  const gracePeriodEndsAt = new Date(Date.now() + DEFAULT_GRACE_DAYS * 24 * 60 * 60 * 1000);
  await prisma.$transaction([
    prisma.subscription.updateMany({
      where: { workspaceId },
      data: { status: 'PAST_DUE', gracePeriodEndsAt }
    }),
    prisma.workspace.update({
      where: { id: workspaceId },
      data: { gracePeriodEndsAt }
    })
  ]);
}

export async function downgradeExpiredSubscriptions() {
  const now = new Date();
  const expired = await prisma.subscription.findMany({
    where: {
      status: { in: ['PAST_DUE', 'UNPAID'] },
      gracePeriodEndsAt: { not: null, lte: now }
    },
    select: { workspaceId: true }
  });

  if (!expired.length) return 0;

  const workspaceIds = expired.map((item) => item.workspaceId);
  await prisma.$transaction([
    prisma.workspace.updateMany({
      where: { id: { in: workspaceIds } },
      data: { plan: 'FREE', gracePeriodEndsAt: null }
    }),
    prisma.subscription.updateMany({
      where: { workspaceId: { in: workspaceIds } },
      data: { status: 'CANCELED', plan: 'FREE', gracePeriodEndsAt: null }
    })
  ]);

  return workspaceIds.length;
}
