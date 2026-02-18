'use client';

import { Plan, Subscription, SubscriptionStatus } from '@prisma/client';
import { useState, useTransition } from 'react';

type Props = {
  workspaceId: string;
  currentPlan: Plan;
  subscription: Subscription | null;
};

const prices = {
  FREE: '$0',
  PRO: '$49',
  AGENCY: '$149'
};

const featureMap: Record<Plan, string[]> = {
  FREE: ['1 workspace', '1 location', '50 AI generations/month', 'Basic templates'],
  PRO: ['3 locations', '1,000 AI generations/month', 'Brand voice', 'Approval workflow'],
  AGENCY: ['Unlimited locations', '10,000 AI generations/month', 'Team roles', 'Exports + priority settings']
};

export function BillingPanel({ workspaceId, currentPlan, subscription }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function openStripeCheckout(plan: 'PRO' | 'AGENCY') {
    const response = await fetch('/api/subscriptions/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, action: 'checkout', plan })
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || 'Unable to start Stripe checkout');
    window.location.href = json.checkoutUrl;
  }

  async function openPayPalCheckout(plan: 'PRO' | 'AGENCY') {
    const response = await fetch('/api/subscriptions/paypal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, plan })
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || 'Unable to start PayPal subscription');
    if (!json.approvalUrl) throw new Error('PayPal approval URL missing');
    window.location.href = json.approvalUrl;
  }

  async function openStripePortal() {
    const response = await fetch('/api/subscriptions/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, action: 'portal' })
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || 'Unable to open Stripe portal');
    window.location.href = json.url;
  }

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <h2 className="text-xl font-semibold">Current subscription</h2>
        <p className="mt-2 text-sm text-slate-300">
          Plan: <span className="font-medium">{currentPlan}</span>
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Status: {subscription?.status ?? 'No subscription'}
          {subscription?.currentPeriodEnd ? ` - Renews ${new Date(subscription.currentPeriodEnd).toISOString().slice(0, 10)}` : ''}
        </p>
        {subscription?.status === 'PAST_DUE' || subscription?.status === 'UNPAID' ? (
          <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Payment issue detected. Workspace will downgrade after grace period if unresolved.
          </p>
        ) : null}
        {subscription?.provider === 'STRIPE' ? (
          <button
            className="btn btn-secondary mt-4"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                setNotice(null);
                try {
                  await openStripePortal();
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Unable to open portal');
                }
              })
            }
          >
            Open Stripe customer portal
          </button>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {(Object.keys(prices) as Plan[]).map((plan) => (
          <article key={plan} className="card p-4">
            <p className="text-lg font-semibold">{plan}</p>
            <p className="mt-1 text-2xl font-bold">
              {prices[plan]}
              <span className="text-sm font-normal text-slate-400">/mo</span>
            </p>
            <ul className="mt-3 space-y-1 text-sm text-slate-300">
              {featureMap[plan].map((feature) => (
                <li key={feature}>- {feature}</li>
              ))}
            </ul>
            {plan === 'FREE' ? (
              <p className="mt-4 text-xs text-slate-500">Default plan</p>
            ) : (
              <div className="mt-4 grid gap-2">
                <button
                  disabled={pending}
                  className="btn btn-primary"
                  onClick={() =>
                    startTransition(async () => {
                      setError(null);
                      setNotice(null);
                      try {
                        await openStripeCheckout(plan);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Stripe checkout error');
                      }
                    })
                  }
                >
                  Pay with Stripe
                </button>
                <button
                  disabled={pending}
                  className="btn btn-secondary"
                  onClick={() =>
                    startTransition(async () => {
                      setError(null);
                      setNotice(null);
                      try {
                        await openPayPalCheckout(plan);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'PayPal checkout error');
                      }
                    })
                  }
                >
                  Pay with PayPal
                </button>
              </div>
            )}
          </article>
        ))}
      </section>
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
