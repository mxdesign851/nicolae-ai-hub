import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function LandingPage() {
  const pricing = [
    {
      name: 'Free',
      price: '$0',
      subtitle: 'For early validation',
      features: ['1 workspace', '1 location', '50 AI generations/month', 'Basic templates']
    },
    {
      name: 'Pro',
      price: '$49',
      subtitle: 'For growing local brands',
      features: ['Up to 3 locations', '1,000 generations/month', 'Brand voice', 'Approval workflow']
    },
    {
      name: 'Agency',
      price: '$149',
      subtitle: 'For agencies & portfolios',
      features: ['Unlimited locations', '10,000 generations/month', 'Team roles + bulk tools', 'CSV exports + priority settings']
    }
  ];

  const featureBlocks = [
    {
      title: 'Inbox AI-first',
      description: 'Filter by status, rating, sentiment, source, tags, and date in one workspace-aware flow.'
    },
    {
      title: 'Brand voice controls',
      description: 'Set tone, do and do-not rules, banned words, and sign-off defaults per workspace or location.'
    },
    {
      title: 'Approval workflow',
      description: 'Members draft, Admin and Owner approve, with a full audit trail for every change.'
    },
    {
      title: 'Plan enforcement',
      description: 'Free, Pro, Agency limits are validated server-side for workspaces, locations, and AI usage.'
    },
    {
      title: 'Billing ready',
      description: 'Stripe and PayPal subscription flows with webhook status sync and downgrade grace periods.'
    },
    {
      title: 'Exports + analytics',
      description: 'Track rating trends, sentiment, top tags, and export selected replies as CSV when needed.'
    }
  ];

  const testimonials = [
    {
      quote: 'ReviewPilot cut our response time from two days to twenty minutes.',
      name: 'Irina M.',
      role: 'Agency Operator'
    },
    {
      quote: 'The approval flow finally stopped inconsistent tone across our 12 locations.',
      name: 'Alex T.',
      role: 'Operations Lead'
    },
    {
      quote: 'The export flow made client reporting a one-click weekly routine.',
      name: 'Radu P.',
      role: 'Founder'
    }
  ];

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="btn btn-secondary">
            Sign in
          </Link>
          <Link href="/sign-up" className="btn btn-primary">
            Start free
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-12 pt-8 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <span className="badge border-blue-500/40 bg-blue-500/10 text-blue-200">
            Multi-tenant AI review operations
          </span>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            Reply faster. Stay on-brand. Win trust at scale.
          </h1>
          <p className="max-w-2xl text-lg text-slate-300">
            ReviewPilot helps SaaS teams, local businesses, and agencies transform customer reviews into high-quality responses
            with AI generation, approvals, sentiment intelligence, and plan-aware operations.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/sign-up" className="btn btn-primary">
              Start free on reply-zen.com
            </Link>
            <Link href="/app" className="btn btn-secondary">
              Open app demo
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['+64%', 'faster first draft turnaround'],
              ['12,000+', 'monthly replies generated'],
              ['99.9%', 'workspace authorization coverage']
            ].map(([metric, description]) => (
              <div key={metric} className="card p-4">
                <p className="text-2xl font-semibold">{metric}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="card overflow-hidden bg-slate-950/60">
          <div className="flex items-center justify-between border-b border-slate-800 p-4">
            <p className="text-sm text-slate-400">Live generation terminal</p>
            <span className="badge border-emerald-500/30 bg-emerald-500/10 text-emerald-200">Connected</span>
          </div>
          <div className="space-y-3 p-4 font-mono text-xs text-slate-300">
            <p className="text-slate-400">$ reviewpilot generate --provider openai --length medium --escalation on</p>
            <p>
              [ok] Review imported from GOOGLE - Downtown Store
              <br />
              [ok] Sentiment detected: NEG
              <br />
              [ok] Tags suggested: slow-service, order-accuracy
            </p>
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
              <p className="text-slate-400">Draft output:</p>
              <p className="mt-2 leading-5">
                Thank you for sharing this feedback. We are truly sorry your order was delayed and incomplete. Please contact
                our support team directly so we can resolve this quickly and make things right.
              </p>
            </div>
            <p className="text-blue-200">[ok] Draft saved. Awaiting Admin approval...</p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <h2 className="text-2xl font-semibold md:text-3xl">Everything needed for review operations</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {featureBlocks.map((feature) => (
            <article key={feature.title} className="card p-5">
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-4">
        <div className="card p-6">
          <h2 className="text-2xl font-semibold">How it works in 3 steps</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              ['1. Import reviews', 'Add manual entries or upload CSV with source, rating, text, and location.'],
              ['2. Generate + edit', 'Use AI drafts with brand voice, then refine reply text and tags.'],
              ['3. Approve + export', 'Approve internally and export packs for publishing or client delivery.']
            ].map(([title, desc]) => (
              <div key={title} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="font-semibold">{title}</p>
                <p className="mt-2 text-sm text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <h2 className="text-2xl font-semibold md:text-3xl">Simple pricing for operators and agencies</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {pricing.map((plan) => (
            <article
              key={plan.name}
              className={`card p-5 ${plan.name === 'Pro' ? 'border-blue-500/50 ring-2 ring-blue-500/20' : ''}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xl font-semibold">{plan.name}</p>
                {plan.name === 'Pro' ? (
                  <span className="badge border-blue-500/40 bg-blue-500/10 text-blue-200">Most popular</span>
                ) : null}
              </div>
              <p className="mt-2 text-3xl font-bold">
                {plan.price}
                <span className="text-sm font-normal text-slate-400">/mo</span>
              </p>
              <p className="mt-1 text-sm text-slate-400">{plan.subtitle}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-200">
                {plan.features.map((feature) => (
                  <li key={feature}>- {feature}</li>
                ))}
              </ul>
              <div className="mt-5">
                <Link href="/sign-up" className={`btn w-full ${plan.name === 'Free' ? 'btn-secondary' : 'btn-primary'}`}>
                  Choose {plan.name}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-4">
        <h2 className="text-2xl font-semibold md:text-3xl">Teams love the speed and consistency</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {testimonials.map((item) => (
            <article key={item.name} className="card p-5">
              <p className="text-sm leading-6 text-slate-200">&quot;{item.quote}&quot;</p>
              <p className="mt-4 font-semibold">{item.name}</p>
              <p className="text-xs uppercase tracking-wide text-slate-400">{item.role}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-6 py-6 text-sm text-slate-400">
        <p>(c) {new Date().getFullYear()} ReviewPilot (ReplyZen)</p>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-slate-200">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-slate-200">
            Terms
          </Link>
        </div>
      </footer>
    </main>
  );
}
