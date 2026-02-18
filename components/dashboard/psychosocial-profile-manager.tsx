'use client';

import { FormEvent, useMemo, useState, useTransition } from 'react';

type PsychosocialProfile = {
  id: string;
  internalName: string;
  age: number;
  sex: string;
  locationCenter: string;
  assessmentDate: string;
  responsiblePerson: string;
  familySupport: 'DA' | 'NU' | 'PARTIAL';
  housingStatus: 'FARA_ADAPOST' | 'CENTRU' | 'FAMILIE' | 'ALTA';
  communicationLevel: 'MIC' | 'MEDIU' | 'BUN';
  stressReaction: 'CALM' | 'AGITAT' | 'CRIZE';
  relationshipStyle: 'RETRAS' | 'SOCIABIL' | 'AGRESIV';
  autonomyLevel: 'DEPENDENT' | 'PARTIAL' | 'INDEPENDENT';
  sleepQuality: 'BUN' | 'SLAB';
  appetite: 'NORMAL' | 'SCAZUT';
  sadnessFrequent: boolean;
  anxiety: boolean;
  anger: boolean;
  apathy: boolean;
  hopeMotivation: boolean;
  contextPersonal: string;
  emotionalProfile: string;
  mainNeeds: string[];
  risks: string[];
  staffRecommendations: string[];
  supportPlan: string[];
  observations: string | null;
  signatureResponsible: string | null;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  workspaceId: string;
  initialProfiles: PsychosocialProfile[];
};

const yesNoUnknownOptions = [
  { value: 'unknown', label: 'Nespecificat' },
  { value: 'yes', label: 'Da' },
  { value: 'no', label: 'Nu' }
] as const;

const familySupportOptions = [
  { value: 'DA', label: 'Da' },
  { value: 'NU', label: 'Nu' },
  { value: 'PARTIAL', label: 'Partial' }
] as const;

const housingOptions = [
  { value: 'FARA_ADAPOST', label: 'Fara adapost' },
  { value: 'CENTRU', label: 'Centru' },
  { value: 'FAMILIE', label: 'Familie' },
  { value: 'ALTA', label: 'Alta situatie' }
] as const;

const communicationOptions = [
  { value: 'MIC', label: 'Mic' },
  { value: 'MEDIU', label: 'Mediu' },
  { value: 'BUN', label: 'Bun' }
] as const;

const stressOptions = [
  { value: 'CALM', label: 'Calm' },
  { value: 'AGITAT', label: 'Agitat' },
  { value: 'CRIZE', label: 'Crize' }
] as const;

const relationshipOptions = [
  { value: 'RETRAS', label: 'Retras' },
  { value: 'SOCIABIL', label: 'Sociabil' },
  { value: 'AGRESIV', label: 'Agresiv' }
] as const;

const autonomyOptions = [
  { value: 'DEPENDENT', label: 'Dependent' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'INDEPENDENT', label: 'Independent' }
] as const;

const sleepOptions = [
  { value: 'BUN', label: 'Bun' },
  { value: 'SLAB', label: 'Slab' }
] as const;

const appetiteOptions = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'SCAZUT', label: 'Scazut' }
] as const;

function parseTriState(value: 'unknown' | 'yes' | 'no'): boolean | null {
  if (value === 'yes') return true;
  if (value === 'no') return false;
  return null;
}

