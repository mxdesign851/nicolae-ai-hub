'use client';

import { signOut } from 'next-auth/react';

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/sign-in' })}
      className="btn btn-secondary w-full justify-center text-xs md:w-auto"
    >
      Sign out
    </button>
  );
}
