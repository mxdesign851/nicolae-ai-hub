'use client';

import { FormEvent, useState, useTransition } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type DemoAccount = {
  label: string;
  email: string;
  password: string;
  badge?: string;
};

type SignInFormProps = {
  callbackUrl?: string;
  demoAccounts?: DemoAccount[];
  initialError?: string | null;
};

export function SignInForm({ callbackUrl = '/app', demoAccounts = [], initialError = null }: SignInFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(initialError);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        setError('Invalid credentials');
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {demoAccounts.length ? (
        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Quick demo sign in</p>
          <div className="grid gap-2">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-left text-xs hover:border-blue-500/40 hover:bg-slate-800"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                  setInfo(`Loaded ${account.label} credentials.`);
                }}
              >
                <span>
                  <span className="font-semibold text-slate-100">{account.label}</span>
                  <span className="ml-2 text-slate-400">{account.email}</span>
                </span>
                {account.badge ? <span className="badge text-[10px]">{account.badge}</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <label className="mb-1 block text-sm text-slate-300">Email</label>
        <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm text-slate-300">Password</label>
        <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {info ? <p className="text-xs text-blue-300">{info}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:opacity-60">
        {pending ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
