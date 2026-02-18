import { NextResponse } from 'next/server';
import { ReviewSource, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireApiUserOrThrow } from '@/lib/api-auth';
import { assertWorkspaceAccess } from '@/lib/tenant';
import { jsonError } from '@/lib/http';
import { sanitizeText } from '@/lib/sanitize';

const schema = z.object({
  provider: z.nativeEnum(ReviewSource),
  displayName: z.string().min(2).max(80)
});

type Params = { params: { workspaceId: string } };

export async function GET(_: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    const sources = await prisma.sourceConnection.findMany({
      where: { workspaceId: params.workspaceId },
      orderBy: { provider: 'asc' }
    });
    return NextResponse.json({ sources });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN]);
    const body = await request.json();
    const parsed = schema.parse(body);

    const source = await prisma.sourceConnection.create({
      data: {
        workspaceId: params.workspaceId,
        provider: parsed.provider,
        displayName: sanitizeText(parsed.displayName, 80),
        status: 'MANUAL'
      }
    });
    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
