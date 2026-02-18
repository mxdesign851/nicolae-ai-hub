import { prisma } from '@/lib/prisma';

export async function listUserWorkspaces(userId: string) {
  return prisma.workspaceMembership.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: [{ role: 'asc' }, { workspace: { createdAt: 'asc' } }]
  });
}

export async function getWorkspaceMembershipForUser(userId: string, workspaceId: string) {
  return prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    include: { workspace: true }
  });
}

export async function getDefaultWorkspaceId(userId: string) {
  const membership = await prisma.workspaceMembership.findFirst({
    where: { userId },
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    select: { workspaceId: true }
  });
  return membership?.workspaceId ?? null;
}
