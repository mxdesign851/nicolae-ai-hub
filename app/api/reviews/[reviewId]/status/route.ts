import { NextResponse } from 'next/server';
import { Role, ReviewStatus } from '@prisma/client';
import { z } from 'zod';
import { requireApiUserOrThrow } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { assertWorkspaceAccess } from '@/lib/tenant';
import { HttpError, jsonError } from '@/lib/http';
import { logAudit } from '@/lib/audit';

const schema = z.object({
  workspaceId: z.string().min(1),
  status: z.nativeEnum(ReviewStatus)
});

type Params = { params: { reviewId: string } };

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    const body = await request.json();
    const parsed = schema.parse(body);
    const membership = await assertWorkspaceAccess(user.id, parsed.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    if (parsed.status === 'APPROVED' && !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new HttpError(403, 'Only admin/owner can approve');
    }

    const review = await prisma.review.findUnique({ where: { id: params.reviewId } });
    if (!review || review.workspaceId !== parsed.workspaceId) throw new HttpError(404, 'Review not found');

    const updated = await prisma.review.update({
      where: { id: review.id },
      data: { status: parsed.status }
    });

    await logAudit({
      workspaceId: parsed.workspaceId,
      reviewId: review.id,
      actorId: user.id,
      action: 'REVIEW_STATUS_CHANGED',
      metadata: { from: review.status, to: parsed.status }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return jsonError(error);
  }
}