export function PsychosocialProfileManager({ workspaceId, initialProfiles }: Props) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [selectedId, setSelectedId] = useState(initialProfiles[0]?.id ?? null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<'openai' | 'claude' | 'gemini'>('openai');
  const [lastModel, setLastModel] = useState<string | null>(null);

  const [form, setForm] = useState({
    internalName: '',
    age: '0',
    sex: '',
    locationCenter: '',
    assessmentDate: new Date().toISOString().slice(0, 10),
    responsiblePerson: '',
    familySupport: 'PARTIAL' as const,
    housingStatus: 'CENTRU' as const,
    familyContactFrequency: '',
    institutionalizationHistory: '',
    knownDiseases: 'unknown' as const,
    medicationInfo: '',
    limitations: '',
    previousPsychEvaluation: 'unknown' as const,
    communicationLevel: 'MEDIU' as const,
    stressReaction: 'CALM' as const,
    relationshipStyle: 'SOCIABIL' as const,
    autonomyLevel: 'PARTIAL' as const,
    sleepQuality: 'BUN' as const,
    appetite: 'NORMAL' as const,
    sadnessFrequent: false,
    anxiety: false,
    anger: false,
    apathy: false,
    hopeMotivation: true,
    photoConsent: false,
    photoReference: '',
    observations: '',
    signatureResponsible: ''
  });

  const selectedProfile = useMemo(() => profiles.find((profile) => profile.id === selectedId) ?? null, [profiles, selectedId]);

  function resetNotices() {
    setMessage(null);
    setError(null);
  }

  async function reloadProfiles() {
    const response = await fetch(`/api/workspaces/${workspaceId}/psychosocial-profiles`);
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error || 'Nu am putut reincarca profilele');
    }
    setProfiles(json.profiles);
    if (!json.profiles.some((profile: PsychosocialProfile) => profile.id === selectedId)) {
      setSelectedId(json.profiles[0]?.id ?? null);
    }
  }

  function submitProfile(event: FormEvent) {
    event.preventDefault();
    resetNotices();

    startTransition(async () => {
      try {
        const payload = {
          provider: aiProvider,
          internalName: form.internalName,
          age: Number(form.age),
          sex: form.sex,
          locationCenter: form.locationCenter,
          assessmentDate: form.assessmentDate,
          responsiblePerson: form.responsiblePerson,
          familySupport: form.familySupport,
          housingStatus: form.housingStatus,
          familyContactFrequency: form.familyContactFrequency || null,
          institutionalizationHistory: form.institutionalizationHistory || null,
          knownDiseases: parseTriState(form.knownDiseases),
          medicationInfo: form.medicationInfo || null,
          limitations: form.limitations || null,
          previousPsychEvaluation: parseTriState(form.previousPsychEvaluation),
          communicationLevel: form.communicationLevel,
          stressReaction: form.stressReaction,
          relationshipStyle: form.relationshipStyle,
          autonomyLevel: form.autonomyLevel,
          sleepQuality: form.sleepQuality,
          appetite: form.appetite,
          sadnessFrequent: form.sadnessFrequent,
          anxiety: form.anxiety,
          anger: form.anger,
          apathy: form.apathy,
          hopeMotivation: form.hopeMotivation,
          photoConsent: form.photoConsent,
          photoReference: form.photoReference || null,
          observations: form.observations || null,
          signatureResponsible: form.signatureResponsible || null
        };

        const response = await fetch(`/api/workspaces/${workspaceId}/psychosocial-profiles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await response.json();
        if (!response.ok) {
          setError(json.error || 'Nu am putut genera profilul');
          return;
        }

        setLastModel(json.ai?.model || null);
        setMessage(
          json.ai?.fallbackRulesUsed
            ? 'Profil salvat. AI a raspuns partial, s-a aplicat si fallback pe reguli.'
            : 'Profil psihosocial salvat cu AI. PDF-ul poate fi descarcat imediat.'
        );
        setForm((prev) => ({
          ...prev,
          internalName: '',
          age: '0',
          sex: '',
          locationCenter: '',
          responsiblePerson: '',
          familyContactFrequency: '',
          institutionalizationHistory: '',
          medicationInfo: '',
          limitations: '',
          photoReference: '',
          observations: '',
          signatureResponsible: ''
        }));
        setSelectedId(json.profile.id);
        await reloadProfiles();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Eroare la salvarea profilului');
      }
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
        <strong>Scop:</strong> profil orientativ de sprijin, recomandari pentru personal si fise clare pentru dosar. Nu pune diagnostice – doar observatii, nevoi orientative si recomandari comportamentale.
      </section>
      <section className="rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-300">Provider AI:</span>
          <select className="input max-w-[200px]" value={aiProvider} onChange={(event) => setAiProvider(event.target.value as typeof aiProvider)}>
            <option value="openai">OpenAI</option>
            <option value="claude">Claude</option>
            <option value="gemini">Gemini</option>
          </select>
          <span className="text-xs text-slate-400">Model curent: {lastModel || 'inca nefolosit'}</span>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="card p-5">
          <h2 className="text-lg font-semibold">Evaluare profil psihosocial</h2>
          <form className="mt-4 space-y-4" onSubmit={submitProfile}>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="input"
                placeholder="Prenume / cod intern"
                value={form.internalName}
                onChange={(event) => setForm((prev) => ({ ...prev, internalName: event.target.value }))}
              />
              <input
                className="input"
                type="number"
                min={0}
                max={120}
                placeholder="Varsta"
                value={form.age}
                onChange={(event) => setForm((prev) => ({ ...prev, age: event.target.value }))}
              />
              <input className="input" placeholder="Sex" value={form.sex} onChange={(event) => setForm((prev) => ({ ...prev, sex: event.target.value }))} />
              <input
                className="input"
                placeholder="Locatie / Centru"
                value={form.locationCenter}
                onChange={(event) => setForm((prev) => ({ ...prev, locationCenter: event.target.value }))}
              />
              <input
                className="input"
                type="date"
                value={form.assessmentDate}
                onChange={(event) => setForm((prev) => ({ ...prev, assessmentDate: event.target.value }))}
              />
              <input
                className="input"
                placeholder="Persoana responsabila"
                value={form.responsiblePerson}
                onChange={(event) => setForm((prev) => ({ ...prev, responsiblePerson: event.target.value }))}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <select className="input" value={form.familySupport} onChange={(event) => setForm((prev) => ({ ...prev, familySupport: event.target.value as typeof prev.familySupport }))}>
                {familySupportOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Familie: {option.label}
                  </option>
                ))}
              </select>
              <select className="input" value={form.housingStatus} onChange={(event) => setForm((prev) => ({ ...prev, housingStatus: event.target.value as typeof prev.housingStatus }))}>
                {housingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Locuire: {option.label}
                  </option>
                ))}
              </select>
              <input
                className="input"
                placeholder="Frecventa contact familie"
                value={form.familyContactFrequency}
                onChange={(event) => setForm((prev) => ({ ...prev, familyContactFrequency: event.target.value }))}
              />
              <input
                className="input"
                placeholder="Istoric institutionalizare"
                value={form.institutionalizationHistory}
                onChange={(event) => setForm((prev) => ({ ...prev, institutionalizationHistory: event.target.value }))}
              />
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2 text-xs text-slate-400">
              Stare medicală (opțional, doar cu acordul beneficiarului/legal)
            </div>
            <div className="grid gap-3 md:grid-cols-2 md:col-span-2">
              <select className="input" value={form.knownDiseases} onChange={(event) => setForm((prev) => ({ ...prev, knownDiseases: event.target.value as typeof prev.knownDiseases }))}>
                {yesNoUnknownOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Boli cunoscute: {option.label}
                  </option>
                ))}
              </select>
              <select
                className="input"
                value={form.previousPsychEvaluation}
                onChange={(event) => setForm((prev) => ({ ...prev, previousPsychEvaluation: event.target.value as typeof prev.previousPsychEvaluation }))}
              >
                {yesNoUnknownOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Evaluare psihologica anterioara: {option.label}
                  </option>
                ))}
              </select>
              <input
                className="input"
                placeholder="Medicatie (optional)"
                value={form.medicationInfo}
                onChange={(event) => setForm((prev) => ({ ...prev, medicationInfo: event.target.value }))}
              />
              <input
                className="input"
                placeholder="Limitari / handicap"
                value={form.limitations}
                onChange={(event) => setForm((prev) => ({ ...prev, limitations: event.target.value }))}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="input"
                value={form.communicationLevel}
                onChange={(event) => setForm((prev) => ({ ...prev, communicationLevel: event.target.value as typeof prev.communicationLevel }))}
              >
                {communicationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Comunicare: {option.label}
                  </option>
                ))}
              </select>
              <select className="input" value={form.stressReaction} onChange={(event) => setForm((prev) => ({ ...prev, stressReaction: event.target.value as typeof prev.stressReaction }))}>
                {stressOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Reactie la stres: {option.label}
                  </option>
                ))}
              </select>
              <select
                className="input"
                value={form.relationshipStyle}
                onChange={(event) => setForm((prev) => ({ ...prev, relationshipStyle: event.target.value as typeof prev.relationshipStyle }))}
              >
                {relationshipOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Relationare: {option.label}
                  </option>
                ))}
              </select>
              <select className="input" value={form.autonomyLevel} onChange={(event) => setForm((prev) => ({ ...prev, autonomyLevel: event.target.value as typeof prev.autonomyLevel }))}>
                {autonomyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Autonomie: {option.label}
                  </option>
                ))}
              </select>
              <select className="input" value={form.sleepQuality} onChange={(event) => setForm((prev) => ({ ...prev, sleepQuality: event.target.value as typeof prev.sleepQuality }))}>
                {sleepOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Somn: {option.label}
                  </option>
                ))}
              </select>
              <select className="input" value={form.appetite} onChange={(event) => setForm((prev) => ({ ...prev, appetite: event.target.value as typeof prev.appetite }))}>
                {appetiteOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Apetit: {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.sadnessFrequent}
                  onChange={(event) => setForm((prev) => ({ ...prev, sadnessFrequent: event.target.checked }))}
                />
                Tristete frecventa
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.anxiety} onChange={(event) => setForm((prev) => ({ ...prev, anxiety: event.target.checked }))} />
                Anxietate
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.anger} onChange={(event) => setForm((prev) => ({ ...prev, anger: event.target.checked }))} />
                Furie
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.apathy} onChange={(event) => setForm((prev) => ({ ...prev, apathy: event.target.checked }))} />
                Apatie
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.hopeMotivation}
                  onChange={(event) => setForm((prev) => ({ ...prev, hopeMotivation: event.target.checked }))}
                />
                Exista speranta / motivatie observata
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.photoConsent}
                    onChange={(event) => setForm((prev) => ({ ...prev, photoConsent: event.target.checked }))}
                  />
                  Consimtamant legal pentru poza (opțional)
                </span>
                <span className="text-xs text-slate-500">Doar pentru identificare. NU se folosește pentru analiză facială.</span>
              </label>
              <input
                className="input"
                placeholder="Referinta poza (optional)"
                value={form.photoReference}
                onChange={(event) => setForm((prev) => ({ ...prev, photoReference: event.target.value }))}
              />
            </div>

            <textarea
              className="input min-h-[95px]"
              placeholder="Observatii"
              value={form.observations}
              onChange={(event) => setForm((prev) => ({ ...prev, observations: event.target.value }))}
            />
            <input
              className="input"
              placeholder="Semnatura responsabil (optional)"
              value={form.signatureResponsible}
              onChange={(event) => setForm((prev) => ({ ...prev, signatureResponsible: event.target.value }))}
            />

            <button className="btn btn-primary w-full" disabled={pending}>
              {pending ? 'Se genereaza...' : 'Genereaza profil orientativ'}
            </button>
          </form>
        </article>

        <div className="space-y-5">
          <article className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Profil selectat</h2>
                <p className="text-sm text-slate-400">Fisier PDF: maxim o foaie, pentru dosar.</p>
              </div>
              {selectedProfile ? (
                <a className="btn btn-primary" href={`/api/workspaces/${workspaceId}/psychosocial-profiles/${selectedProfile.id}/pdf`}>
                  Descarca PDF
                </a>
              ) : null}
            </div>
            {selectedProfile ? (
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <p className="font-medium">
                    {selectedProfile.internalName} ({selectedProfile.age} ani) - {new Date(selectedProfile.assessmentDate).toLocaleDateString('ro-RO')}
                  </p>
                  <p className="mt-1 text-slate-300">{selectedProfile.contextPersonal}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <p className="font-medium">Profil emotional</p>
                  <p className="mt-1 text-slate-300">{selectedProfile.emotionalProfile}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <p className="font-medium">Nevoi principale</p>
                  <ul className="mt-1 list-disc pl-5 text-slate-300">
                    {selectedProfile.mainNeeds.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <p className="font-medium">Riscuri</p>
                  <ul className="mt-1 list-disc pl-5 text-slate-300">
                    {selectedProfile.risks.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <p className="font-medium">Recomandari pentru personal</p>
                  <ul className="mt-1 list-disc pl-5 text-slate-300">
                    {selectedProfile.staffRecommendations.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">Nu exista profile salvate inca.</p>
            )}
          </article>

          <article className="card overflow-hidden">
            <div className="border-b border-slate-800 px-4 py-3">
              <h3 className="text-base font-semibold">Istoric profile</h3>
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Beneficiar</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Riscuri</th>
                    <th className="px-4 py-3">Actiune</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr key={profile.id} className="border-b border-slate-900/70">
                      <td className="px-4 py-3">
                        <p className="font-medium">{profile.internalName}</p>
                        <p className="text-xs text-slate-400">{profile.locationCenter}</p>
                      </td>
                      <td className="px-4 py-3">{new Date(profile.assessmentDate).toLocaleDateString('ro-RO')}</td>
                      <td className="px-4 py-3">{profile.risks.length}</td>
                      <td className="px-4 py-3">
                        <button className="btn btn-secondary h-8 px-3 text-xs" onClick={() => setSelectedId(profile.id)}>
                          Vezi
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!profiles.length ? (
                    <tr>
                      <td className="px-4 py-4 text-slate-400" colSpan={4}>
                        Nu exista profile inregistrate.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </section>

      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
