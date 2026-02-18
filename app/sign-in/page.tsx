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
    Configuration: 'Authentication is misconfigured. Set APP_URL and NEXTAUTH_URL to your public domain.'
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
    <main className="landing-theme min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10 md:py-14">
        <div className="grid w-full gap-8 md:grid-cols-[1fr_440px]">
          <section className="space-y-5">
            <Logo />
            <h1 className="text-4xl font-semibold leading-tight">Welcome back to ReplyZen</h1>
            <p className="landing-muted max-w-xl text-base leading-7">
              Sign in to manage review pipelines, AI-generated replies, approval workflows, and multi-tenant operations from one
              dashboard.
            </p>
            <ul className="landing-muted space-y-2 text-sm">
              <li>- Inbox + filters + sentiment tagging</li>
              <li>- Brand voice controls per workspace or location</li>
              <li>- Exports, analytics, billing, and role management</li>
            </ul>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
              <p className="font-semibold">Demo premium access included</p>
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-200">
                Use the quick sign-in buttons on the right to load Super Admin and Premium demo credentials.
              </p>
            </div>
            {authError ? (
              <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                {authError}
              </div>
            ) : null}
          </section>
          <section className="landing-card p-6 md:p-7">
            <h2 className="mb-4 text-2xl font-semibold">Sign in</h2>
            <SignInForm
              callbackUrl={searchParams?.callbackUrl || '/app'}
              demoAccounts={demoAccounts}
              initialError={authError}
            />
            <p className="landing-muted mt-4 text-center text-sm">
              No account yet?{' '}
              <Link href="/sign-up" className="text-blue-600">
                Create one
              </Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
