import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen px-8 py-20">
      <div className="mx-auto max-w-4xl space-y-8">
        <h1 className="text-5xl font-bold">AI Review Reply Manager</h1>
        <p className="text-lg text-slate-300">
          Production-ready multi-tenant SaaS to manage and generate high-quality customer review replies with brand voice,
          approvals, tags, sentiment, exports, and Stripe/PayPal subscriptions.
        </p>
        <div className="flex gap-4">
          <Link className="rounded bg-primary px-4 py-2 font-semibold" href="/reviews">
            Open Dashboard
          </Link>
          <Link className="rounded border border-border px-4 py-2" href="/billing">
            Billing
          </Link>
        </div>
      </div>
    </main>
  );
}
