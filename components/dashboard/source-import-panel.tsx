'use client';

import { ReviewSource } from '@prisma/client';
import { FormEvent, useState, useTransition } from 'react';

type LocationOption = {
  id: string;
  name: string;
};

type SourceOption = {
  id: string;
  provider: ReviewSource;
  displayName: string;
  status: string;
};

type Props = {
  workspaceId: string;
  locations: LocationOption[];
  sources: SourceOption[];
};

export function SourceImportPanel({ workspaceId, locations, sources }: Props) {
  const [manual, setManual] = useState({
    locationId: locations[0]?.id ?? '',
    source: 'GOOGLE' as ReviewSource,
    authorName: '',
    rating: 5,
    text: '',
    reviewDate: new Date().toISOString().slice(0, 10),
    reviewUrl: ''
  });
  const [csvLocationId, setCsvLocationId] = useState(locations[0]?.id ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function clearNotices() {
    setMessage(null);
    setError(null);
  }

  function submitManual(event: FormEvent) {
    event.preventDefault();
    clearNotices();
    startTransition(async () => {
      const response = await fetch('/api/reviews/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          locationId: manual.locationId,
          source: manual.source,
          authorName: manual.authorName,
          rating: Number(manual.rating),
          text: manual.text,
          reviewDate: new Date(manual.reviewDate).toISOString(),
          reviewUrl: manual.reviewUrl || undefined
        })
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error || 'Manual import failed');
        return;
      }
      setMessage('Manual review added.');
      setManual((prev) => ({ ...prev, authorName: '', text: '', reviewUrl: '' }));
    });
  }

  function submitCsv(event: FormEvent) {
    event.preventDefault();
    clearNotices();
    if (!file) {
      setError('Choose a CSV file first.');
      return;
    }
    startTransition(async () => {
      const form = new FormData();
      form.append('workspaceId', workspaceId);
      if (csvLocationId) form.append('locationId', csvLocationId);
      form.append('file', file);
      const response = await fetch('/api/reviews/import', { method: 'POST', body: form });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error || 'CSV import failed');
        return;
      }
      setMessage(`CSV import complete. Imported ${json.imported} row(s), failed ${json.failed}.`);
      setFile(null);
    });
  }

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <h2 className="text-lg font-semibold">Configured sources</h2>
        <p className="mt-1 text-sm text-slate-400">Manual imports only in this release (no direct platform API syncing).</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {sources.map((source) => (
            <span key={source.id} className="badge">
              {source.displayName} ({source.status})
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="card p-5">
          <h2 className="text-lg font-semibold">Add review manually</h2>
          <form className="mt-4 space-y-3" onSubmit={submitManual}>
            <select
              className="input"
              value={manual.locationId}
              onChange={(event) => setManual((prev) => ({ ...prev, locationId: event.target.value }))}
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={manual.source}
              onChange={(event) => setManual((prev) => ({ ...prev, source: event.target.value as ReviewSource }))}
            >
              {Object.values(ReviewSource).map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Author name"
              value={manual.authorName}
              onChange={(event) => setManual((prev) => ({ ...prev, authorName: event.target.value }))}
            />
            <input
              className="input"
              type="number"
              min={1}
              max={5}
              value={manual.rating}
              onChange={(event) => setManual((prev) => ({ ...prev, rating: Number(event.target.value) }))}
            />
            <input
              className="input"
              type="date"
              value={manual.reviewDate}
              onChange={(event) => setManual((prev) => ({ ...prev, reviewDate: event.target.value }))}
            />
            <input
              className="input"
              placeholder="https://review-url"
              value={manual.reviewUrl}
              onChange={(event) => setManual((prev) => ({ ...prev, reviewUrl: event.target.value }))}
            />
            <textarea
              className="input min-h-[120px]"
              placeholder="Review text"
              value={manual.text}
              onChange={(event) => setManual((prev) => ({ ...prev, text: event.target.value }))}
            />
            <button className="btn btn-primary w-full" disabled={pending}>
              {pending ? 'Saving...' : 'Add review'}
            </button>
          </form>
        </article>

        <article className="card p-5">
          <h2 className="text-lg font-semibold">Import CSV</h2>
          <p className="mt-1 text-sm text-slate-400">
            Required columns: <code>name,rating,date,text,source,location,url</code>
          </p>
          <form className="mt-4 space-y-3" onSubmit={submitCsv}>
            <select className="input" value={csvLocationId} onChange={(event) => setCsvLocationId(event.target.value)}>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  Default location: {location.name}
                </option>
              ))}
            </select>
            <input className="input" type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            <button className="btn btn-primary w-full" disabled={pending}>
              {pending ? 'Importing...' : 'Import CSV'}
            </button>
          </form>
          <a href="/sample-reviews.csv" className="mt-3 inline-flex text-sm text-blue-300">
            Download sample CSV
          </a>
        </article>
      </section>

      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
