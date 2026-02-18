import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assertWorkspaceAccess, assertGenerationLimit, consumeGeneration } from '@/lib/tenant';
import { buildReplyPrompt, generateText, providerToEnum, REPLY_PROMPT_VERSION } from '@/lib/ai';
import { requireApiUserOrThrow } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { HttpError, jsonError } from '@/lib/http';
import { sanitizeOptionalText } from '@/lib/sanitize';
import { logAudit } from '@/lib/audit';

const schema = z.object({
  workspaceId: z.string(),
  reviewId: z.string(),
  provider: z.enum(['openai', 'claude', 'gemini']),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
  targetLanguage: z.string().max(32).optional(),
  escalation: z.boolean().default(true)
});

export async function POST(request: Request) {
  try {
    const user = await requireApiUserOrThrow();
    const body = await request.json();
    const parsed = schema.parse(body);
    const membership = await assertWorkspaceAccess(user.id, parsed.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    const rate = checkRateLimit(`ai:${user.id}:${parsed.workspaceId}`, { windowMs: 60_000, maxRequests: 20 });
    if (!rate.success) {
      throw new HttpError(429, 'Rate limit exceeded. Please retry shortly.', { retryAfterMs: rate.retryAfterMs });
    }

    await assertGenerationLimit(parsed.workspaceId);

    const review = await prisma.review.findUnique({
      where: { id: parsed.reviewId },
      include: {
        location: { include: { brandVoice: true } },
        workspace: { include: { brandVoice: true } }
      }
    });
    if (!review || review.workspaceId !== parsed.workspaceId) {
      throw new HttpError(404, 'Review not found');
    }

    const brandVoice = review.location.brandVoice ?? review.workspace.brandVoice;
    const prompt = buildReplyPrompt({
      reviewText: review.text,
      rating: review.rating,
      source: review.source,
      length: parsed.length,
      targetLanguage: sanitizeOptionalText(parsed.targetLanguage, 32) ?? undefined,
      escalation: parsed.escalation,
      brandVoice: brandVoice
        ? {
            tone: brandVoice.tone,
            doList: brandVoice.doList,
            dontList: brandVoice.dontList,
            examples: brandVoice.examples,
            bannedWords: brandVoice.bannedWords,
            signOff: brandVoice.signOff
          }
        : null
    });

    const generated = await generateText({ provider: parsed.provider, prompt });

    await prisma.$transaction([
      prisma.review.update({
        where: { id: review.id },
        data: {
          replyDraft: generated.text,
          status: 'DRAFTED',
          draftedById: user.id,
          draftedAt: new Date(),
          editedById: user.id,
          editedAt: new Date()
        }
      }),
      prisma.replyGeneration.create({
        data: {
          workspaceId: parsed.workspaceId,
          reviewId: review.id,
          createdById: user.id,
          provider: providerToEnum(parsed.provider),
          model: generated.model,
          promptVersion: REPLY_PROMPT_VERSION,
          length: parsed.length,
          targetLanguage: sanitizeOptionalText(parsed.targetLanguage, 32),
          escalation: parsed.escalation,
          inputTokens: generated.inputTokens,
          outputTokens: generated.outputTokens,
          estimatedCostUsd: generated.estimatedCostUsd,
          replyText: generated.text
        }
      })
    ]);

    await logAudit({
      workspaceId: parsed.workspaceId,
      reviewId: review.id,
      actorId: user.id,
      action: 'REVIEW_DRAFTED',
      metadata: {
        provider: parsed.provider,
        model: generated.model,
        role: membership.role
      }
    });

    await consumeGeneration(parsed.workspaceId);

    return NextResponse.json({
      reply: generated.text,
      usage: {
        inputTokens: generated.inputTokens,
        outputTokens: generated.outputTokens,
        estimatedCostUsd: generated.estimatedCostUsd
      },
      model: generated.model
    });
  } catch (error) {
    return jsonError(error);
  }
}
