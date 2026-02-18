'use client';

import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react';

type MedicationItem = {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  shelf: string | null;
  stockQuantity: number;
  minStockThreshold: number;
  unit: string;
  dailyUsage: number | null;
  lastUnitPrice: number | null;
  lastPurchaseAt: string | null;
  expiresAt: string | null;
  notifyOnLowStock: boolean;
  purchases: Array<{ unitPrice: number | null; purchasedAt: string }>;
};

type MedicationAlert = {
  itemId: string;
  name: string;
  category: string;
  categoryLabel: string;
  shelf: string | null;
  type: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'EXPIRING_SOON';
  stockQuantity: number;
  minStockThreshold: number;
  unit: string;
  missingQuantity: number;
  expiresAt: string | null;
  predictedRunoutAt: string | null;
  predictedUnitPrice: number | null;
};

type MedicationSummary = {
  outOfStock: number;
  lowStock: number;
  expiringSoon: number;
};

type MedicationPreference = {
  phoneNumber: string | null;
  enablePhoneAlerts: boolean;
  enableLowStockAlerts: boolean;
  enableExpiryAlerts: boolean;
  expiryAlertDays: number;
};

type ForecastPriority = {
  name: string;
  reason: string;
  recommendedQuantity: number;
  estimatedUnitPriceRon: number | null;
  estimatedTotalRon: number | null;
  urgency: 'high' | 'medium' | 'low';
};

type AIForecastPayload = {
  summary: string;
  totalEstimatedBudgetRon: number | null;
  priorityOrders: ForecastPriority[];
  recommendations: string[];
};

type Props = {
  workspaceId: string;
  initialItems: MedicationItem[];
  initialAlerts: MedicationAlert[];
  initialSummary: MedicationSummary;
  initialPreference: MedicationPreference;
  initialPhoneNotificationPreview: string | null;
};

const CATEGORY_OPTIONS = [
  { value: 'CARDIO', label: 'Cardio' },
  { value: 'DIABET', label: 'Diabet' },
  { value: 'GASTRO', label: 'Gastro' },
  { value: 'RESPIRATOR', label: 'Respirator' },
  { value: 'NEURO', label: 'Neuro' },
  { value: 'PSIHIATRIC', label: 'Psihiatric' },
  { value: 'ANTIBIOTICE', label: 'Antibiotice' },
  { value: 'DURERE', label: 'Durere' },
  { value: 'ALERGII', label: 'Alergii' },
  { value: 'DERMATO', label: 'Dermato' },
  { value: 'VITAMINE', label: 'Vitamine' },
  { value: 'ALTELE', label: 'Altele' }
] as const;

type MedicationCategoryValue = (typeof CATEGORY_OPTIONS)[number]['value'];

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('ro-RO');
}

function formatDateTime(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('ro-RO');
}

function formatCurrency(value: number | null) {
  if (value === null) return '-';
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', maximumFractionDigits: 2 }).format(value);
}

function estimateRunout(stockQuantity: number, dailyUsage: number | null) {
  if (!dailyUsage || dailyUsage <= 0) return null;
  const days = Math.floor(stockQuantity / dailyUsage);
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return date.toLocaleDateString('ro-RO');
}

function alertTypeLabel(type: MedicationAlert['type']) {
  if (type === 'OUT_OF_STOCK') return 'Lipsa';
  if (type === 'LOW_STOCK') return 'Stoc redus';
  return 'Expira curand';
}

