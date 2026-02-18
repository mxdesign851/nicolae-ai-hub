import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { PLAN_LIMITS, getMonthBucket } from '@/lib/plans';

export async function assertWorkspaceAccess(userId: string, workspaceId: string, roles?: Role[]) {
  const membership = await prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { workspace: true }
  });

  if (!membership) throw new Error('Workspace access denied');
  if (roles && !roles.includes(membership.role)) throw new Error('Insufficient role');

  return membership;
}

export async function assertLocationLimit(workspaceId: string) {
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const count = await prisma.location.count({ where: { workspaceId } });
  const limits = PLAN_LIMITS[workspace.plan];
  if (count >= limits.maxLocations) {
    throw new Error(`Plan limit reached: max ${limits.maxLocations} locations`);
  }
}

export async function assertGenerationLimit(workspaceId: string) {
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const bucket = getMonthBucket();
  let used = workspace.aiGenerationsUsed;

  if (workspace.monthBucket !== bucket) {
    await prisma.workspace.update({ where: { id: workspaceId }, data: { monthBucket: bucket, aiGenerationsUsed: 0 } });
    used = 0;
  }

  const limits = PLAN_LIMITS[workspace.plan];
  if (used >= limits.monthlyGenerations) {
    throw new Error(`Monthly AI generation limit reached (${limits.monthlyGenerations})`);
  }
}

export async function consumeGeneration(workspaceId: string) {
  await prisma.workspace.update({ where: { id: workspaceId }, data: { aiGenerationsUsed: { increment: 1 } } });
}
