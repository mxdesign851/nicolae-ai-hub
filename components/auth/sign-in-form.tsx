'use client';

import { FormEvent, useState, useTransition } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function SignInForm({ callbackUrl = '/app' }: { callbackUrl?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
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
      <div>
        <label className="mb-1 block text-sm text-slate-300">Email</label>
        <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm text-slate-300">Password</label>
        <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:opacity-60">
        {pending ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