export function MedicationHub({
  workspaceId,
  initialItems,
  initialAlerts,
  initialSummary,
  initialPreference,
  initialPhoneNotificationPreview
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [summary, setSummary] = useState(initialSummary);
  const [forecast, setForecast] = useState<AIForecastPayload | null>(null);
  const [forecastModel, setForecastModel] = useState<string | null>(null);
  const [phonePreview, setPhonePreview] = useState<string | null>(initialPhoneNotificationPreview);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [forecastProvider, setForecastProvider] = useState<'openai' | 'claude' | 'gemini'>('openai');
  const [forecastHorizonDays, setForecastHorizonDays] = useState(30);

  const [preferenceDraft, setPreferenceDraft] = useState({
    phoneNumber: initialPreference.phoneNumber ?? '',
    enablePhoneAlerts: initialPreference.enablePhoneAlerts,
    enableLowStockAlerts: initialPreference.enableLowStockAlerts,
    enableExpiryAlerts: initialPreference.enableExpiryAlerts,
    expiryAlertDays: initialPreference.expiryAlertDays
  });

  const [addForm, setAddForm] = useState<{
    name: string;
    category: MedicationCategoryValue;
    shelf: string;
    stockQuantity: string;
    minStockThreshold: string;
    unit: string;
    dailyUsage: string;
    lastUnitPrice: string;
    expiresAt: string;
    notes: string;
    notifyOnLowStock: boolean;
  }>({
    name: '',
    category: CATEGORY_OPTIONS[0]?.value ?? 'CARDIO',
    shelf: '',
    stockQuantity: '0',
    minStockThreshold: '1',
    unit: 'cutii',
    dailyUsage: '',
    lastUnitPrice: '',
    expiresAt: '',
    notes: '',
    notifyOnLowStock: true
  });

  const [purchaseForm, setPurchaseForm] = useState({
    itemId: initialItems[0]?.id ?? '',
    quantity: '',
    unitPrice: '',
    purchasedAt: new Date().toISOString().slice(0, 10),
    supplier: '',
    updateStock: true
  });

  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialItems.map((item) => [item.id, String(item.stockQuantity)]))
  );

  useEffect(() => {
    if (!items.length) {
      setPurchaseForm((prev) => ({ ...prev, itemId: '' }));
      return;
    }
    if (items.some((item) => item.id === purchaseForm.itemId)) return;
    setPurchaseForm((prev) => ({ ...prev, itemId: items[0]!.id }));
  }, [items, purchaseForm.itemId]);

  const criticalAlerts = useMemo(() => alerts.filter((alert) => alert.type === 'OUT_OF_STOCK').length, [alerts]);

  async function reloadData() {
    const response = await fetch(`/api/workspaces/${workspaceId}/medications`);
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error || 'Nu am putut actualiza datele');
    }
    setItems(json.items);
    setAlerts(json.alerts);
    setSummary(json.summary);
    setPhonePreview(json.phoneNotificationPreview ?? null);
    setPreferenceDraft({
      phoneNumber: json.preference.phoneNumber ?? '',
      enablePhoneAlerts: json.preference.enablePhoneAlerts,
      enableLowStockAlerts: json.preference.enableLowStockAlerts,
      enableExpiryAlerts: json.preference.enableExpiryAlerts,
      expiryAlertDays: json.preference.expiryAlertDays
    });
    setStockDrafts(Object.fromEntries(json.items.map((item: MedicationItem) => [item.id, String(item.stockQuantity)])));
  }

  function resetNotices() {
    setError(null);
    setMessage(null);
  }

  function submitAddMedication(event: FormEvent) {
    event.preventDefault();
    resetNotices();
    startTransition(async () => {
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/medications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: addForm.name,
            category: addForm.category,
            shelf: addForm.shelf || null,
            stockQuantity: Number(addForm.stockQuantity),
            minStockThreshold: Number(addForm.minStockThreshold),
            unit: addForm.unit,
            dailyUsage: addForm.dailyUsage ? Number(addForm.dailyUsage) : null,
            lastUnitPrice: addForm.lastUnitPrice ? Number(addForm.lastUnitPrice) : null,
            expiresAt: addForm.expiresAt || null,
            notes: addForm.notes || null,
            notifyOnLowStock: addForm.notifyOnLowStock
          })
        });
        const json = await response.json();
        if (!response.ok) {
          setError(json.error || 'Nu am putut salva medicamentul');
          return;
        }
        setAddForm((prev) => ({
          ...prev,
          name: '',
          shelf: '',
          stockQuantity: '0',
          minStockThreshold: '1',
          dailyUsage: '',
          lastUnitPrice: '',
          expiresAt: '',
          notes: ''
        }));
        setMessage('Medicament adaugat cu succes.');
        await reloadData();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Eroare la salvare');
      }
    });
  }

  function savePreference(event: FormEvent) {
    event.preventDefault();
    resetNotices();
    startTransition(async () => {
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/medications/preferences`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: preferenceDraft.phoneNumber || null,
            enablePhoneAlerts: preferenceDraft.enablePhoneAlerts,
            enableLowStockAlerts: preferenceDraft.enableLowStockAlerts,
            enableExpiryAlerts: preferenceDraft.enableExpiryAlerts,
            expiryAlertDays: Number(preferenceDraft.expiryAlertDays)
          })
        });
        const json = await response.json();
        if (!response.ok) {
          setError(json.error || 'Nu am putut salva preferintele');
          return;
        }
        setMessage('Preferintele de notificare au fost actualizate.');
        await reloadData();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Eroare la salvare preferinte');
      }
    });
  }

  function runAIForecast(event: FormEvent) {
    event.preventDefault();
    resetNotices();
    startTransition(async () => {
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/medications/forecast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: forecastProvider,
            horizonDays: forecastHorizonDays
          })
        });
        const json = await response.json();
        if (!response.ok) {
          setError(json.error || 'Nu am putut rula predictia AI');
          return;
        }
        setForecast(json.forecast);
        setForecastModel(json.model || null);
        setMessage('Predictie AI generata din datele reale ale stocului.');
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Eroare la predictia AI');
      }
    });
  }

  function submitPurchase(event: FormEvent) {
    event.preventDefault();
    resetNotices();
    if (!purchaseForm.itemId) {
      setError('Selecteaza un medicament pentru aprovizionare.');
      return;
    }
    startTransition(async () => {
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/medications/${purchaseForm.itemId}/purchases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quantity: Number(purchaseForm.quantity),
            unitPrice: purchaseForm.unitPrice ? Number(purchaseForm.unitPrice) : null,
            purchasedAt: purchaseForm.purchasedAt,
            supplier: purchaseForm.supplier || null,
            updateStock: purchaseForm.updateStock
          })
        });
        const json = await response.json();
        if (!response.ok) {
          setError(json.error || 'Nu am putut inregistra aprovizionarea');
          return;
        }
        setPurchaseForm((prev) => ({
          ...prev,
          quantity: '',
          unitPrice: '',
          supplier: ''
        }));
        setMessage('Aprovizionare inregistrata.');
        await reloadData();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Eroare la aprovizionare');
      }
    });
  }

  function saveStock(itemId: string) {
    resetNotices();
    startTransition(async () => {
      try {
        const nextStock = Number(stockDrafts[itemId]);
        const response = await fetch(`/api/workspaces/${workspaceId}/medications/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stockQuantity: nextStock })
        });
        const json = await response.json();
        if (!response.ok) {
          setError(json.error || 'Nu am putut actualiza stocul');
          return;
        }
        setMessage('Stoc actualizat.');
        await reloadData();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Eroare la actualizare stoc');
      }
    });
  }

  function deleteItem(itemId: string) {
    resetNotices();
    startTransition(async () => {
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/medications/${itemId}`, {
          method: 'DELETE'
        });
        const json = await response.json();
        if (!response.ok) {
          setError(json.error || 'Nu am putut sterge medicamentul');
          return;
        }
        setMessage('Medicament sters.');
        await reloadData();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Eroare la stergere');
      }
    });
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Lipsa critica</p>
          <p className="mt-2 text-2xl font-semibold text-rose-200">{summary.outOfStock}</p>
        </article>
        <article className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Stoc redus</p>
          <p className="mt-2 text-2xl font-semibold text-amber-200">{summary.lowStock}</p>
        </article>
        <article className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Expira curand</p>
          <p className="mt-2 text-2xl font-semibold text-purple-200">{summary.expiringSoon}</p>
        </article>
      </section>

      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Lista alerte operative</h2>
            <p className="text-sm text-slate-400">
              {criticalAlerts > 0
                ? 'Ai alerte critice de stoc. Prioritizeaza aprovizionarea.'
                : 'Nicio alerta critica in acest moment.'}
            </p>
          </div>
          <a className="btn btn-primary" href={`/api/workspaces/${workspaceId}/medications/exports/missing-pdf`}>
            Descarca PDF lipsuri
          </a>
        </div>
        <div className="mt-3 grid gap-2">
          {alerts.length ? (
            alerts.slice(0, 12).map((alert) => (
              <div key={`${alert.itemId}-${alert.type}`} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm">
                <p className="font-medium">
                  {alert.name} - {alertTypeLabel(alert.type)} ({alert.categoryLabel})
                </p>
                <p className="text-slate-400">
                  Stoc {alert.stockQuantity}/{alert.minStockThreshold} {alert.unit}
                  {alert.type === 'EXPIRING_SOON' ? ` | Expira: ${formatDate(alert.expiresAt)}` : ''}
                  {alert.predictedRunoutAt ? ` | Epuizare estimata: ${formatDate(alert.predictedRunoutAt)}` : ''}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-emerald-300">Nu exista alerte active.</p>
          )}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="card overflow-hidden">
          <div className="border-b border-slate-800 px-4 py-3">
            <h2 className="text-lg font-semibold">Inventar medicamente pe rafturi</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Medicament</th>
                  <th className="px-4 py-3">Raft / categorie</th>
                  <th className="px-4 py-3">Stoc</th>
                  <th className="px-4 py-3">Predictie</th>
                  <th className="px-4 py-3">Ultim pret</th>
                  <th className="px-4 py-3">Actiuni</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-900/70 align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-slate-400">Ultima achizitie: {formatDateTime(item.lastPurchaseAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <p>{item.categoryLabel}</p>
                      <p className="text-xs text-slate-400">{item.shelf ? `Raft ${item.shelf}` : 'Raft nespecificat'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>
                        {item.stockQuantity} / prag {item.minStockThreshold} {item.unit}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          className="input h-8 max-w-[110px] text-xs"
                          type="number"
                          step="0.1"
                          value={stockDrafts[item.id] ?? ''}
                          onChange={(event) => setStockDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))}
                        />
                        <button className="btn btn-secondary h-8 px-3 text-xs" onClick={() => saveStock(item.id)} disabled={pending}>
                          Salveaza
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      <p>Epuizare: {estimateRunout(item.stockQuantity, item.dailyUsage) || '-'}</p>
                      <p>Consum/zi: {item.dailyUsage ?? '-'} {item.unit}</p>
                      <p>Expira: {formatDate(item.expiresAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">{formatCurrency(item.lastUnitPrice)}</td>
                    <td className="px-4 py-3">
                      <button className="btn btn-secondary h-8 px-3 text-xs text-rose-200" onClick={() => deleteItem(item.id)} disabled={pending}>
                        Sterge
                      </button>
                    </td>
                  </tr>
                ))}
                {!items.length ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-400" colSpan={6}>
                      Nu exista medicamente inregistrate.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <div className="space-y-5">
          <article className="card p-4">
            <h3 className="text-lg font-semibold">Predictie AI aprovizionare</h3>
            <p className="mt-1 text-sm text-slate-400">
              Ruleaza forecast cu OpenAI, Claude sau Gemini pe stocurile reale din sistem.
            </p>
            <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={runAIForecast}>
              <select className="input" value={forecastProvider} onChange={(event) => setForecastProvider(event.target.value as typeof forecastProvider)}>
                <option value="openai">OpenAI</option>
                <option value="claude">Claude</option>
                <option value="gemini">Gemini</option>
              </select>
              <input
                className="input"
                type="number"
                min={7}
                max={120}
                value={forecastHorizonDays}
                onChange={(event) => setForecastHorizonDays(Math.max(7, Math.min(120, Number(event.target.value) || 30)))}
              />
              <button className="btn btn-primary sm:col-span-2" disabled={pending}>
                {pending ? 'Se ruleaza...' : 'Genereaza forecast AI'}
              </button>
            </form>
            {forecast ? (
              <div className="mt-3 space-y-2 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Model: {forecastModel || '-'} | Buget estimat: {formatCurrency(forecast.totalEstimatedBudgetRon)}
                </p>
                <p>{forecast.summary}</p>
                <div>
                  <p className="font-medium">Prioritati</p>
                  <ul className="mt-1 space-y-1 text-xs text-slate-200">
                    {forecast.priorityOrders.slice(0, 6).map((order) => (
                      <li key={`${order.name}-${order.reason}`}>
                        - [{order.urgency}] {order.name}: {order.recommendedQuantity} u. ({formatCurrency(order.estimatedTotalRon)}) - {order.reason}
                      </li>
                    ))}
                  </ul>
                </div>
                {forecast.recommendations.length ? (
                  <div>
                    <p className="font-medium">Recomandari</p>
                    <ul className="mt-1 list-disc pl-5 text-xs text-slate-200">
                      {forecast.recommendations.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </article>

          <article className="card p-4">
            <h3 className="text-lg font-semibold">Notificari telefon</h3>
            <p className="mt-1 text-sm text-slate-400">
              Configureaza un numar de telefon pentru a exporta rapid mesajul de alerta catre echipa.
            </p>
            <form className="mt-3 space-y-3" onSubmit={savePreference}>
              <input
                className="input"
                placeholder="+40..."
                value={preferenceDraft.phoneNumber}
                onChange={(event) => setPreferenceDraft((prev) => ({ ...prev, phoneNumber: event.target.value }))}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={preferenceDraft.enablePhoneAlerts}
                  onChange={(event) => setPreferenceDraft((prev) => ({ ...prev, enablePhoneAlerts: event.target.checked }))}
                />
                Activeaza alerte telefonice
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={preferenceDraft.enableLowStockAlerts}
                  onChange={(event) => setPreferenceDraft((prev) => ({ ...prev, enableLowStockAlerts: event.target.checked }))}
                />
                Include alerte stoc redus/lipsa
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={preferenceDraft.enableExpiryAlerts}
                  onChange={(event) => setPreferenceDraft((prev) => ({ ...prev, enableExpiryAlerts: event.target.checked }))}
                />
                Include alerte expirare
              </label>
              <div>
                <label className="text-sm text-slate-300">Expirare in urmatoarele (zile)</label>
                <input
                  className="input mt-1"
                  type="number"
                  min={1}
                  max={180}
                  value={preferenceDraft.expiryAlertDays}
                  onChange={(event) =>
                    setPreferenceDraft((prev) => ({ ...prev, expiryAlertDays: Number(event.target.value) || prev.expiryAlertDays }))
                  }
                />
              </div>
              <button className="btn btn-primary w-full" disabled={pending}>
                {pending ? 'Se salveaza...' : 'Salveaza preferinte'}
              </button>
            </form>
            {phonePreview ? (
              <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Preview mesaj telefon</p>
                <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-200">{phonePreview}</pre>
              </div>
            ) : null}
          </article>

          <article className="card p-4">
            <h3 className="text-lg font-semibold">Adauga medicament</h3>
            <form className="mt-3 space-y-3" onSubmit={submitAddMedication}>
              <input
                className="input"
                placeholder="Nume medicament"
                value={addForm.name}
                onChange={(event) => setAddForm((prev) => ({ ...prev, name: event.target.value }))}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  className="input"
                  value={addForm.category}
                  onChange={(event) => setAddForm((prev) => ({ ...prev, category: event.target.value as MedicationCategoryValue }))}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  placeholder="Raft (ex: A1)"
                  value={addForm.shelf}
                  onChange={(event) => setAddForm((prev) => ({ ...prev, shelf: event.target.value }))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className="input"
                  type="number"
                  step="0.1"
                  min={0}
                  placeholder="Stoc curent"
                  value={addForm.stockQuantity}
                  onChange={(event) => setAddForm((prev) => ({ ...prev, stockQuantity: event.target.value }))}
                />
                <input
                  className="input"
                  type="number"
                  step="0.1"
                  min={0}
                  placeholder="Prag minim"
                  value={addForm.minStockThreshold}
                  onChange={(event) => setAddForm((prev) => ({ ...prev, minStockThreshold: event.target.value }))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className="input"
                  placeholder="Unitate (cutii, fiole...)"
                  value={addForm.unit}
                  onChange={(event) => setAddForm((prev) => ({ ...prev, unit: event.target.value }))}
                />
                <input
                  className="input"
                  type="number"
                  step="0.1"
                  min={0}
                  placeholder="Consum/zi"
                  value={addForm.dailyUsage}
                  onChange={(event) => setAddForm((prev) => ({ ...prev, dailyUsage: event.target.value }))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="Ultim pret unitar (RON)"
                  value={addForm.lastUnitPrice}
                  onChange={(event) => setAddForm((prev) => ({ ...prev, lastUnitPrice: event.target.value }))}
                />
                <input
                  className="input"
                  type="date"
                  value={addForm.expiresAt}
                  onChange={(event) => setAddForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
                />
              </div>
              <textarea
                className="input min-h-[90px]"
                placeholder="Observatii"
                value={addForm.notes}
                onChange={(event) => setAddForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={addForm.notifyOnLowStock}
                  onChange={(event) => setAddForm((prev) => ({ ...prev, notifyOnLowStock: event.target.checked }))}
                />
                Alerta cand stocul coboara sub prag
              </label>
              <button className="btn btn-primary w-full" disabled={pending}>
                {pending ? 'Se salveaza...' : 'Adauga medicament'}
              </button>
            </form>
          </article>

          <article className="card p-4">
            <h3 className="text-lg font-semibold">Inregistreaza aprovizionare</h3>
            <form className="mt-3 space-y-3" onSubmit={submitPurchase}>
              <select className="input" value={purchaseForm.itemId} onChange={(event) => setPurchaseForm((prev) => ({ ...prev, itemId: event.target.value }))}>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.stockQuantity} {item.unit})
                  </option>
                ))}
              </select>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className="input"
                  type="number"
                  step="0.1"
                  min={0}
                  placeholder="Cantitate"
                  value={purchaseForm.quantity}
                  onChange={(event) => setPurchaseForm((prev) => ({ ...prev, quantity: event.target.value }))}
                />
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="Pret unitar (RON)"
                  value={purchaseForm.unitPrice}
                  onChange={(event) => setPurchaseForm((prev) => ({ ...prev, unitPrice: event.target.value }))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className="input"
                  type="date"
                  value={purchaseForm.purchasedAt}
                  onChange={(event) => setPurchaseForm((prev) => ({ ...prev, purchasedAt: event.target.value }))}
                />
                <input
                  className="input"
                  placeholder="Furnizor (optional)"
                  value={purchaseForm.supplier}
                  onChange={(event) => setPurchaseForm((prev) => ({ ...prev, supplier: event.target.value }))}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={purchaseForm.updateStock}
                  onChange={(event) => setPurchaseForm((prev) => ({ ...prev, updateStock: event.target.checked }))}
                />
                Actualizeaza automat stocul
              </label>
              <button className="btn btn-primary w-full" disabled={pending}>
                {pending ? 'Se inregistreaza...' : 'Inregistreaza aprovizionare'}
              </button>
            </form>
          </article>
        </div>
      </section>

      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
