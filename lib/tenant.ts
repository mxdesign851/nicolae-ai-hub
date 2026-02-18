import { Plan, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { PLAN_LIMITS, getMonthBucket } from '@/lib/plans';
import { HttpError } from '@/lib/http';

export async function getMembership(userId: string, workspaceId: string) {
  return prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { workspace: true, user: true }
  });
}

export async function assertWorkspaceAccess(userId: string, workspaceId: string, roles?: Role[]) {
  const membership = await getMembership(userId, workspaceId);

  if (!membership) throw new HttpError(403, 'Workspace access denied');
  if (roles && !roles.includes(membership.role)) throw new HttpError(403, 'Insufficient role');

  return membership;
}

export async function assertWorkspaceLimit(userId: string, requestedPlan: Plan = 'FREE') {
  const memberships = await prisma.workspaceMembership.findMany({
    where: { userId },
    include: { workspace: { select: { plan: true } } }
  });

  const highestPlan = memberships.reduce<Plan>((acc, membership) => {
    if (membership.workspace.plan === 'AGENCY') return 'AGENCY';
    if (membership.workspace.plan === 'PRO' && acc === 'FREE') return 'PRO';
    return acc;
  }, requestedPlan);

  const limits = PLAN_LIMITS[highestPlan];
  if (memberships.length >= limits.maxWorkspaces) {
    throw new HttpError(403, `Workspace limit reached for current plan (${limits.maxWorkspaces})`);
  }
}

export async function assertLocationLimit(workspaceId: string, extra = 1) {
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const count = await prisma.location.count({ where: { workspaceId } });
  const limits = PLAN_LIMITS[workspace.plan];
  if (count + extra > limits.maxLocations) {
    throw new HttpError(403, `Plan limit reached: max ${limits.maxLocations} locations`);
  }
}

export async function assertTeamLimit(workspaceId: string, extra = 1) {
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const count = await prisma.workspaceMembership.count({ where: { workspaceId } });
  const limits = PLAN_LIMITS[workspace.plan];
  if (count + extra > limits.maxUsers) {
    throw new HttpError(403, `Team size limit reached for ${workspace.plan} plan`);
  }
}

export async function refreshWorkspaceGenerationBucket(workspaceId: string) {
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const bucket = getMonthBucket();
  if (workspace.monthBucket === bucket) {
    return workspace;
  }

  return prisma.workspace.update({
    where: { id: workspaceId },
    data: { monthBucket: bucket, aiGenerationsUsed: 0 }
  });
}

export async function assertGenerationLimit(workspaceId: string) {
  const workspace = await refreshWorkspaceGenerationBucket(workspaceId);
  const limits = PLAN_LIMITS[workspace.plan];
  if (workspace.aiGenerationsUsed >= limits.monthlyGenerations) {
    throw new HttpError(403, `Monthly AI generation limit reached (${limits.monthlyGenerations})`);
  }
}

export async function consumeGeneration(workspaceId: string, amount = 1) {
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { aiGenerationsUsed: { increment: amount } }
  });
}

type PlanFeatureFlag = 'hasBrandVoice' | 'hasApprovalWorkflow' | 'hasBulkTools' | 'hasExports' | 'hasPrioritySettings';

export async function assertFeature(workspaceId: string, feature: PlanFeatureFlag) {
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const enabled = PLAN_LIMITS[workspace.plan][feature];
  if (!enabled) {
    throw new HttpError(403, `Feature "${feature}" requires a higher plan`);
  }

  return workspace;
}
