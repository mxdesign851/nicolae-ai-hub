import Link from 'next/link';
import { Logo } from '@/components/logo';
import { SignInForm } from '@/components/auth/sign-in-form';

function mapAuthError(error?: string) {
  if (!error) return null;
  const readable: Record<string, string> = {
    CredentialsSignin: 'Invalid login credentials. Check your email and password.',
    AccessDenied: 'Access denied. Contact your administrator.',
    OAuthSignin: 'OAuth sign-in failed. Please try again.',
    OAuthCallback: 'OAuth callback failed. Please try again.',
    OAuthCreateAccount: 'Unable to create your OAuth account.',
    EmailCreateAccount: 'Unable to create your email account.',
    Callback: 'Authentication could not be completed.',
    OAuthAccountNotLinked: 'This OAuth account is not linked to your email.',
    SessionRequired: 'Your session has expired. Please sign in again.',
    Configuration: 'Authentication configuration is incomplete. Check NEXTAUTH variables.'
  };
  return readable[error] ?? 'An authentication error occurred.';
}

export default function SignInPage({
  searchParams
}: {
  searchParams?: { callbackUrl?: string; error?: string };
}) {
  const demoAccounts = [
    {
      label: 'Super Admin',
      email: 'superadmin@reply-zen.com',
      password: 'password123',
      badge: 'GLOBAL ADMIN'
    },
    {
      label: 'Premium Demo Owner',
      email: 'premium@reply-zen.com',
      password: 'password123',
      badge: 'AGENCY PLAN'
    },
    {
      label: 'Standard Owner',
      email: 'owner@example.com',
      password: 'password123',
      badge: 'PRO PLAN'
    }
  ];
  const authError = mapAuthError(searchParams?.error);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10">
      <div className="grid w-full gap-8 md:grid-cols-[1fr_440px]">
        <section className="space-y-5">
          <Logo />
          <h1 className="text-4xl font-semibold leading-tight">Welcome back to ReviewPilot</h1>
          <p className="max-w-xl text-slate-300">
            Sign in to manage review pipelines, AI-generated replies, approval workflows, and multi-tenant operations from one
            dashboard.
          </p>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>- Inbox + filters + sentiment tagging</li>
            <li>- Brand voice controls per workspace or location</li>
            <li>- Exports, analytics, billing, and role management</li>
          </ul>
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">
            <p className="font-semibold">Demo premium access included</p>
            <p className="mt-1 text-xs text-blue-200">
              Use the quick sign-in buttons on the right to load Super Admin and Premium demo credentials.
            </p>
          </div>
          {authError ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{authError}</div>
          ) : null}
        </section>
        <section className="card p-6">
          <h2 className="mb-4 text-2xl font-semibold">Sign in</h2>
          <SignInForm
            callbackUrl={searchParams?.callbackUrl || '/app'}
            demoAccounts={demoAccounts}
            initialError={authError}
          />
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
