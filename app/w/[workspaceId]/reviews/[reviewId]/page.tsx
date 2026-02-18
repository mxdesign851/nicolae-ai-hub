import Link from 'next/link';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { assertWorkspaceAccess } from '@/lib/tenant';
import { HttpError } from '@/lib/http';
import { ReviewDetailClient } from '@/components/dashboard/review-detail-client';

type PageProps = {
  params: { workspaceId: string; reviewId: string };
};

export default async function ReviewDetailPage({ params }: PageProps) {
  const { user } = await requireUser();
  const membership = await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

  const review = await prisma.review.findUnique({
    where: { id: params.reviewId },
    include: {
      draftedBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
      generations: {
        orderBy: { createdAt: 'desc' },
        take: 20
      },
      auditLogs: {
        include: { actor: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50
      }
    }
  });
  if (!review || review.workspaceId !== params.workspaceId) {
    throw new HttpError(404, 'Review not found');
  }

  return (
    <main className="space-y-4">
      <Link href={`/w/${params.workspaceId}/inbox`} className="inline-flex text-sm text-blue-300">
        {'<-'} Back to inbox
      </Link>
      <ReviewDetailClient
        workspaceId={params.workspaceId}
        role={membership.role}
        review={{
          ...review,
          reviewDate: review.reviewDate.toISOString(),
          draftedAt: review.draftedAt?.toISOString() ?? null,
          approvedAt: review.approvedAt?.toISOString() ?? null,
          generations: review.generations.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
            estimatedCostUsd: item.estimatedCostUsd?.toString() ?? null
          })),
          auditLogs: review.auditLogs.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString()
          }))
        }}
      />
    </main>
  );
}
