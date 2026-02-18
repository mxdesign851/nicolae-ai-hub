import { NextResponse } from 'next/server';
import { Role, ReviewStatus, Sentiment } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireApiUserOrThrow } from '@/lib/api-auth';
import { assertWorkspaceAccess } from '@/lib/tenant';
import { HttpError, jsonError } from '@/lib/http';
import { sanitizeOptionalText, sanitizeTags, sanitizeText } from '@/lib/sanitize';
import { logAudit } from '@/lib/audit';

type Params = { params: { reviewId: string } };

async function getScopedReview(reviewId: string, userId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      location: true,
      draftedBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
      generations: { orderBy: { createdAt: 'desc' }, take: 10 },
      auditLogs: {
        include: { actor: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50
      }
    }
  });
  if (!review) throw new HttpError(404, 'Review not found');
  await assertWorkspaceAccess(userId, review.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
  return review;
}

export async function GET(_: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    const review = await getScopedReview(params.reviewId, user.id);
    return NextResponse.json(review);
  } catch (error) {
    return jsonError(error);
  }
}

const patchSchema = z.object({
  replyDraft: z.string().max(5000).optional(),
  approvedReply: z.string().max(5000).optional(),
  sentiment: z.nativeEnum(Sentiment).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  status: z.nativeEnum(ReviewStatus).optional()
});

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    const review = await getScopedReview(params.reviewId, user.id);
    const membership = await assertWorkspaceAccess(user.id, review.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    const body = await request.json();
    const parsed = patchSchema.parse(body);

    if (parsed.status === 'APPROVED' && !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new HttpError(403, 'Only admin/owner can approve');
    }

    const nextStatus = parsed.status ?? review.status;
    const updateData: Record<string, unknown> = {};
    if (parsed.replyDraft !== undefined) updateData.replyDraft = sanitizeText(parsed.replyDraft, 5000);
    if (parsed.approvedReply !== undefined) updateData.approvedReply = sanitizeOptionalText(parsed.approvedReply, 5000);
    if (parsed.sentiment !== undefined) updateData.sentiment = parsed.sentiment;
    if (parsed.tags !== undefined) updateData.tags = sanitizeTags(parsed.tags);

    if (parsed.status) updateData.status = parsed.status;
    if (parsed.replyDraft !== undefined || parsed.approvedReply !== undefined) {
      updateData.editedById = user.id;
      updateData.editedAt = new Date();
    }
    if (nextStatus === 'APPROVED') {
      updateData.approvedById = user.id;
      updateData.approvedAt = new Date();
      updateData.approvedReply = parsed.approvedReply ?? parsed.replyDraft ?? review.replyDraft;
    }

    const updated = await prisma.review.update({
      where: { id: review.id },
      data: updateData
    });

    await logAudit({
      workspaceId: review.workspaceId,
      reviewId: review.id,
      actorId: user.id,
      action: parsed.status ? 'REVIEW_STATUS_CHANGED' : 'REVIEW_EDITED',
      metadata: {
        statusFrom: review.status,
        statusTo: parsed.status ?? review.status,
        tagsUpdated: parsed.tags !== undefined,
        sentimentUpdated: parsed.sentiment !== undefined
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return jsonError(error);
  }
}
