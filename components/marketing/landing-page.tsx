import Image from 'next/image';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { NewsletterForm } from '@/components/marketing/newsletter-form';
import { BLOG_POSTS } from '@/lib/marketing';

export function LandingPageView() {
  const packages = [
    {
      name: 'Starter',
      price: '$0',
      subtitle: 'Best for validating the first location',
      features: ['1 workspace', '1 location', '50 AI generations/month', 'Basic templates']
    },
    {
      name: 'Growth',
      price: '$49',
      subtitle: 'Best for growing local brands',
      features: ['Up to 3 locations', '1,000 generations/month', 'Brand voice', 'Approval workflow']
    },
    {
      name: 'Scale',
      price: '$149',
      subtitle: 'Best for agencies and multi-client operations',
      features: ['Unlimited locations', '10,000 generations/month', 'Team roles + bulk tools', 'CSV exports + priority settings']
    }
  ];

  const featureCards = [
    {
      title: 'Unified inbox and filters',
      description: 'Filter by status, sentiment, tags, source, date, and rating from one queue.',
      image: '/screenshots/replyzen-inbox.svg'
    },
    {
      title: 'AI generation controls',
      description: 'Choose provider, length, language, and escalation rules for draft quality.',
      image: '/screenshots/replyzen-workflow.svg'
    },
    {
      title: 'Brand voice system',
      description: 'Apply tone, examples, do and do-not lists, and banned terms.',
      image: '/screenshots/replyzen-workflow.svg'
    },
    {
      title: 'Approval and compliance',
      description: 'Members draft, Admin and Owner approve, with full audit logs for every change.',
      image: '/screenshots/replyzen-workflow.svg'
    },
    {
      title: 'Analytics and exports',
      description: 'Track trends and export response packs for clients and teams.',
      image: '/screenshots/replyzen-analytics.svg'
    },
    {
      title: 'Billing and plan governance',
      description: 'Stripe and PayPal subscriptions with webhook sync and plan limit enforcement.',
      image: '/screenshots/replyzen-analytics.svg'
    }
  ];

  const testimonials = [
    {
      quote: 'ReplyZen cut our response time from two days to twenty minutes.',
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

  const statCards = [
    ['+64%', 'faster draft turnaround'],
    ['12,000+', 'replies generated monthly'],
    ['92%', 'approval SLA hit rate'],
    ['4.8/5', 'average quality score']
  ];

  return (
    <main className="landing-theme min-h-screen">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-8 md:py-10">
        <Logo size="lg" />
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link href="#features" className="landing-nav-link">
            Features
          </Link>
          <Link href="#packages" className="landing-nav-link">
            Packages
          </Link>
          <Link href="#pricing" className="landing-nav-link">
            Pricing
          </Link>
          <Link href="#testimonials" className="landing-nav-link">
            Testimonials
          </Link>
          <Link href="#blog" className="landing-nav-link">
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

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-6 pb-16 pt-2 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="space-y-7">
          <span className="landing-chip">AI review ops for agencies and multi-location brands</span>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl lg:text-7xl">
            Turn every review into a
            <br />
            clear, on-brand reply
            <br />
            in minutes.
          </h1>
          <p className="landing-muted max-w-2xl text-lg leading-8 md:text-xl">
            ReplyZen gives your team one structured workflow for drafting, approving, exporting, and tracking review replies.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/sign-up" className="btn btn-primary">
              Create free workspace
            </Link>
            <Link href="/sign-in" className="btn btn-secondary">
              Open demo accounts
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {statCards.map(([metric, description]) => (
              <div key={metric} className="landing-card p-7">
                <p className="text-4xl font-semibold md:text-5xl">{metric}</p>
                <p className="landing-muted mt-2 text-sm uppercase tracking-[0.14em]">{description}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="landing-card overflow-hidden">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <p className="landing-muted text-sm">Live inbox snapshot</p>
            <span className="landing-chip">Realtime</span>
          </div>
          <div className="p-6">
            <Image
              src="/screenshots/replyzen-inbox.svg"
              alt="ReplyZen inbox preview"
              width={960}
              height={680}
              className="h-auto w-full rounded-xl border border-slate-200"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-2">
        <div className="landing-card p-7">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-lg font-semibold">Step 1: Capture reviews</p>
              <p className="landing-muted mt-2 text-base">Manual entry or CSV import from all major sources.</p>
            </div>
            <div>
              <p className="text-lg font-semibold">Step 2: Generate drafts</p>
              <p className="landing-muted mt-2 text-base">AI drafts follow tone rules and escalation instructions.</p>
            </div>
            <div>
              <p className="text-lg font-semibold">Step 3: Approve and export</p>
              <p className="landing-muted mt-2 text-base">Role-based approvals, then copy or export as CSV packs.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-7xl px-6 py-16">
        <h2 className="max-w-4xl text-3xl font-semibold leading-tight md:text-5xl">
          Product sections built for real teams, not just a marketing demo.
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {featureCards.map((feature) => (
            <article key={feature.title} className="landing-card p-6 md:p-7">
              <Image
                src={feature.image}
                alt={`${feature.title} preview`}
                width={720}
                height={420}
                className="h-auto w-full rounded-lg border border-slate-200"
              />
              <h3 className="mt-5 text-xl font-semibold">{feature.title}</h3>
              <p className="landing-muted mt-3 text-base leading-7">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="packages" className="mx-auto w-full max-w-7xl px-6 py-6">
        <div className="landing-card p-8 md:p-10">
          <h2 className="text-3xl font-semibold md:text-4xl">Functional packs for every business stage</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              ['Operations Pack', 'Inbox filtering, source imports, and AI-assisted reply drafting controls.'],
              ['Quality Pack', 'Brand voice consistency, role-based approvals, and audit visibility.'],
              ['Growth Pack', 'Analytics trends, exports, and subscription-ready team scale controls.']
            ].map(([title, desc]) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white/70 p-7">
                <p className="text-lg font-semibold">{title}</p>
                <p className="landing-muted mt-3 text-base leading-7">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto w-full max-w-7xl px-6 py-16">
        <h2 className="text-3xl font-semibold md:text-5xl">Pricing that scales from one location to full agency ops</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {packages.map((plan) => (
            <article
              key={plan.name}
              className={`landing-card p-8 md:p-9 ${plan.name === 'Growth' ? 'landing-card-highlight' : ''}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xl font-semibold">{plan.name}</p>
                {plan.name === 'Growth' ? (
                  <span className="landing-chip">Most popular</span>
                ) : null}
              </div>
              <p className="mt-2 text-3xl font-bold">
                {plan.price}
                <span className="text-sm font-normal text-slate-400">/mo</span>
              </p>
              <p className="landing-muted mt-2 text-base">{plan.subtitle}</p>
              <ul className="mt-5 space-y-3 text-base">
                {plan.features.map((feature) => (
                  <li key={feature}>- {feature}</li>
                ))}
              </ul>
              <div className="mt-5">
                <Link href="/sign-up" className={`btn w-full ${plan.name === 'Starter' ? 'btn-secondary' : 'btn-primary'}`}>
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
            <article key={item.name} className="landing-card p-7">
              <p className="text-base leading-8">&quot;{item.quote}&quot;</p>
              <p className="mt-5 text-lg font-semibold">{item.name}</p>
              <p className="landing-muted text-xs uppercase tracking-wide">{item.role}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-8">
        <div className="landing-terminal p-7 md:p-8">
          <p className="landing-terminal-line">$ replyzen generate --workspace agency-hub --source google --tone warm-professional</p>
          <p className="landing-terminal-output">Generating AI drafts for 18 new reviews...</p>
          <p className="landing-terminal-output">Applied brand voice profile: &quot;Agency Master Voice v3&quot;.</p>
          <p className="landing-terminal-output">Queued 7 items for Admin approval. Export pack ready.</p>
        </div>
      </section>

      <section id="blog" className="mx-auto w-full max-w-7xl px-6 py-12">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold md:text-3xl">Latest blog insights</h2>
            <p className="landing-muted mt-1 text-sm">
              Playbooks for AI review operations, agency workflows, and growth metrics.
            </p>
          </div>
          <Link href="/blog" className="btn btn-secondary">
            View all posts
          </Link>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {BLOG_POSTS.map((post) => (
            <article key={post.slug} className="landing-card p-6">
              <div className="flex items-center justify-between">
                <span className="landing-chip">{post.category}</span>
                <span className="landing-muted text-xs">{post.readTime}</span>
              </div>
              <h3 className="mt-5 text-xl font-semibold">{post.title}</h3>
              <p className="landing-muted mt-3 text-base leading-7">{post.excerpt}</p>
              <div className="mt-5">
                <Link href={`/blog/${post.slug}`} className="text-sm font-medium text-blue-600">
                  Read article {'>'}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-8">
        <div className="landing-card p-8">
          <h2 className="text-3xl font-semibold">Get growth tactics every week</h2>
          <p className="landing-muted mt-3 max-w-2xl text-base leading-7">
            Join the ReplyZen newsletter for new conversion playbooks, review response templates, and AI workflow
            optimization ideas.
          </p>
          <div className="mt-4">
            <NewsletterForm />
          </div>
        </div>
      </section>

      <footer className="mx-auto mt-10 w-full max-w-7xl border-t px-6 py-8 text-sm">
        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <Logo />
            <p className="landing-muted mt-3 max-w-sm">
              ReplyZen helps teams transform customer reviews into consistent, on-brand replies that increase trust and
              retention.
            </p>
            <p className="landing-muted mt-3 text-xs">Support: hello@reply-zen.com</p>
          </div>
          <div>
            <p className="font-semibold">Product</p>
            <div className="mt-2 grid gap-2">
              <Link href="#features" className="landing-footer-link">
                Features
              </Link>
              <Link href="#pricing" className="landing-footer-link">
                Pricing
              </Link>
              <Link href="/sign-in" className="landing-footer-link">
                Sign in
              </Link>
            </div>
          </div>
          <div>
            <p className="font-semibold">Resources</p>
            <div className="mt-2 grid gap-2">
              <Link href="/blog" className="landing-footer-link">
                Blog
              </Link>
              <Link href="/sample-reviews.csv" className="landing-footer-link">
                CSV template
              </Link>
              <Link href="/http-examples.http" className="landing-footer-link">
                API examples
              </Link>
            </div>
          </div>
          <div>
            <p className="font-semibold">Legal</p>
            <div className="mt-2 grid gap-2">
              <Link href="/privacy" className="landing-footer-link">
                Privacy
              </Link>
              <Link href="/terms" className="landing-footer-link">
                Terms
              </Link>
            </div>
          </div>
        </div>
        <div className="landing-muted mt-8 border-t pt-4 text-xs">
          (c) {new Date().getFullYear()} ReplyZen. Built for modern review operations.
        </div>
      </footer>
    </main>
  );
}
