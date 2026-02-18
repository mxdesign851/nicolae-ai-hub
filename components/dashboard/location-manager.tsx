'use client';

import { useState, useTransition } from 'react';

type LocationItem = {
  id: string;
  name: string;
  timezone: string | null;
  _count: { reviews: number };
};

type Props = {
  workspaceId: string;
  locations: LocationItem[];
  canCreate: boolean;
};

export function LocationManager({ workspaceId, locations, canCreate }: Props) {
  const [items, setItems] = useState(locations);
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <article className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Timezone</th>
              <th className="px-4 py-3">Reviews</th>
            </tr>
          </thead>
          <tbody>
            {items.map((location) => (
              <tr key={location.id} className="border-b border-slate-900/70">
                <td className="px-4 py-3">{location.name}</td>
                <td className="px-4 py-3 text-slate-400">{location.timezone || '-'}</td>
                <td className="px-4 py-3">{location._count.reviews}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <article className="card p-4">
        <h2 className="text-lg font-semibold">Add location</h2>
        <p className="mt-1 text-sm text-slate-400">Use locations to segment replies by store or branch.</p>
        {canCreate ? (
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              startTransition(async () => {
                const response = await fetch(`/api/workspaces/${workspaceId}/locations`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name, timezone: timezone || undefined })
                });
                const json = await response.json();
                if (!response.ok) {
                  setError(json.error || 'Unable to add location');
                  return;
                }
                setItems((prev) => [...prev, { ...json, _count: { reviews: 0 } }]);
                setName('');
                setTimezone('');
              });
            }}
          >
            <input className="input" placeholder="Downtown Store" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="input" placeholder="America/New_York" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
            <button className="btn btn-primary w-full" disabled={pending}>
              {pending ? 'Adding...' : 'Add location'}
            </button>
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          </form>
        ) : (
          <p className="mt-3 text-sm text-amber-300">Your plan has reached its location limit.</p>
        )}
      </article>
    </section>
  );
}
