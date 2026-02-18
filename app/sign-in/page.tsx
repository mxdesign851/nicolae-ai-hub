import Link from 'next/link';
import { Logo } from '@/components/logo';
import { SignInForm } from '@/components/auth/sign-in-form';

export default function SignInPage({ searchParams }: { searchParams?: { callbackUrl?: string } }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-10">
      <div className="grid w-full gap-8 md:grid-cols-[1fr_440px]">
        <section className="space-y-4">
          <Logo />
          <h1 className="text-4xl font-semibold leading-tight">Welcome back to ReviewPilot</h1>
          <p className="max-w-xl text-slate-300">
            Generate high-quality review replies with brand voice, approvals, and usage limits that keep every workspace
            organized.
          </p>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>- Inbox + filters + sentiment tagging</li>
            <li>- Member/Admin approval workflow</li>
            <li>- Stripe and PayPal subscriptions</li>
          </ul>
        </section>
        <section className="card p-6">
          <h2 className="mb-4 text-2xl font-semibold">Sign in</h2>
          <SignInForm callbackUrl={searchParams?.callbackUrl || '/app'} />
          <p className="mt-4 text-center text-sm text-slate-400">
            No account yet?{' '}
            <Link href="/sign-up" className="text-blue-300">
              Create one
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
