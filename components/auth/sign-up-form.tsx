'use client';

import Link from 'next/link';
import { FormEvent, useState, useTransition } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function SignUpForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const json = await response.json();
      if (!response.ok) {
        setError(json.error || 'Unable to create account');
        return;
      }

      await signIn('credentials', { email: form.email, password: form.password, redirect: false });
      setSuccess('Account created.');
      router.push('/app');
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm text-slate-300">Name</label>
        <input
          className="input"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Jane"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-slate-300">Email</label>
        <input
          className="input"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          placeholder="owner@example.com"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-slate-300">Password</label>
        <input
          className="input"
          type="password"
          required
          minLength={8}
          value={form.password}
          onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
        />
      </div>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-300">{success}</p> : null}
      <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:opacity-60">
        {pending ? 'Creating account...' : 'Create account'}
      </button>
      <p className="text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link href="/sign-in" className="text-blue-300">
          Sign in
        </Link>
      </p>
    </form>
  );
}
