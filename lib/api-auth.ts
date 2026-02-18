import { HttpError } from '@/lib/http';
import { requireApiUser } from '@/lib/session';

export async function requireApiUserOrThrow() {
  const user = await requireApiUser();
  if (!user) {
    throw new HttpError(401, 'Unauthorized');
  }
  return user;
}
