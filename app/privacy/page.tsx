import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <Logo />
        <Link href="/" className="btn btn-secondary">
          Back home
        </Link>
      </div>
      <article className="card space-y-4 p-6 text-sm leading-6 text-slate-200">
        <h1 className="text-2xl font-semibold">Privacy Policy (Template)</h1>
        <p>
          ReplyZen is committed to protecting customer and workspace data. This template should be reviewed by legal counsel
          before production use.
        </p>
        <h2 className="text-lg font-semibold">Data we process</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Account identity details: email, name, hashed password.</li>
          <li>Workspace content: reviews, tags, replies, and workflow events.</li>
          <li>Optional psychosocial profile records for beneficiaries, only when lawful consent is documented.</li>
          <li>Billing metadata from Stripe or PayPal subscriptions.</li>
        </ul>
        <h2 className="text-lg font-semibold">How data is used</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Provide AI reply generation and workflow features.</li>
          <li>Provide orientative psychosocial support reports and archival PDF case sheets (non-diagnostic use).</li>
          <li>Enforce workspace plan limits and security controls.</li>
          <li>Support billing, analytics, and account operations.</li>
        </ul>
        <h2 className="text-lg font-semibold">Retention and security</h2>
        <p>
          Data is stored in a managed PostgreSQL database and protected with server-side authorization checks. Access keys are
          stored only on the server.
        </p>
        <h2 className="text-lg font-semibold">Contact</h2>
        <p>For privacy requests, contact: privacy@reply-zen.com</p>
      </article>
    </main>
  );
}
