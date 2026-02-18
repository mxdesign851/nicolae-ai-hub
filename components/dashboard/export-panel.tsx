'use client';

import { useMemo, useState } from 'react';

type ReviewRow = {
  id: string;
  authorName: string;
  rating: number;
  status: string;
  approvedReply: string | null;
  replyDraft: string | null;
};

type Props = {
  workspaceId: string;
  reviews: ReviewRow[];
  canExport: boolean;
};

export function ExportPanel({ workspaceId, reviews, canExport }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedReviews = useMemo(() => reviews.filter((review) => selectedIds.includes(review.id)), [reviews, selectedIds]);
  const [message, setMessage] = useState<string | null>(null);

  const toggleId = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const copySelectedReplies = async () => {
    const text = selectedReviews
      .map((review) => {
        const reply = review.approvedReply || review.replyDraft || '';
        return `# ${review.authorName} (${review.rating}/5)\n${reply}`;
      })
      .join('\n\n');
    await navigator.clipboard.writeText(text);
    setMessage('Copied selected replies to clipboard.');
  };

  return (
    <div className="space-y-4">
      {!canExport ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          CSV export is available on Agency plan.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary" onClick={() => setSelectedIds(reviews.map((review) => review.id))}>
            Select all
          </button>
          <button className="btn btn-secondary" onClick={() => setSelectedIds([])}>
            Clear selection
          </button>
          <button className="btn btn-primary" onClick={copySelectedReplies} disabled={!selectedReviews.length}>
            Copy selected replies
          </button>
          <a
            className={`btn ${selectedReviews.length ? 'btn-primary' : 'btn-secondary pointer-events-none opacity-50'}`}
            href={`/api/workspaces/${workspaceId}/exports/csv?ids=${selectedIds.join(',')}`}
          >
            Download CSV
          </a>
        </div>
      )}

      <section className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Select</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reply preview</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.id} className="border-b border-slate-900/70">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selectedIds.includes(review.id)} onChange={() => toggleId(review.id)} />
                </td>
                <td className="px-4 py-3">{review.authorName}</td>
                <td className="px-4 py-3">{review.rating}/5</td>
                <td className="px-4 py-3">{review.status}</td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {(review.approvedReply || review.replyDraft || '').slice(0, 100) || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
    </div>
  );
}
