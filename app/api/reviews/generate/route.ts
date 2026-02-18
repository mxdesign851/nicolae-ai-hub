import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assertWorkspaceAccess, assertGenerationLimit, consumeGeneration } from '@/lib/tenant';
import { buildReplyPrompt, generateText } from '@/lib/ai';

const schema = z.object({
  userId: z.string(),
  workspaceId: z.string(),
  reviewId: z.string(),
  provider: z.enum(['openai', 'claude', 'gemini']),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
  targetLanguage: z.string().optional(),
  escalation: z.boolean().default(true)
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await assertWorkspaceAccess(parsed.data.userId, parsed.data.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
  await assertGenerationLimit(parsed.data.workspaceId);

  const review = await prisma.review.findUniqueOrThrow({
    where: { id: parsed.data.reviewId },
    include: { location: { include: { brandVoice: true } }, workspace: { include: { brandVoice: true } } }
  });

  const brandVoice = review.location.brandVoice ?? review.workspace.brandVoice;
  const prompt = buildReplyPrompt({
    reviewText: review.text,
    rating: review.rating,
    source: review.source,
    length: parsed.data.length,
    targetLanguage: parsed.data.targetLanguage,
    escalation: parsed.data.escalation,
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

  const reply = await generateText({ provider: parsed.data.provider, prompt });

  await prisma.review.update({ where: { id: review.id }, data: { aiReplyDraft: reply, status: 'DRAFTED' } });
  await consumeGeneration(parsed.data.workspaceId);

  return NextResponse.json({ reply });
}
