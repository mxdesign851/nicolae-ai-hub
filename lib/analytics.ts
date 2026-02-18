import { ReviewStatus, Sentiment } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { PLAN_LIMITS } from '@/lib/plans';

function toPercent(part: number, total: number) {
  if (!total) return 0;
  return Number(((part / total) * 100).toFixed(1));
}

export async function getWorkspaceAnalytics(workspaceId: string) {
  const [workspace, reviews, draftedCount, approvedCount] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } }),
    prisma.review.findMany({
      where: { workspaceId },
      select: { rating: true, tags: true, sentiment: true, status: true }
    }),
    prisma.review.count({ where: { workspaceId, status: ReviewStatus.DRAFTED } }),
    prisma.review.count({ where: { workspaceId, status: ReviewStatus.APPROVED } })
  ]);

  const total = reviews.length;
  const avgRating = total ? Number((reviews.reduce((sum, item) => sum + item.rating, 0) / total).toFixed(2)) : 0;
  const sentimentCounts = reviews.reduce(
    (acc, review) => {
      acc[review.sentiment] += 1;
      return acc;
    },
    { POS: 0, NEU: 0, NEG: 0 } as Record<Sentiment, number>
  );

  const statusCounts = reviews.reduce(
    (acc, review) => {
      acc[review.status] = (acc[review.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<ReviewStatus, number>
  );

  const tagMap = new Map<string, number>();
  for (const review of reviews) {
    for (const tag of review.tags) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }
  }
  const topTags = Array.from(tagMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const limits = PLAN_LIMITS[workspace.plan];

  return {
    totalReviews: total,
    avgRating,
    draftedCount,
    approvedCount,
    statusCounts,
    generationUsage: {
      used: workspace.aiGenerationsUsed,
      limit: limits.monthlyGenerations,
      percent: toPercent(workspace.aiGenerationsUsed, limits.monthlyGenerations)
    },
    topTags,
    sentiment: {
      counts: sentimentCounts,
      percentages: {
        POS: toPercent(sentimentCounts.POS, total),
        NEU: toPercent(sentimentCounts.NEU, total),
        NEG: toPercent(sentimentCounts.NEG, total)
      }
    }
  };
}
