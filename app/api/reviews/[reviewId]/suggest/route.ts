import { NextResponse } from 'next/server';
import { Role, Sentiment } from '@prisma/client';
import { z } from 'zod';
import { buildTagSentimentPrompt, generateText, parseTagSentimentResponse } from '@/lib/ai';
import { requireApiUserOrThrow } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { assertGenerationLimit, assertWorkspaceAccess, consumeGeneration } from '@/lib/tenant';
import { checkRateLimit } from '@/lib/rate-limit';
import { HttpError, jsonError } from '@/lib/http';
import { sanitizeTags } from '@/lib/sanitize';
import { logAudit } from '@/lib/audit';

const schema = z.object({
  workspaceId: z.string().min(1),
  provider: z.enum(['openai', 'claude', 'gemini']).default('openai')
});

type Params = { params: { reviewId: string } };

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    const body = await request.json();
    const parsed = schema.parse(body);
    await assertWorkspaceAccess(user.id, parsed.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    const rate = checkRateLimit(`tag-suggest:${user.id}:${parsed.workspaceId}`, { windowMs: 60_000, maxRequests: 20 });
    if (!rate.success) throw new HttpError(429, 'Rate limit exceeded');

    await assertGenerationLimit(parsed.workspaceId);

    const review = await prisma.review.findUnique({ where: { id: params.reviewId } });
    if (!review || review.workspaceId !== parsed.workspaceId) {
      throw new HttpError(404, 'Review not found');
    }

    const prompt = buildTagSentimentPrompt(review.text, review.rating);
    const generated = await generateText({ provider: parsed.provider, prompt });
    const parsedResult = parseTagSentimentResponse(generated.text);
    const tags = sanitizeTags(parsedResult.tags);
    const sentiment = parsedResult.sentiment as Sentiment;

    const updated = await prisma.review.update({
      where: { id: review.id },
      data: {
        tags,
        sentiment
      }
    });

    await consumeGeneration(parsed.workspaceId);
    await Promise.all([
      logAudit({
        workspaceId: parsed.workspaceId,
        reviewId: review.id,
        actorId: user.id,
        action: 'TAGS_UPDATED',
        metadata: { tags }
      }),
      logAudit({
        workspaceId: parsed.workspaceId,
        reviewId: review.id,
        actorId: user.id,
        action: 'SENTIMENT_UPDATED',
        metadata: { sentiment }
      })
    ]);

    return NextResponse.json({
      review: updated,
      suggestion: { tags, sentiment }
    });
  } catch (error) {
    return jsonError(error);
  }
}
