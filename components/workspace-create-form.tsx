'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function WorkspaceCreateForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error || 'Unable to create workspace');
        return;
      }
      router.push(`/w/${json.id}/inbox`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm text-slate-300">Workspace name</label>
        <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="ReplyZen HQ" />
      </div>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <button disabled={pending} className="btn btn-primary w-full">
        {pending ? 'Creating...' : 'Create workspace'}
      </button>
    </form>
  );
}
