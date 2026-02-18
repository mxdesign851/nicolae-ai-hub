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
  familyContactFrequency: string | null;
  institutionalizationHistory: string | null;
  knownDiseases: boolean | null;
  medicationInfo: string | null;
  limitations: string | null;
  previousPsychEvaluation: boolean | null;
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
  photoConsent: boolean;
  photoReference: string | null;
  gdprConsent: boolean;
  gdprConsentDate: string | null;
  contextPersonal: string;
  emotionalProfile: string;
  mainNeeds: string[];
  risks: string[];
  staffRecommendations: string[];
  supportPlan: string[];
  observations: string | null;
  signatureResponsible: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

type AccessLog = {
  id: string;
  action: string;
  actor: { id: string; name: string | null; email: string };
  metadata: unknown;
  createdAt: string;
};

type Props = {
  workspaceId: string;
  initialProfiles: PsychosocialProfile[];
};

const WIZARD_STEPS = [
  { key: 'basic', label: 'Date de baza', icon: '1' },
  { key: 'social', label: 'Situatie sociala', icon: '2' },
  { key: 'medical', label: 'Stare medicala', icon: '3' },
  { key: 'behavior', label: 'Comportament', icon: '4' },
  { key: 'emotional', label: 'Stare emotionala', icon: '5' }
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

const yesNoUnknownOptions = [
  { value: 'unknown', label: 'Nespecificat' },
  { value: 'yes', label: 'Da' },
  { value: 'no', label: 'Nu' }
] as const;

function parseTriState(value: 'unknown' | 'yes' | 'no'): boolean | null {
  if (value === 'yes') return true;
  if (value === 'no') return false;
  return null;
}

const ACTION_LABELS: Record<string, string> = {
  PROFILE_CREATED: 'Creat',
  PROFILE_UPDATED: 'Modificat',
  PROFILE_DELETED: 'Sters',
  PROFILE_VIEWED: 'Vizualizat',
  PROFILE_PDF_DOWNLOADED: 'PDF descarcat'
};

type FormState = {
  internalName: string;
  age: string;
  sex: string;
  locationCenter: string;
  assessmentDate: string;
  responsiblePerson: string;
  familySupport: 'DA' | 'NU' | 'PARTIAL';
  housingStatus: 'FARA_ADAPOST' | 'CENTRU' | 'FAMILIE' | 'ALTA';
  familyContactFrequency: string;
  institutionalizationHistory: string;
  knownDiseases: 'unknown' | 'yes' | 'no';
  medicationInfo: string;
  limitations: string;
  previousPsychEvaluation: 'unknown' | 'yes' | 'no';
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
  photoConsent: boolean;
  photoReference: string;
  gdprConsent: boolean;
  observations: string;
  signatureResponsible: string;
};

const INITIAL_FORM: FormState = {
  internalName: '',
  age: '0',
  sex: '',
  locationCenter: '',
  assessmentDate: new Date().toISOString().slice(0, 10),
  responsiblePerson: '',
  familySupport: 'PARTIAL',
  housingStatus: 'CENTRU',
  familyContactFrequency: '',
  institutionalizationHistory: '',
  knownDiseases: 'unknown',
  medicationInfo: '',
  limitations: '',
  previousPsychEvaluation: 'unknown',
  communicationLevel: 'MEDIU',
  stressReaction: 'CALM',
  relationshipStyle: 'SOCIABIL',
  autonomyLevel: 'PARTIAL',
  sleepQuality: 'BUN',
  appetite: 'NORMAL',
  sadnessFrequent: false,
  anxiety: false,
  anger: false,
  apathy: false,
  hopeMotivation: true,
  photoConsent: false,
  photoReference: '',
  gdprConsent: false,
  observations: '',
  signatureResponsible: ''
};

function WizardStepIndicator({ steps, currentStep, onStepClick }: { steps: typeof WIZARD_STEPS; currentStep: number; onStepClick: (i: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => (
        <button
          key={step.key}
          type="button"
          onClick={() => onStepClick(i)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
            i === currentStep
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
              : i < currentStep
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-900/50 text-slate-500 border border-slate-800'
          }`}
        >
          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
            i === currentStep ? 'bg-blue-500 text-white' : i < currentStep ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'
          }`}>
            {i < currentStep ? '\u2713' : step.icon}
          </span>
          <span className="hidden sm:inline">{step.label}</span>
        </button>
      ))}
    </div>
  );
}

