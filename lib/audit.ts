import { AuditAction } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function logAudit(input: {
  workspaceId: string;
  actorId: string;
  action: AuditAction;
  reviewId?: string | null;
  metadata?: unknown;
}) {
  return prisma.reviewAuditLog.create({
    data: {
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      action: input.action,
      reviewId: input.reviewId ?? null,
      metadata: input.metadata as object | undefined
    }
  });
}
