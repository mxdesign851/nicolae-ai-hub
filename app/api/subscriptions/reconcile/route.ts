import { NextResponse } from 'next/server';
import { downgradeExpiredSubscriptions } from '@/lib/billing';
import { HttpError, jsonError } from '@/lib/http';

export async function POST(request: Request) {
  try {
    const expected = process.env.CRON_SECRET;
    if (expected) {
      const provided = request.headers.get('x-cron-secret');
      if (!provided || provided !== expected) {
        throw new HttpError(401, 'Unauthorized');
      }
    }

    const downgraded = await downgradeExpiredSubscriptions();
    return NextResponse.json({ downgraded });
  } catch (error) {
    return jsonError(error);
  }
}
