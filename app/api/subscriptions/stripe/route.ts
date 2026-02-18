import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });

const schema = z.object({ workspaceId: z.string(), customerEmail: z.string().email(), priceId: z.string() });

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: parsed.data.customerEmail,
    line_items: [{ price: parsed.data.priceId, quantity: 1 }],
    success_url: `${process.env.APP_URL}/billing?success=1`,
    cancel_url: `${process.env.APP_URL}/billing?cancel=1`
  });

  await prisma.subscription.upsert({
    where: { workspaceId: parsed.data.workspaceId },
    create: {
      workspaceId: parsed.data.workspaceId,
      provider: 'stripe',
      externalId: session.id,
      status: session.status ?? 'open'
    },
    update: { externalId: session.id, status: session.status ?? 'open', provider: 'stripe' }
  });

  return NextResponse.json({ checkoutUrl: session.url });
}
