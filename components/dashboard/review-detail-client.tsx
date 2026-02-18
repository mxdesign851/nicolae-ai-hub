'use client';

import { useMemo, useState, useTransition } from 'react';
import { Sentiment } from '@prisma/client';
import { StatusPill, SentimentPill } from '@/components/dashboard/pills';

type ReviewPayload = {
  id: string;
  workspaceId: string;
  source: string;
  authorName: string;
  rating: number;
  text: string;
  reviewUrl: string | null;
  reviewDate: string;
  language: string | null;
  status: string;
  tags: string[];
  sentiment: Sentiment;
  replyDraft: string | null;
  approvedReply: string | null;
  draftedBy: { id: string; name: string | null; email: string } | null;
  draftedAt: string | null;
  approvedBy: { id: string; name: string | null; email: string } | null;
  approvedAt: string | null;
  auditLogs: Array<{
    id: string;
    action: string;
    createdAt: string;
    actor: { id: string; name: string | null; email: string };
    metadata: unknown;
  }>;
  generations: Array<{
    id: string;
    provider: string;
    model: string;
    promptVersion: string;
    createdAt: string;
    inputTokens: number | null;
    outputTokens: number | null;
    estimatedCostUsd: string | null;
  }>;
};

type Props = {
  workspaceId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  review: ReviewPayload;
};

