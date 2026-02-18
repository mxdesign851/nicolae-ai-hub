import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <Logo />
        <Link href="/" className="btn btn-secondary">
          Back home
        </Link>
      </div>
      <article className="card space-y-4 p-6 text-sm leading-6 text-slate-200">
        <h1 className="text-2xl font-semibold">Terms of Service (Template)</h1>
        <p>
          These terms govern usage of ReviewPilot (ReplyZen). This template is not legal advice and should be reviewed before
          commercial launch.
        </p>
        <h2 className="text-lg font-semibold">Acceptable use</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>No scraping or unauthorized collection of platform data.</li>
          <li>No harmful, illegal, or abusive content generation.</li>
          <li>Customers are responsible for final published replies.</li>
        </ul>
        <h2 className="text-lg font-semibold">Subscriptions and billing</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Billing is managed through Stripe and PayPal.</li>
          <li>Failed payments may trigger grace period then downgrade to Free.</li>
          <li>Plan limits are enforced server-side.</li>
        </ul>
        <h2 className="text-lg font-semibold">Disclaimer</h2>
        <p>
          AI-generated outputs are suggestions and may require editing for factual and legal accuracy before publishing.
        </p>
      </article>
    </main>
  );
}
