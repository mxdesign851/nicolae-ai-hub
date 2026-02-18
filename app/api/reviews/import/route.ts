import { NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { Role, ReviewSource, Sentiment } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assertLocationLimit, assertWorkspaceAccess } from '@/lib/tenant';
import { requireApiUserOrThrow } from '@/lib/api-auth';
import { HttpError, jsonError } from '@/lib/http';
import { sanitizeOptionalText, sanitizeTags, sanitizeText, sanitizeUrl } from '@/lib/sanitize';
import { logAudit } from '@/lib/audit';

const manualSchema = z.object({
  workspaceId: z.string(),
  locationId: z.string().optional(),
  locationName: z.string().max(100).optional(),
  authorName: z.string().max(120),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(3).max(5000),
  source: z.nativeEnum(ReviewSource),
  reviewDate: z.string(),
  reviewUrl: z.string().url().optional().nullable(),
  language: z.string().max(32).optional().nullable(),
  tags: z.array(z.string().max(40)).max(20).default([])
});

function sentimentFromRating(rating: number): Sentiment {
  if (rating >= 4) return Sentiment.POS;
  if (rating === 3) return Sentiment.NEU;
  return Sentiment.NEG;
}

async function resolveLocation(workspaceId: string, locationId?: string, locationName?: string) {
  if (locationId) {
    const existing = await prisma.location.findUnique({ where: { id: locationId } });
    if (!existing || existing.workspaceId !== workspaceId) {
      throw new HttpError(404, 'Location not found');
    }
    return existing;
  }

  const safeName = sanitizeOptionalText(locationName, 100);
  if (!safeName) {
    throw new HttpError(400, 'locationId or locationName is required');
  }

  const existingByName = await prisma.location.findUnique({
    where: { workspaceId_name: { workspaceId, name: safeName } }
  });
  if (existingByName) return existingByName;

  await assertLocationLimit(workspaceId);
  return prisma.location.create({ data: { workspaceId, name: safeName } });
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUserOrThrow();
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const workspaceId = String(form.get('workspaceId') || '');
      const defaultLocationId = String(form.get('locationId') || '');
      const file = form.get('file');

      await assertWorkspaceAccess(user.id, workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
      if (!(file instanceof File)) throw new HttpError(400, 'Missing CSV file');

      const csv = await file.text();
      const rows = parse(csv, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];

      let imported = 0;
      const errors: Array<{ row: number; message: string }> = [];
      for (const [index, row] of rows.entries()) {
        try {
          const sourceRaw = row.source?.toUpperCase();
          const source = sourceRaw && sourceRaw in ReviewSource ? (sourceRaw as ReviewSource) : ReviewSource.OTHER;
          const rating = Number(row.rating || 0);
          if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
            throw new HttpError(400, 'Invalid rating');
          }

          const location = await resolveLocation(workspaceId, row.locationId || defaultLocationId || undefined, row.location);
          const text = sanitizeText(row.text || '', 5000);
          if (text.length < 3) throw new HttpError(400, 'Review text is too short');

          const tags = row.tags ? sanitizeTags(row.tags.split('|').flatMap((item) => item.split(','))) : [];
          const review = await prisma.review.create({
            data: {
              workspaceId,
              locationId: location.id,
              source,
              authorName: sanitizeText(row.name || 'Anonymous', 120),
              rating,
              text,
              reviewDate: row.date ? new Date(row.date) : new Date(),
              reviewUrl: sanitizeUrl(row.url),
              language: sanitizeOptionalText(row.language, 32),
              tags,
              sentiment: sentimentFromRating(rating)
            }
          });
          imported += 1;

          await logAudit({
            workspaceId,
            reviewId: review.id,
            actorId: user.id,
            action: 'REVIEW_IMPORTED',
            metadata: { source: review.source, row: index + 1 }
          });
        } catch (error) {
          errors.push({ row: index + 1, message: error instanceof Error ? error.message : 'Unknown import error' });
        }
      }

      return NextResponse.json({ imported, failed: errors.length, errors });
    }

    const body = await request.json();
    const parsed = manualSchema.parse(body);

    await assertWorkspaceAccess(user.id, parsed.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    const location = await resolveLocation(parsed.workspaceId, parsed.locationId, parsed.locationName);

    const review = await prisma.review.create({
      data: {
        workspaceId: parsed.workspaceId,
        locationId: location.id,
        source: parsed.source,
        authorName: sanitizeText(parsed.authorName, 120),
        rating: parsed.rating,
        text: sanitizeText(parsed.text, 5000),
        reviewDate: new Date(parsed.reviewDate),
        reviewUrl: sanitizeUrl(parsed.reviewUrl || null),
        language: sanitizeOptionalText(parsed.language || null, 32),
        tags: sanitizeTags(parsed.tags),
        sentiment: sentimentFromRating(parsed.rating)
      }
    });

    await logAudit({
      workspaceId: parsed.workspaceId,
      reviewId: review.id,
      actorId: user.id,
      action: 'REVIEW_CREATED',
      metadata: { source: parsed.source }
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
