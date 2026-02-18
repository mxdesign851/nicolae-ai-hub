import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const schema = z.object({ workspaceId: z.string(), planId: z.string() });

async function createPayPalSubscription(planId: string) {
  const base = process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const tokenJson = await tokenRes.json();

  const subRes = await fetch(`${base}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      plan_id: planId,
      application_context: {
        return_url: `${process.env.APP_URL}/billing?paypal=success`,
        cancel_url: `${process.env.APP_URL}/billing?paypal=cancel`
      }
    })
  });
  return subRes.json();
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const subscription = await createPayPalSubscription(parsed.data.planId);

  await prisma.subscription.upsert({
    where: { workspaceId: parsed.data.workspaceId },
    create: {
      workspaceId: parsed.data.workspaceId,
      provider: 'paypal',
      externalId: subscription.id,
      status: subscription.status || 'APPROVAL_PENDING'
    },
    update: { provider: 'paypal', externalId: subscription.id, status: subscription.status || 'APPROVAL_PENDING' }
  });

  const approve = subscription.links?.find((link: { rel: string }) => link.rel === 'approve')?.href;
  return NextResponse.json({ approvalUrl: approve, subscriptionId: subscription.id });
}