function StepBasic({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">A) Date de baza</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-slate-400">Prenume / cod intern *</label>
          <input className="input" placeholder="Prenume sau cod intern" value={form.internalName} onChange={(e) => setForm((p) => ({ ...p, internalName: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Varsta *</label>
          <input className="input" type="number" min={0} max={120} placeholder="Varsta" value={form.age} onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Sex *</label>
          <select className="input" value={form.sex} onChange={(e) => setForm((p) => ({ ...p, sex: e.target.value }))}>
            <option value="">Selecteaza...</option>
            <option value="M">Masculin</option>
            <option value="F">Feminin</option>
            <option value="Altul">Altul</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Locatie / Centru *</label>
          <input className="input" placeholder="Locatie / Centru" value={form.locationCenter} onChange={(e) => setForm((p) => ({ ...p, locationCenter: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Data evaluarii *</label>
          <input className="input" type="date" value={form.assessmentDate} onChange={(e) => setForm((p) => ({ ...p, assessmentDate: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Persoana responsabila *</label>
          <input className="input" placeholder="Persoana responsabila" value={form.responsiblePerson} onChange={(e) => setForm((p) => ({ ...p, responsiblePerson: e.target.value }))} />
        </div>
      </div>
    </div>
  );
}

function StepSocial({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">B) Situatie sociala</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-slate-400">Are familie?</label>
          <select className="input" value={form.familySupport} onChange={(e) => setForm((p) => ({ ...p, familySupport: e.target.value as FormState['familySupport'] }))}>
            {familySupportOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Stare locativa</label>
          <select className="input" value={form.housingStatus} onChange={(e) => setForm((p) => ({ ...p, housingStatus: e.target.value as FormState['housingStatus'] }))}>
            {housingOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Frecventa contact familie</label>
          <input className="input" placeholder="Ex: saptamanal, lunar, niciodata" value={form.familyContactFrequency} onChange={(e) => setForm((p) => ({ ...p, familyContactFrequency: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Istoric institutionalizare</label>
          <input className="input" placeholder="Ex: 3 ani centru de plasament" value={form.institutionalizationHistory} onChange={(e) => setForm((p) => ({ ...p, institutionalizationHistory: e.target.value }))} />
        </div>
      </div>
    </div>
  );
}

function StepMedical({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">C) Stare medicala (optional, cu acord)</h3>
      <p className="text-xs text-slate-500">Datele medicale sunt optionale si necesita acord scris conform GDPR.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-slate-400">Boli cunoscute</label>
          <select className="input" value={form.knownDiseases} onChange={(e) => setForm((p) => ({ ...p, knownDiseases: e.target.value as FormState['knownDiseases'] }))}>
            {yesNoUnknownOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Evaluare psihologica anterioara</label>
          <select className="input" value={form.previousPsychEvaluation} onChange={(e) => setForm((p) => ({ ...p, previousPsychEvaluation: e.target.value as FormState['previousPsychEvaluation'] }))}>
            {yesNoUnknownOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Medicatie</label>
          <input className="input" placeholder="Medicatie curenta (optional)" value={form.medicationInfo} onChange={(e) => setForm((p) => ({ ...p, medicationInfo: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Handicap / limitari</label>
          <input className="input" placeholder="Limitari functionale (optional)" value={form.limitations} onChange={(e) => setForm((p) => ({ ...p, limitations: e.target.value }))} />
        </div>
      </div>
    </div>
  );
}

function StepBehavior({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">D) Comportament observat</h3>
      <p className="text-xs text-slate-500">Scale de observare directa - selectati nivelul corespunzator pentru fiecare indicator.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-slate-400">Nivel de comunicare</label>
          <select className="input" value={form.communicationLevel} onChange={(e) => setForm((p) => ({ ...p, communicationLevel: e.target.value as FormState['communicationLevel'] }))}>
            {communicationOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Reactie la stres</label>
          <select className="input" value={form.stressReaction} onChange={(e) => setForm((p) => ({ ...p, stressReaction: e.target.value as FormState['stressReaction'] }))}>
            {stressOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Relationare</label>
          <select className="input" value={form.relationshipStyle} onChange={(e) => setForm((p) => ({ ...p, relationshipStyle: e.target.value as FormState['relationshipStyle'] }))}>
            {relationshipOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Autonomie</label>
          <select className="input" value={form.autonomyLevel} onChange={(e) => setForm((p) => ({ ...p, autonomyLevel: e.target.value as FormState['autonomyLevel'] }))}>
            {autonomyOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Somn</label>
          <select className="input" value={form.sleepQuality} onChange={(e) => setForm((p) => ({ ...p, sleepQuality: e.target.value as FormState['sleepQuality'] }))}>
            {sleepOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Apetit</label>
          <select className="input" value={form.appetite} onChange={(e) => setForm((p) => ({ ...p, appetite: e.target.value as FormState['appetite'] }))}>
            {appetiteOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

function StepEmotional({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">E) Stare emotionala + F) Poza / Observatii</h3>

      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 space-y-2">
        <p className="text-xs font-medium text-slate-400 mb-2">Indicatori emotionali (auto-raportat / observat):</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.sadnessFrequent} onChange={(e) => setForm((p) => ({ ...p, sadnessFrequent: e.target.checked }))} />
            Tristete frecventa
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.anxiety} onChange={(e) => setForm((p) => ({ ...p, anxiety: e.target.checked }))} />
            Anxietate
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.anger} onChange={(e) => setForm((p) => ({ ...p, anger: e.target.checked }))} />
            Furie
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.apathy} onChange={(e) => setForm((p) => ({ ...p, apathy: e.target.checked }))} />
            Apatie
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={form.hopeMotivation} onChange={(e) => setForm((p) => ({ ...p, hopeMotivation: e.target.checked }))} />
            Exista speranta / motivatie observata
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs text-amber-300 mb-2">Poza - doar cu consimtamant legal. Folosire exclusiv pentru identificare, NU pentru analiza faciala.</p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.photoConsent} onChange={(e) => setForm((p) => ({ ...p, photoConsent: e.target.checked }))} />
              Consimtamant legal pentru poza
            </label>
            <input className="input" placeholder="Referinta poza (optional)" value={form.photoReference} onChange={(e) => setForm((p) => ({ ...p, photoReference: e.target.value }))} disabled={!form.photoConsent} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">Observatii suplimentare</label>
          <textarea className="input min-h-[80px]" placeholder="Observatii din evaluare..." value={form.observations} onChange={(e) => setForm((p) => ({ ...p, observations: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Semnatura responsabil (optional)</label>
          <input className="input" placeholder="Semnatura responsabil" value={form.signatureResponsible} onChange={(e) => setForm((p) => ({ ...p, signatureResponsible: e.target.value }))} />
        </div>

        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={form.gdprConsent} onChange={(e) => setForm((p) => ({ ...p, gdprConsent: e.target.checked }))} />
            <span>
              <strong>Acord GDPR</strong> - Confirm ca am obtinut acordul scris al beneficiarului (sau al reprezentantului legal) pentru prelucrarea datelor cu caracter personal, conform Regulamentului (UE) 2016/679. Datele vor fi folosite exclusiv in scopul sprijinirii si monitorizarii orientative.
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

function ProfileSection({ title, children, color = 'slate' }: { title: string; children: React.ReactNode; color?: string }) {
  const borderClass = color === 'blue' ? 'border-blue-500/30' : color === 'amber' ? 'border-amber-500/30' : color === 'emerald' ? 'border-emerald-500/30' : color === 'rose' ? 'border-rose-500/30' : 'border-slate-800';
  return (
    <div className={`rounded-lg border ${borderClass} bg-slate-950/60 p-3`}>
      <p className="font-medium text-sm mb-1">{title}</p>
      <div className="text-slate-300 text-sm">{children}</div>
    </div>
  );
}

export function PsychosocialProfileManager({ workspaceId, initialProfiles }: Props) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [selectedId, setSelectedId] = useState<string | null>(initialProfiles[0]?.id ?? null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<'openai' | 'claude' | 'gemini'>('openai');
  const [lastModel, setLastModel] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [view, setView] = useState<'form' | 'detail' | 'log'>('form');
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const selectedProfile = useMemo(() => profiles.find((p) => p.id === selectedId) ?? null, [profiles, selectedId]);

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
    if (!json.profiles.some((p: PsychosocialProfile) => p.id === selectedId)) {
      setSelectedId(json.profiles[0]?.id ?? null);
    }
  }

  function submitProfile(event: FormEvent) {
    event.preventDefault();
    resetNotices();

    if (!form.gdprConsent) {
      setError('Trebuie sa acceptati acordul GDPR inainte de a genera profilul.');
      return;
    }
    if (!form.internalName || !form.sex || !form.locationCenter || !form.responsiblePerson) {
      setError('Completati toate campurile obligatorii din pasul 1 (Date de baza).');
      return;
    }

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
          gdprConsent: form.gdprConsent,
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
            : 'Profil psihosocial orientativ generat cu succes. PDF-ul poate fi descarcat.'
        );
        setForm(INITIAL_FORM);
        setWizardStep(0);
        setSelectedId(json.profile.id);
        setView('detail');
        await reloadProfiles();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Eroare la salvarea profilului');
      }
    });
  }

  async function deleteProfile(profileId: string) {
    resetNotices();
    startTransition(async () => {
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/psychosocial-profiles/${profileId}`, { method: 'DELETE' });
        if (!response.ok) {
          const json = await response.json();
          setError(json.error || 'Nu am putut sterge profilul');
          return;
        }
        setMessage('Profilul a fost sters.');
        setDeleteConfirm(null);
        setSelectedId(null);
        setView('form');
        await reloadProfiles();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Eroare la stergerea profilului');
      }
    });
  }

  async function loadAccessLogs(profileId: string) {
    resetNotices();
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/psychosocial-profiles/${profileId}/access-log`);
      const json = await response.json();
      if (!response.ok) {
        setError(json.error || 'Nu am putut incarca jurnalul de acces');
        return;
      }
      setAccessLogs(json.logs);
      setView('log');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Eroare la incarcarea jurnalului');
    }
  }

  function selectProfile(id: string) {
    setSelectedId(id);
    setView('detail');
    resetNotices();
  }

  const canGoNext = wizardStep < WIZARD_STEPS.length - 1;
  const canGoPrev = wizardStep > 0;
  const isLastStep = wizardStep === WIZARD_STEPS.length - 1;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
        <strong>Scopul modulului:</strong> profil orientativ de sprijin, monitorizare si recomandari pentru personal. <strong>Nu emite diagnostice medicale.</strong>
      </section>

      <section className="rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-300">Provider AI:</span>
          <select className="input max-w-[180px]" value={aiProvider} onChange={(e) => setAiProvider(e.target.value as typeof aiProvider)}>
            <option value="openai">OpenAI</option>
            <option value="claude">Claude</option>
            <option value="gemini">Gemini</option>
          </select>
          <span className="text-xs text-slate-400">Model: {lastModel || 'inca nefolosit'}</span>
          <div className="ml-auto flex gap-2">
            <button className={`btn text-xs ${view === 'form' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setView('form'); resetNotices(); }}>
              Evaluare noua
            </button>
            {selectedProfile && (
              <button className={`btn text-xs ${view === 'detail' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setView('detail'); resetNotices(); }}>
                Profil selectat
              </button>
            )}
          </div>
        </div>
      </section>

      {message && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">{message}</p>}
      {error && <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">{error}</p>}

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Left side: form or detail */}
        {view === 'form' && (
          <article className="card p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold">Evaluare profil psihosocial</h2>
            </div>

            <WizardStepIndicator steps={WIZARD_STEPS} currentStep={wizardStep} onStepClick={setWizardStep} />

            <form className="mt-5" onSubmit={submitProfile}>
              {wizardStep === 0 && <StepBasic form={form} setForm={setForm} />}
              {wizardStep === 1 && <StepSocial form={form} setForm={setForm} />}
              {wizardStep === 2 && <StepMedical form={form} setForm={setForm} />}
              {wizardStep === 3 && <StepBehavior form={form} setForm={setForm} />}
              {wizardStep === 4 && <StepEmotional form={form} setForm={setForm} />}

              <div className="mt-5 flex items-center justify-between gap-3">
                <button type="button" className="btn btn-secondary" disabled={!canGoPrev} onClick={() => setWizardStep((s) => s - 1)}>
                  Inapoi
                </button>
                <div className="flex gap-2">
                  {canGoNext && (
                    <button type="button" className="btn btn-primary" onClick={() => setWizardStep((s) => s + 1)}>
                      Urmatorul pas
                    </button>
                  )}
                  {isLastStep && (
                    <button type="submit" className="btn btn-primary" disabled={pending}>
                      {pending ? 'Se genereaza...' : 'Genereaza profil orientativ'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </article>
        )}

        {view === 'detail' && selectedProfile && (
          <article className="card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{selectedProfile.internalName}</h2>
                <p className="text-xs text-slate-400">
                  {selectedProfile.age} ani - {selectedProfile.locationCenter} - {new Date(selectedProfile.assessmentDate).toLocaleDateString('ro-RO')}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Versiune: {selectedProfile.version ?? 1} | Responsabil: {selectedProfile.responsiblePerson}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <a className="btn btn-primary text-xs" href={`/api/workspaces/${workspaceId}/psychosocial-profiles/${selectedProfile.id}/pdf`}>
                  PDF
                </a>
                <button className="btn btn-secondary text-xs" onClick={() => loadAccessLogs(selectedProfile.id)}>
                  Jurnal acces
                </button>
              </div>
            </div>

            {selectedProfile.gdprConsent && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs text-emerald-300">
                Acord GDPR inregistrat{selectedProfile.gdprConsentDate ? ` la ${new Date(selectedProfile.gdprConsentDate).toLocaleDateString('ro-RO')}` : ''}
              </div>
            )}

            <ProfileSection title="1. Context personal" color="blue">
              <p>{selectedProfile.contextPersonal}</p>
            </ProfileSection>

            <ProfileSection title="2. Profil emotional" color="blue">
              <p>{selectedProfile.emotionalProfile}</p>
            </ProfileSection>

            <ProfileSection title="3. Nevoi principale" color="amber">
              <ul className="list-disc pl-5 space-y-0.5">
                {selectedProfile.mainNeeds.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            </ProfileSection>

            <ProfileSection title="4. Riscuri" color="rose">
              <ul className="list-disc pl-5 space-y-0.5">
                {selectedProfile.risks.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            </ProfileSection>

            <ProfileSection title="5. Recomandari pentru personal" color="emerald">
              <ul className="list-disc pl-5 space-y-0.5">
                {selectedProfile.staffRecommendations.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            </ProfileSection>

            <ProfileSection title="6. Plan de sprijin" color="emerald">
              <ul className="list-disc pl-5 space-y-0.5">
                {selectedProfile.supportPlan.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            </ProfileSection>

            {selectedProfile.observations && (
              <ProfileSection title="Observatii">
                <p>{selectedProfile.observations}</p>
              </ProfileSection>
            )}

            <div className="pt-2 border-t border-slate-800">
              {deleteConfirm === selectedProfile.id ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-rose-300">Sigur doriti stergerea?</span>
                  <button className="btn text-xs bg-rose-600 text-white hover:bg-rose-500" disabled={pending} onClick={() => deleteProfile(selectedProfile.id)}>
                    {pending ? 'Se sterge...' : 'Da, sterge'}
                  </button>
                  <button className="btn btn-secondary text-xs" onClick={() => setDeleteConfirm(null)}>Anuleaza</button>
                </div>
              ) : (
                <button className="text-xs text-rose-400 hover:text-rose-300 transition" onClick={() => setDeleteConfirm(selectedProfile.id)}>
                  Sterge profilul
                </button>
              )}
            </div>
          </article>
        )}

        {view === 'detail' && !selectedProfile && (
          <article className="card p-5">
            <p className="text-sm text-slate-400">Nu exista un profil selectat. Creati o evaluare noua sau selectati din istoric.</p>
          </article>
        )}

        {view === 'log' && (
          <article className="card p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Jurnal acces - {selectedProfile?.internalName}</h2>
              <button className="btn btn-secondary text-xs" onClick={() => setView('detail')}>Inapoi la profil</button>
            </div>
            <p className="text-xs text-slate-500">Conformitate GDPR: loguri de acces la datele personale.</p>
            <div className="max-h-[500px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Actiune</th>
                    <th className="px-3 py-2">Utilizator</th>
                    <th className="px-3 py-2">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {accessLogs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-900/70">
                      <td className="px-3 py-2">
                        <span className="badge">{ACTION_LABELS[log.action] || log.action}</span>
                      </td>
                      <td className="px-3 py-2 text-xs">{log.actor.name || log.actor.email}</td>
                      <td className="px-3 py-2 text-xs text-slate-400">{new Date(log.createdAt).toLocaleString('ro-RO')}</td>
                    </tr>
                  ))}
                  {!accessLogs.length && (
                    <tr>
                      <td className="px-3 py-4 text-slate-400" colSpan={3}>Nu exista loguri de acces.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        )}

        {/* Right side: history list */}
        <div className="space-y-5">
          <article className="card overflow-hidden">
            <div className="border-b border-slate-800 px-4 py-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Arhiva profile ({profiles.length})</h3>
            </div>
            <div className="max-h-[600px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Beneficiar</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Riscuri</th>
                    <th className="px-4 py-3">V</th>
                    <th className="px-4 py-3">Actiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr key={profile.id} className={`border-b border-slate-900/70 ${profile.id === selectedId ? 'bg-blue-500/5' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{profile.internalName}</p>
                        <p className="text-xs text-slate-400">{profile.locationCenter}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">{new Date(profile.assessmentDate).toLocaleDateString('ro-RO')}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${profile.risks.length >= 3 ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-slate-700'}`}>
                          {profile.risks.length}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{profile.version ?? 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button className="btn btn-secondary h-7 px-2 text-xs" onClick={() => selectProfile(profile.id)}>
                            Vezi
                          </button>
                          <a className="btn btn-secondary h-7 px-2 text-xs" href={`/api/workspaces/${workspaceId}/psychosocial-profiles/${profile.id}/pdf`}>
                            PDF
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!profiles.length && (
                    <tr>
                      <td className="px-4 py-4 text-slate-400" colSpan={5}>
                        Nu exista profile inregistrate. Completati formularul de evaluare.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs text-slate-500 space-y-1">
            <p><strong>Legal & Etic:</strong></p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>GDPR compliance: acordul scris este obligatoriu</li>
              <li>Confidentialitate: acces limitat pe baza de rol</li>
              <li>Log acces: fiecare vizualizare / descarcare este inregistrata</li>
              <li>Fara diagnostice: doar profil orientativ de sprijin</li>
              <li>Poza: doar pentru identificare, doar cu consimtamant</li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
}
