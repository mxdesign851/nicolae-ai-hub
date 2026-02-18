'use client';

import { Tone } from '@prisma/client';
import { useMemo, useState, useTransition } from 'react';

type Voice = {
  id: string;
  locationId: string | null;
  tone: Tone;
  doList: string[];
  dontList: string[];
  examples: string[];
  bannedWords: string[];
  signOff: string | null;
};

type LocationOption = {
  id: string;
  name: string;
};

type Props = {
  workspaceId: string;
  workspaceVoice: Voice | null;
  locationVoices: Voice[];
  locations: LocationOption[];
};

function splitLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function BrandVoiceForm({ workspaceId, workspaceVoice, locationVoices, locations }: Props) {
  const [scope, setScope] = useState<'workspace' | 'location'>('workspace');
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '');
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedVoice = useMemo(() => {
    if (scope === 'workspace') return workspaceVoice;
    return locationVoices.find((voice) => voice.locationId === locationId) ?? null;
  }, [scope, locationId, workspaceVoice, locationVoices]);

  const [tone, setTone] = useState<Tone>(selectedVoice?.tone ?? 'PROFESSIONAL');
  const [doList, setDoList] = useState((selectedVoice?.doList ?? []).join('\n'));
  const [dontList, setDontList] = useState((selectedVoice?.dontList ?? []).join('\n'));
  const [examples, setExamples] = useState((selectedVoice?.examples ?? []).join('\n'));
  const [bannedWords, setBannedWords] = useState((selectedVoice?.bannedWords ?? []).join('\n'));
  const [signOff, setSignOff] = useState(selectedVoice?.signOff ?? '');

  function loadVoice(next: Voice | null) {
    setTone(next?.tone ?? 'PROFESSIONAL');
    setDoList((next?.doList ?? []).join('\n'));
    setDontList((next?.dontList ?? []).join('\n'));
    setExamples((next?.examples ?? []).join('\n'));
    setBannedWords((next?.bannedWords ?? []).join('\n'));
    setSignOff(next?.signOff ?? '');
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          className={`btn ${scope === 'workspace' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => {
            setScope('workspace');
            loadVoice(workspaceVoice);
          }}
          type="button"
        >
          Workspace voice
        </button>
        <button
          className={`btn ${scope === 'location' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => {
            setScope('location');
            const voice = locationVoices.find((item) => item.locationId === locationId) ?? null;
            loadVoice(voice);
          }}
          type="button"
        >
          Location voice
        </button>
        {scope === 'location' ? (
          <select
            className="input max-w-[240px]"
            value={locationId}
            onChange={(event) => {
              setLocationId(event.target.value);
              const voice = locationVoices.find((item) => item.locationId === event.target.value) ?? null;
              loadVoice(voice);
            }}
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-slate-300">Tone</label>
          <select className="input" value={tone} onChange={(event) => setTone(event.target.value as Tone)}>
            {Object.values(Tone).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Sign-off preference</label>
          <input className="input" value={signOff} onChange={(event) => setSignOff(event.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Do list (one per line)</label>
          <textarea className="input min-h-[110px]" value={doList} onChange={(event) => setDoList(event.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Dont list (one per line)</label>
          <textarea className="input min-h-[110px]" value={dontList} onChange={(event) => setDontList(event.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Examples (one per line)</label>
          <textarea className="input min-h-[110px]" value={examples} onChange={(event) => setExamples(event.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">Banned words (one per line)</label>
          <textarea
            className="input min-h-[110px]"
            value={bannedWords}
            onChange={(event) => setBannedWords(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          className="btn btn-primary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setMessage(null);
              setError(null);
              const response = await fetch(`/api/workspaces/${workspaceId}/brand-voice`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  locationId: scope === 'location' ? locationId : undefined,
                  tone,
                  doList: splitLines(doList),
                  dontList: splitLines(dontList),
                  examples: splitLines(examples),
                  bannedWords: splitLines(bannedWords),
                  signOff
                })
              });
              const json = await response.json();
              if (!response.ok) {
                setError(json.error || 'Failed to save brand voice');
                return;
              }
              setMessage('Brand voice saved.');
            })
          }
          type="button"
        >
          {pending ? 'Saving...' : 'Save brand voice'}
        </button>
        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </div>
    </section>
  );
}
