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
          <span className="badge border-blue-500/40 bg-blue-500/10 text-blue-200">Multi-tenant AI review operations</span>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            Convert every customer review into a branded, high-quality reply.
          </h1>
          <p className="max-w-2xl text-lg text-slate-300">
            ReviewPilot helps teams and agencies draft, approve, and export review responses for Google, Facebook, Yelp, and
            Trustpilot manual imports with AI-driven quality and workflow controls.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/sign-up" className="btn btn-primary">
              Launch on reply-zen.com
            </Link>
            <Link href="/app" className="btn btn-secondary">
              Open app demo
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['AI Drafts', 'OpenAI live + Claude/Gemini stubs'],
              ['Approval Flow', 'Member drafts, admin approves'],
              ['Usage Control', 'Plan limits enforced server-side']
            ].map(([title, desc]) => (
              <div key={title} className="card p-4">
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-sm text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="card overflow-hidden">
          <div className="border-b border-slate-800 p-4">
            <p className="text-sm text-slate-400">Inbox preview</p>
          </div>
          <div className="space-y-3 p-4">
            {['"Great team and fast support!"', '"Order arrived late and damaged."', '"Friendly staff but checkout was slow."'].map(
              (item, idx) => (
                <div key={item} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                  <p className="text-xs text-slate-400">Review #{idx + 1}</p>
                  <p className="mt-1 text-sm">{item}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                    <span className="badge">{idx === 1 ? 'NEG' : 'POS'}</span>
                    <span className="badge">{idx === 1 ? 'needs-followup' : 'service'}</span>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <h2 className="text-2xl font-semibold md:text-3xl">Simple pricing for operators and agencies</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {pricing.map((plan) => (
            <article key={plan.name} className="card p-5">
              <p className="text-xl font-semibold">{plan.name}</p>
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
