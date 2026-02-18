import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { requireApiUserOrThrow } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { assertFeature, assertWorkspaceAccess } from '@/lib/tenant';
import { HttpError, jsonError } from '@/lib/http';
import { sanitizeOptionalText } from '@/lib/sanitize';
import { logAudit } from '@/lib/audit';

const schema = z.object({
  workspaceId: z.string(),
  approvedReply: z.string().max(5000).optional()
});

type Params = { params: { reviewId: string } };

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    const body = await request.json();
    const parsed = schema.parse(body);
    await assertWorkspaceAccess(user.id, parsed.workspaceId, [Role.OWNER, Role.ADMIN]);
    await assertFeature(parsed.workspaceId, 'hasApprovalWorkflow');

    const review = await prisma.review.findUnique({ where: { id: params.reviewId } });
    if (!review || review.workspaceId !== parsed.workspaceId) {
      throw new HttpError(404, 'Review not found');
    }

    const approvedReply = sanitizeOptionalText(parsed.approvedReply, 5000) ?? review.replyDraft;
    if (!approvedReply) {
      throw new HttpError(400, 'No draft reply available to approve');
    }

    const updated = await prisma.review.update({
      where: { id: review.id },
      data: {
        approvedReply,
        status: 'APPROVED',
        approvedById: user.id,
        approvedAt: new Date()
      }
    });

    await logAudit({
      workspaceId: parsed.workspaceId,
      reviewId: review.id,
      actorId: user.id,
      action: 'REVIEW_APPROVED',
      metadata: { statusFrom: review.status, statusTo: 'APPROVED' }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return jsonError(error);
  }
}
