import Link from 'next/link';
import { Logo } from '@/components/logo';
import { NewsletterForm } from '@/components/marketing/newsletter-form';
import { BLOG_POSTS } from '@/lib/marketing';

export function LandingPageView() {
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
      title: 'Unified inbox and filters',
      description: 'Filter instantly by status, rating, sentiment, source, tags, and date in one workspace-aware flow.'
    },
    {
      title: 'AI generation controls',
      description: 'Choose provider, length, language, and escalation rules for high quality response drafts.'
    },
    {
      title: 'Brand voice system',
      description: 'Apply tone, examples, do and do-not lists, and banned terms at workspace and location level.'
    },
    {
      title: 'Approval and compliance',
      description: 'Members draft, Admin and Owner approve, with full audit logs for every change.'
    },
    {
      title: 'Analytics and exports',
      description: 'Monitor rating trends, sentiment breakdown, top tags, and export CSV reply packs.'
    },
    {
      title: 'Billing and plan governance',
      description: 'Stripe and PayPal subscriptions with webhook sync, grace periods, and server-side limit enforcement.'
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
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-8">
        <Logo size="lg" />
        <nav className="hidden items-center gap-5 text-sm text-slate-300 md:flex">
          <Link href="#features" className="hover:text-white">
            Features
          </Link>
          <Link href="#pricing" className="hover:text-white">
            Pricing
          </Link>
          <Link href="#testimonials" className="hover:text-white">
            Testimonials
          </Link>
          <Link href="#blog" className="hover:text-white">
            Blog
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="btn btn-secondary">
            Sign in
          </Link>
          <Link href="/sign-up" className="btn btn-primary">
            Start free
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-12 px-6 pb-16 pt-4 md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-7">
          <span className="badge border-blue-500/40 bg-blue-500/10 px-3 py-1 text-blue-200">
            Built for agencies and multi-location SaaS operators
          </span>
          <h1 className="text-5xl font-bold leading-tight md:text-7xl">
            The AI Review Reply Manager that turns customer feedback into growth.
          </h1>
          <p className="max-w-2xl text-xl leading-8 text-slate-300">
            ReviewPilot helps teams draft better replies in seconds, enforce approval quality, and prove outcomes with
            analytics. One platform for inbox operations, brand consistency, exports, and subscriptions.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/sign-up" className="btn btn-primary">
              Create free workspace
            </Link>
            <Link href="/app" className="btn btn-secondary">
              Open live demo
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['+64%', 'faster draft turnaround'],
              ['12,000+', 'monthly replies generated'],
              ['92%', 'approval SLA hit rate']
            ].map(([metric, description]) => (
              <div key={metric} className="card p-6">
                <p className="text-3xl font-semibold">{metric}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="card overflow-hidden bg-slate-950/60">
          <div className="flex items-center justify-between border-b border-slate-800 p-4">
            <p className="text-sm text-slate-400">Live workflow terminal</p>
            <span className="badge border-emerald-500/30 bg-emerald-500/10 text-emerald-200">Connected</span>
          </div>
          <div className="space-y-4 p-6 font-mono text-xs text-slate-300">
            <p className="text-slate-400">$ reviewpilot generate --provider openai --length medium --escalation on</p>
            <p>
              [ok] Review imported from GOOGLE - Downtown Store
              <br />
              [ok] Sentiment detected: NEG
              <br />
              [ok] Tags suggested: slow-service, order-accuracy
            </p>
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
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

      <section className="mx-auto w-full max-w-7xl px-6 py-2">
        <div className="card p-5">
          <p className="text-center text-xs uppercase tracking-[0.14em] text-slate-400">
            Trusted workflow model: Manual imports first, API connectors next
          </p>
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-7xl px-6 py-14">
        <h2 className="text-3xl font-semibold md:text-4xl">Sales-ready feature set, not a toy dashboard</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {featureBlocks.map((feature) => (
            <article key={feature.title} className="card p-6">
              <h3 className="text-xl font-semibold">{feature.title}</h3>
              <p className="mt-3 text-base leading-7 text-slate-400">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-6">
        <div className="card p-8">
          <h2 className="text-3xl font-semibold">How teams win with ReviewPilot in 3 steps</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {[
              ['1. Import', 'Add reviews manually or upload CSV by source and location in minutes.'],
              ['2. Draft and approve', 'Generate AI replies, edit with brand voice guardrails, then approve.'],
              ['3. Publish and report', 'Export responses and show clients analytics progress each week.']
            ].map(([title, desc]) => (
              <div key={title} className="rounded-xl border border-slate-800 bg-slate-950/40 p-6">
                <p className="text-lg font-semibold">{title}</p>
                <p className="mt-3 text-base leading-7 text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto w-full max-w-7xl px-6 py-14">
        <h2 className="text-3xl font-semibold md:text-4xl">Packages built to convert and scale</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {pricing.map((plan) => (
            <article
              key={plan.name}
              className={`card p-7 ${plan.name === 'Pro' ? 'border-blue-500/50 ring-2 ring-blue-500/20' : ''}`}
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
              <p className="mt-2 text-base text-slate-400">{plan.subtitle}</p>
              <ul className="mt-5 space-y-3 text-base text-slate-200">
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

      <section id="testimonials" className="mx-auto w-full max-w-7xl px-6 py-8">
        <h2 className="text-3xl font-semibold md:text-4xl">Testimonials from operators and founders</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {testimonials.map((item) => (
            <article key={item.name} className="card p-7">
              <p className="text-base leading-8 text-slate-200">&quot;{item.quote}&quot;</p>
              <p className="mt-5 text-lg font-semibold">{item.name}</p>
              <p className="text-xs uppercase tracking-wide text-slate-400">{item.role}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="blog" className="mx-auto w-full max-w-7xl px-6 py-12">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold md:text-3xl">Latest blog insights</h2>
            <p className="mt-1 text-sm text-slate-400">
              Playbooks for AI review operations, agency workflows, and growth metrics.
            </p>
          </div>
          <Link href="/blog" className="btn btn-secondary">
            View all posts
          </Link>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {BLOG_POSTS.map((post) => (
            <article key={post.slug} className="card p-6">
              <div className="flex items-center justify-between">
                <span className="badge">{post.category}</span>
                <span className="text-xs text-slate-400">{post.readTime}</span>
              </div>
              <h3 className="mt-5 text-xl font-semibold">{post.title}</h3>
              <p className="mt-3 text-base leading-7 text-slate-400">{post.excerpt}</p>
              <div className="mt-5">
                <Link href={`/blog/${post.slug}`} className="text-sm font-medium text-blue-300">
                  Read article {'->'}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-8">
        <div className="card p-8">
          <h2 className="text-3xl font-semibold">Get growth tactics every week</h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-400">
            Join the ReviewPilot newsletter for new conversion playbooks, review response templates, and AI workflow
            optimization ideas.
          </p>
          <div className="mt-4">
            <NewsletterForm />
          </div>
        </div>
      </section>

      <footer className="mx-auto mt-10 w-full max-w-7xl border-t border-slate-800 px-6 py-8 text-sm text-slate-400">
        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-3 max-w-sm text-slate-400">
              ReviewPilot by ReplyZen helps teams transform customer reviews into consistent, on-brand replies that increase
              trust and retention.
            </p>
            <p className="mt-3 text-xs text-slate-500">Support: hello@reply-zen.com</p>
          </div>
          <div>
            <p className="font-semibold text-slate-200">Product</p>
            <div className="mt-2 grid gap-2">
              <Link href="#features" className="hover:text-white">
                Features
              </Link>
              <Link href="#pricing" className="hover:text-white">
                Pricing
              </Link>
              <Link href="/sign-in" className="hover:text-white">
                Sign in
              </Link>
            </div>
          </div>
          <div>
            <p className="font-semibold text-slate-200">Resources</p>
            <div className="mt-2 grid gap-2">
              <Link href="/blog" className="hover:text-white">
                Blog
              </Link>
              <Link href="/sample-reviews.csv" className="hover:text-white">
                CSV template
              </Link>
              <Link href="/http-examples.http" className="hover:text-white">
                API examples
              </Link>
            </div>
          </div>
          <div>
            <p className="font-semibold text-slate-200">Legal</p>
            <div className="mt-2 grid gap-2">
              <Link href="/privacy" className="hover:text-white">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-white">
                Terms
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-800 pt-4 text-xs text-slate-500">
          (c) {new Date().getFullYear()} ReviewPilot (ReplyZen). Built for modern review operations.
        </div>
      </footer>
    </main>
  );
}
