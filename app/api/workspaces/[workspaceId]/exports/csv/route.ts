import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { makeCsv } from '@/lib/csv';
import { requireApiUserOrThrow } from '@/lib/api-auth';
import { assertFeature, assertWorkspaceAccess } from '@/lib/tenant';
import { jsonError } from '@/lib/http';

type Params = { params: { workspaceId: string } };

export async function GET(request: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    await assertFeature(params.workspaceId, 'hasExports');

    const url = new URL(request.url);
    const ids = url.searchParams.get('ids')?.split(',').filter(Boolean);
    const reviews = await prisma.review.findMany({
      where: {
        workspaceId: params.workspaceId,
        ...(ids?.length ? { id: { in: ids } } : {})
      },
      include: { location: true },
      orderBy: { reviewDate: 'desc' }
    });

    const csv = makeCsv(
      [
        'reviewId',
        'source',
        'location',
        'authorName',
        'rating',
        'reviewDate',
        'reviewText',
        'status',
        'sentiment',
        'tags',
        'replyDraft',
        'approvedReply',
        'reviewUrl'
      ],
      reviews.map((review) => [
        review.id,
        review.source,
        review.location.name,
        review.authorName,
        review.rating,
        review.reviewDate.toISOString(),
        review.text,
        review.status,
        review.sentiment,
        review.tags.join('|'),
        review.replyDraft,
        review.approvedReply,
        review.reviewUrl
      ])
    );

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="review-export-${params.workspaceId}.csv"`
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