export function ReviewDetailClient({ workspaceId, role, review }: Props) {
  const [state, setState] = useState(review);
  const [replyDraft, setReplyDraft] = useState(review.replyDraft || '');
  const [approvedReply, setApprovedReply] = useState(review.approvedReply || '');
  const [tagsInput, setTagsInput] = useState(review.tags.join(', '));
  const [sentiment, setSentiment] = useState<Sentiment>(review.sentiment);
  const [provider, setProvider] = useState<'openai' | 'claude' | 'gemini'>('openai');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [escalation, setEscalation] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canApprove = role === 'OWNER' || role === 'ADMIN';
  const parsedTags = useMemo(
    () =>
      tagsInput
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    [tagsInput]
  );

  async function refreshReview() {
    const response = await fetch(`/api/reviews/${state.id}`);
    if (!response.ok) return;
    const next = (await response.json()) as ReviewPayload;
    setState(next);
    setReplyDraft(next.replyDraft || '');
    setApprovedReply(next.approvedReply || '');
    setTagsInput(next.tags.join(', '));
    setSentiment(next.sentiment);
  }

  function withAction(action: () => Promise<void>) {
    setStatusMessage(null);
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await action();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unexpected error');
      }
    });
  }

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{state.authorName || 'Anonymous reviewer'}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {state.source} - {state.rating}/5 - {new Date(state.reviewDate).toISOString().slice(0, 10)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill value={state.status} />
            <SentimentPill value={state.sentiment} />
          </div>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-100">{state.text}</p>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="card space-y-4 p-5">
          <h2 className="text-lg font-semibold">Generate AI reply</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <select className="input" value={provider} onChange={(e) => setProvider(e.target.value as typeof provider)}>
              <option value="openai">OpenAI</option>
              <option value="claude">Claude (stub)</option>
              <option value="gemini">Gemini (stub)</option>
            </select>
            <select className="input" value={length} onChange={(e) => setLength(e.target.value as typeof length)}>
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </select>
            <input
              className="input md:col-span-2"
              placeholder="Optional translation language (e.g. Spanish)"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={escalation} onChange={(e) => setEscalation(e.target.checked)} />
            Enable escalation rules for low ratings/complaints
          </label>
          <button
            disabled={pending}
            className="btn btn-primary"
            onClick={() =>
              withAction(async () => {
                const response = await fetch('/api/reviews/generate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    workspaceId,
                    reviewId: state.id,
                    provider,
                    length,
                    targetLanguage: targetLanguage || undefined,
                    escalation
                  })
                });
                const json = await response.json();
                if (!response.ok) throw new Error(json.error || 'Failed to generate');
                setReplyDraft(json.reply || '');
                setStatusMessage('Reply draft generated.');
                await refreshReview();
              })
            }
          >
            {pending ? 'Running...' : 'Generate reply'}
          </button>
        </article>

        <article className="card space-y-4 p-5">
          <h2 className="text-lg font-semibold">Tag + sentiment suggestions</h2>
          <button
            disabled={pending}
            className="btn btn-secondary"
            onClick={() =>
              withAction(async () => {
                const response = await fetch(`/api/reviews/${state.id}/suggest`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ workspaceId, provider })
                });
                const json = await response.json();
                if (!response.ok) throw new Error(json.error || 'Failed to suggest tags');
                setTagsInput((json.suggestion.tags || []).join(', '));
                setSentiment(json.suggestion.sentiment || 'NEU');
                setStatusMessage('AI suggestion applied. Save to persist.');
              })
            }
          >
            Suggest tags + sentiment
          </button>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Tags (comma separated)</label>
            <input className="input" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Sentiment</label>
            <select className="input" value={sentiment} onChange={(e) => setSentiment(e.target.value as Sentiment)}>
              <option value="POS">POS</option>
              <option value="NEU">NEU</option>
              <option value="NEG">NEG</option>
            </select>
          </div>
        </article>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-semibold">Reply editor</h2>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Draft reply</label>
          <textarea className="input min-h-[140px]" value={replyDraft} onChange={(e) => setReplyDraft(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Approved reply</label>
          <textarea className="input min-h-[120px]" value={approvedReply} onChange={(e) => setApprovedReply(e.target.value)} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={pending}
            className="btn btn-secondary"
            onClick={() =>
              withAction(async () => {
                const response = await fetch(`/api/reviews/${state.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    replyDraft,
                    approvedReply,
                    tags: parsedTags,
                    sentiment
                  })
                });
                const json = await response.json();
                if (!response.ok) throw new Error(json.error || 'Failed to save');
                setStatusMessage('Review updated.');
                await refreshReview();
              })
            }
          >
            Save edits
          </button>

          {canApprove ? (
            <button
              disabled={pending}
              className="btn btn-primary"
              onClick={() =>
                withAction(async () => {
                  const response = await fetch(`/api/reviews/${state.id}/approve`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workspaceId, approvedReply: approvedReply || replyDraft })
                  });
                  const json = await response.json();
                  if (!response.ok) throw new Error(json.error || 'Failed to approve');
                  setStatusMessage('Reply approved.');
                  await refreshReview();
                })
              }
            >
              Approve reply
            </button>
          ) : null}

          <button
            disabled={pending}
            className="btn btn-secondary"
            onClick={() =>
              withAction(async () => {
                const response = await fetch(`/api/reviews/${state.id}/status`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ workspaceId, status: 'SENT' })
                });
                const json = await response.json();
                if (!response.ok) throw new Error(json.error || 'Failed to mark sent');
                setStatusMessage('Marked as SENT.');
                await refreshReview();
              })
            }
          >
            Mark as sent
          </button>
        </div>
        {statusMessage ? <p className="text-sm text-emerald-300">{statusMessage}</p> : null}
        {errorMessage ? <p className="text-sm text-rose-300">{errorMessage}</p> : null}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="card p-5">
          <h2 className="mb-3 text-lg font-semibold">Generation metadata</h2>
          <div className="space-y-2 text-sm text-slate-300">
            {state.generations.length ? (
              state.generations.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                  <p className="text-xs text-slate-400">{new Date(item.createdAt).toISOString()}</p>
                  <p>
                    {item.provider} - {item.model}
                  </p>
                  <p className="text-xs text-slate-400">
                    prompt {item.promptVersion} - tokens in/out: {item.inputTokens ?? '-'} / {item.outputTokens ?? '-'} - est.
                    ${item.estimatedCostUsd ?? '0'}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-400">No generations yet.</p>
            )}
          </div>
        </article>
        <article className="card p-5">
          <h2 className="mb-3 text-lg font-semibold">Audit trail</h2>
          <div className="space-y-2 text-sm text-slate-300">
            {state.auditLogs.length ? (
              state.auditLogs.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                  <p className="text-xs text-slate-400">
                    {new Date(item.createdAt).toISOString()} - {item.actor.name || item.actor.email}
                  </p>
                  <p>{item.action}</p>
                </div>
              ))
            ) : (
              <p className="text-slate-400">No audit entries yet.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
