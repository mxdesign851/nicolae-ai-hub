import { NextResponse } from 'next/server';
import { ReviewSource, ReviewStatus, Role, Sentiment } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireApiUserOrThrow } from '@/lib/api-auth';
import { assertWorkspaceAccess } from '@/lib/tenant';
import { HttpError, jsonError } from '@/lib/http';

const filtersSchema = z.object({
  workspaceId: z.string().min(1),
  status: z.nativeEnum(ReviewStatus).optional(),
  source: z.nativeEnum(ReviewSource).optional(),
  sentiment: z.nativeEnum(Sentiment).optional(),
  tag: z.string().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).max(200).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export async function GET(request: Request) {
  try {
    const user = await requireApiUserOrThrow();
    const url = new URL(request.url);
    const parsed = filtersSchema.parse(Object.fromEntries(url.searchParams.entries()));
    await assertWorkspaceAccess(user.id, parsed.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    const where = {
      workspaceId: parsed.workspaceId,
      ...(parsed.status ? { status: parsed.status } : {}),
      ...(parsed.source ? { source: parsed.source } : {}),
      ...(parsed.sentiment ? { sentiment: parsed.sentiment } : {}),
      ...(parsed.tag ? { tags: { has: parsed.tag } } : {}),
      ...(parsed.rating ? { rating: parsed.rating } : {}),
      ...((parsed.dateFrom || parsed.dateTo)
        ? {
            reviewDate: {
              ...(parsed.dateFrom ? { gte: new Date(parsed.dateFrom) } : {}),
              ...(parsed.dateTo ? { lte: new Date(parsed.dateTo) } : {})
            }
          }
        : {})
    };

    const skip = (parsed.page - 1) * parsed.pageSize;
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          location: true,
          draftedBy: { select: { id: true, name: true, email: true } },
          approvedBy: { select: { id: true, name: true, email: true } }
        },
        orderBy: { reviewDate: 'desc' },
        skip,
        take: parsed.pageSize
      }),
      prisma.review.count({ where })
    ]);

    return NextResponse.json({
      reviews,
      pagination: {
        total,
        page: parsed.page,
        pageSize: parsed.pageSize,
        pageCount: Math.max(1, Math.ceil(total / parsed.pageSize))
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}

const createSchema = z.object({
  workspaceId: z.string().min(1),
  locationId: z.string().min(1),
  source: z.nativeEnum(ReviewSource),
  authorName: z.string().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(3).max(5000),
  reviewDate: z.string(),
  reviewUrl: z.string().url().optional(),
  language: z.string().max(32).optional(),
  tags: z.array(z.string().max(40)).max(20).default([])
});

export async function POST(request: Request) {
  try {
    const user = await requireApiUserOrThrow();
    const body = await request.json();
    const parsed = createSchema.parse(body);
    await assertWorkspaceAccess(user.id, parsed.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    const location = await prisma.location.findUnique({ where: { id: parsed.locationId } });
    if (!location || location.workspaceId !== parsed.workspaceId) {
      throw new HttpError(404, 'Location not found');
    }

    const review = await prisma.review.create({
      data: {
        ...parsed,
        reviewDate: new Date(parsed.reviewDate),
        sentiment: parsed.rating >= 4 ? 'POS' : parsed.rating === 3 ? 'NEU' : 'NEG'
      }
    });
    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
