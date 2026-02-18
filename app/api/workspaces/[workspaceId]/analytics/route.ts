import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { getWorkspaceAnalytics } from '@/lib/analytics';
import { requireApiUserOrThrow } from '@/lib/api-auth';
import { assertWorkspaceAccess } from '@/lib/tenant';
import { jsonError } from '@/lib/http';

type Params = { params: { workspaceId: string } };

export async function GET(_: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    const data = await getWorkspaceAnalytics(params.workspaceId);
    return NextResponse.json(data);
  } catch (error) {
    return jsonError(error);
  }
}
