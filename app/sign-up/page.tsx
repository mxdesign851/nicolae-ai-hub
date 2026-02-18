import Link from 'next/link';
import { Logo } from '@/components/logo';
import { SignUpForm } from '@/components/auth/sign-up-form';

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-10">
      <div className="grid w-full gap-8 md:grid-cols-[1fr_440px]">
        <section className="space-y-4">
          <Logo />
          <h1 className="text-4xl font-semibold leading-tight">Create your ReplyZen workspace</h1>
          <p className="max-w-xl text-slate-300">
            Start on Free, import customer reviews manually or via CSV, generate replies with AI, and scale to Pro/Agency when
            your volume grows.
          </p>
          <Link href="/terms" className="text-sm text-slate-400 hover:text-slate-300">
            By signing up you accept the Terms template.
          </Link>
        </section>
        <section className="card p-6">
          <h2 className="mb-4 text-2xl font-semibold">Start free</h2>
          <SignUpForm />
          <p className="mt-4 text-center text-sm text-slate-400">
            Already registered?{' '}
            <Link href="/sign-in" className="text-blue-300">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
