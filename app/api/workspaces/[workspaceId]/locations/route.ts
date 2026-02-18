import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireApiUserOrThrow } from '@/lib/api-auth';
import { assertLocationLimit, assertWorkspaceAccess } from '@/lib/tenant';
import { jsonError, HttpError } from '@/lib/http';
import { sanitizeOptionalText, sanitizeText } from '@/lib/sanitize';

const createLocationSchema = z.object({
  name: z.string().min(2).max(100),
  timezone: z.string().max(100).optional()
});

type Params = { params: { workspaceId: string } };

export async function GET(_: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    const locations = await prisma.location.findMany({
      where: { workspaceId: params.workspaceId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { reviews: true } } }
    });
    return NextResponse.json({ locations });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN]);

    const body = await request.json();
    const parsed = createLocationSchema.parse(body);
    await assertLocationLimit(params.workspaceId);

    const name = sanitizeText(parsed.name, 100);
    const timezone = sanitizeOptionalText(parsed.timezone, 100);

    const existing = await prisma.location.findUnique({
      where: { workspaceId_name: { workspaceId: params.workspaceId, name } }
    });
    if (existing) {
      throw new HttpError(409, 'Location with this name already exists');
    }

    const location = await prisma.location.create({
      data: {
        workspaceId: params.workspaceId,
        name,
        timezone
      }
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
