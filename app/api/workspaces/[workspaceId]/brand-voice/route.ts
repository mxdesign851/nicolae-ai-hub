import { NextResponse } from 'next/server';
import { Role, Tone } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireApiUserOrThrow } from '@/lib/api-auth';
import { assertFeature, assertWorkspaceAccess } from '@/lib/tenant';
import { HttpError, jsonError } from '@/lib/http';
import { sanitizeOptionalText, sanitizeText } from '@/lib/sanitize';
import { logAudit } from '@/lib/audit';

const schema = z.object({
  locationId: z.string().optional(),
  tone: z.nativeEnum(Tone).default(Tone.PROFESSIONAL),
  doList: z.array(z.string().max(200)).max(20).default([]),
  dontList: z.array(z.string().max(200)).max(20).default([]),
  examples: z.array(z.string().max(400)).max(10).default([]),
  bannedWords: z.array(z.string().max(80)).max(30).default([]),
  signOff: z.string().max(120).optional()
});

type Params = { params: { workspaceId: string } };

export async function GET(_: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    const [workspaceVoice, locationVoices] = await Promise.all([
      prisma.brandVoice.findUnique({ where: { workspaceId: params.workspaceId } }),
      prisma.brandVoice.findMany({
        where: { location: { workspaceId: params.workspaceId } },
        include: { location: { select: { id: true, name: true } } }
      })
    ]);
    return NextResponse.json({ workspaceVoice, locationVoices });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN]);
    await assertFeature(params.workspaceId, 'hasBrandVoice');

    const body = await request.json();
    const parsed = schema.parse(body);

    const cleaned = {
      tone: parsed.tone,
      doList: parsed.doList.map((item) => sanitizeText(item, 200)).filter(Boolean),
      dontList: parsed.dontList.map((item) => sanitizeText(item, 200)).filter(Boolean),
      examples: parsed.examples.map((item) => sanitizeText(item, 400)).filter(Boolean),
      bannedWords: parsed.bannedWords.map((item) => sanitizeText(item, 80)).filter(Boolean),
      signOff: sanitizeOptionalText(parsed.signOff, 120)
    };

    if (parsed.locationId) {
      const location = await prisma.location.findUnique({ where: { id: parsed.locationId } });
      if (!location || location.workspaceId !== params.workspaceId) {
        throw new HttpError(404, 'Location not found');
      }
    }

    const updated = await prisma.brandVoice.upsert({
      where: parsed.locationId ? { locationId: parsed.locationId } : { workspaceId: params.workspaceId },
      create: {
        workspaceId: parsed.locationId ? null : params.workspaceId,
        locationId: parsed.locationId ?? null,
        ...cleaned
      },
      update: cleaned
    });

    await logAudit({
      workspaceId: params.workspaceId,
      actorId: user.id,
      action: 'BRAND_VOICE_UPDATED',
      metadata: { locationId: parsed.locationId ?? null, tone: parsed.tone }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return jsonError(error);
  }
}
