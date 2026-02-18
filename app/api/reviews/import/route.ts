import { NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { Role, ReviewSource, Sentiment } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assertWorkspaceAccess } from '@/lib/tenant';

const manualSchema = z.object({
  userId: z.string(),
  workspaceId: z.string(),
  locationId: z.string(),
  authorName: z.string(),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(5),
  source: z.nativeEnum(ReviewSource),
  reviewDate: z.string(),
  reviewUrl: z.string().url().optional(),
  language: z.string().optional(),
  tags: z.array(z.string()).default([])
});

function sentimentFromRating(rating: number): Sentiment {
  if (rating >= 4) return Sentiment.POS;
  if (rating === 3) return Sentiment.NEU;
  return Sentiment.NEG;
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const userId = String(form.get('userId') || '');
    const workspaceId = String(form.get('workspaceId') || '');
    const locationId = String(form.get('locationId') || '');
    const file = form.get('file');

    await assertWorkspaceAccess(userId, workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    if (!(file instanceof File)) return NextResponse.json({ error: 'Missing CSV file' }, { status: 400 });
    const csv = await file.text();
    const rows = parse(csv, { columns: true, skip_empty_lines: true }) as Record<string, string>[];

    const created = await prisma.$transaction(
      rows.map((row) =>
        prisma.review.create({
          data: {
            workspaceId,
            locationId,
            source: (row.source?.toUpperCase() as ReviewSource) || ReviewSource.OTHER,
            authorName: row.name || 'Anonymous',
            rating: Number(row.rating),
            text: row.text || '',
            reviewDate: row.date ? new Date(row.date) : new Date(),
            reviewUrl: row.url || null,
            language: row.language || null,
            tags: row.tags ? row.tags.split(',').map((t) => t.trim()) : [],
            sentiment: sentimentFromRating(Number(row.rating))
          }
        })
      )
    );

    return NextResponse.json({ imported: created.length });
  }

  const body = await request.json();
  const parsed = manualSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await assertWorkspaceAccess(parsed.data.userId, parsed.data.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

  const review = await prisma.review.create({
    data: {
      ...parsed.data,
      reviewDate: new Date(parsed.data.reviewDate),
      sentiment: sentimentFromRating(parsed.data.rating)
    }
  });

  return NextResponse.json(review, { status: 201 });
}
