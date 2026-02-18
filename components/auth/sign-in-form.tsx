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

function mapClientSignInError(code?: string | null) {
  if (!code) return 'Sign in failed. Please try again.';
  if (code === 'CredentialsSignin') return 'Invalid credentials. Check email/password or phone OTP code.';
  if (code === 'Configuration') return 'Authentication is misconfigured. Contact support.';
  if (code === 'AccessDenied') return 'Access denied. Contact your administrator.';
  return 'Sign in failed. Please try again.';
}

export function SignInForm({ callbackUrl = '/app', demoAccounts = [], initialError = null }: SignInFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'password' | 'phone'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpDebugHint, setOtpDebugHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputClassName =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100';

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setOtpDebugHint(null);
    startTransition(async () => {
      try {
        if (mode === 'password') {
          if (!email.trim() || !password) {
            setError('Email and password are required.');
            return;
          }
        } else if (!phoneNumber.trim() || !otpCode.trim()) {
          setError('Phone number and OTP code are required.');
          return;
        }

        const result =
          mode === 'password'
            ? await signIn('credentials', {
                email,
                password,
                redirect: false
              })
            : await signIn('phone-otp', {
                phoneNumber,
                code: otpCode,
                redirect: false
              });

        if (result?.error) {
          setError(mapClientSignInError(result.error));
          return;
        }

        if (!result?.ok) {
          setError('Sign in failed. Please try again.');
          return;
        }

        router.push(callbackUrl);
        router.refresh();
      } catch (submitError) {
        console.error('[sign-in] Sign in request failed', submitError);
        setError('Sign in failed due to a network issue. Please retry.');
      }
    });
  };

  const requestPhoneCode = () => {
    setError(null);
    setInfo(null);
    setOtpDebugHint(null);
    startTransition(async () => {
      try {
        if (!phoneNumber.trim()) {
          setError('Phone number is required.');
          return;
        }

        const response = await fetch('/api/auth/phone/request-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber })
        });
        const json = await response.json();
        if (!response.ok) {
          setError(json.error || 'Unable to send phone code.');
          return;
        }

        setInfo(json.message || 'If your phone exists in the system, a code was sent.');
        if (json.debugCode) {
          setOtpDebugHint(`DEV code: ${json.debugCode}`);
        }
      } catch (requestError) {
        console.error('[sign-in] Request phone code failed', requestError);
        setError('Could not request phone code. Try again.');
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900/60">
        <button
          type="button"
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            mode === 'password'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          onClick={() => {
            setMode('password');
            setError(null);
            setInfo(null);
          }}
        >
          Email + Password
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            mode === 'phone'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          onClick={() => {
            setMode('phone');
            setError(null);
            setInfo(null);
          }}
        >
          Phone + Code (OTP)
        </button>
      </div>

      {demoAccounts.length ? (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-900/60">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Quick demo sign in</p>
          <div className="grid gap-2">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs hover:border-blue-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-blue-500/40 dark:hover:bg-slate-800"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                  setInfo(`Loaded ${account.label} credentials.`);
                }}
              >
                <span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{account.label}</span>
                  <span className="ml-2 text-slate-500 dark:text-slate-400">{account.email}</span>
                </span>
                {account.badge ? (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    {account.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {mode === 'password' ? (
        <>
          <div>
            <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Email</label>
            <input className={inputClassName} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Password</label>
            <input className={inputClassName} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300">Phone number</label>
            <input
              className={inputClassName}
              type="text"
              placeholder="+407xxxxxxxx"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              className={inputClassName}
              type="text"
              placeholder="6-digit code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
            />
            <button type="button" className="btn btn-secondary whitespace-nowrap px-3" disabled={pending} onClick={requestPhoneCode}>
              {pending ? 'Sending...' : 'Send code'}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sistem intern securizat: cod unic, valabilitate limitata si o singura utilizare.
          </p>
          {otpDebugHint ? <p className="text-xs text-indigo-600 dark:text-indigo-300">{otpDebugHint}</p> : null}
        </>
      )}
      {info ? <p className="text-xs text-blue-600 dark:text-blue-300">{info}</p> : null}
      {error ? <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}
      <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:opacity-60">
        {pending ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
