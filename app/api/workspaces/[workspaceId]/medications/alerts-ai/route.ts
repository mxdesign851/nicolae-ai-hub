import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUserOrThrow } from '@/lib/api-auth';
import { extractJsonObject, generateText, Provider } from '@/lib/ai';
import { jsonError, HttpError } from '@/lib/http';
import {
  calculateMedicationAlerts,
  estimateRestockQuantity,
  estimateRunoutDate,
  mapPrismaMedicationItem,
  toMedicationCategoryLabel
} from '@/lib/medications';
import { prisma } from '@/lib/prisma';
import { assertWorkspaceAccess } from '@/lib/tenant';

type Params = { params: { workspaceId: string } };

const requestSchema = z.object({
  provider: z.enum(['openai', 'claude', 'gemini']).default('openai'),
  horizonDays: z.coerce.number().int().min(7).max(120).default(30)
});

const digestSchema = z.object({
  summary: z.string().min(10).max(1300),
  missingNow: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        categoryLabel: z.string().min(1).max(80),
        shelf: z.string().nullable(),
        stockQuantity: z.number(),
        threshold: z.number(),
        unit: z.string().min(1).max(20),
        recommendedRestockQuantity: z.number().min(0),
        urgency: z.enum(['high', 'medium', 'low']),
        note: z.string().min(2).max(300)
      })
    )
    .max(20),
  predictedShortages: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        runoutAt: z.string().min(1).max(40).nullable(),
        reason: z.string().min(2).max(300),
        urgency: z.enum(['high', 'medium', 'low'])
      })
    )
    .max(20),
  staffSteps: z.array(z.string().min(2).max(320)).max(10),
  phoneAlertMessage: z.string().min(10).max(600)
});

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function buildFallbackDigest(input: {
  horizonDays: number;
  workspaceName: string;
  phoneNumber: string | null;
  alerts: ReturnType<typeof calculateMedicationAlerts>;
  projected: ReturnType<typeof mapPrismaMedicationItem>[];
}): z.infer<typeof digestSchema> {
  const missingNow = input.alerts
    .filter((alert) => alert.type === 'OUT_OF_STOCK' || alert.type === 'LOW_STOCK')
    .slice(0, 12)
    .map((alert) => ({
      name: alert.name,
      categoryLabel: toMedicationCategoryLabel(alert.category),
      shelf: alert.shelf,
      stockQuantity: alert.stockQuantity,
      threshold: alert.minStockThreshold,
      unit: alert.unit,
      recommendedRestockQuantity: Math.max(alert.missingQuantity, 0),
      urgency: (alert.type === 'OUT_OF_STOCK' ? 'high' : 'medium') as 'high' | 'medium' | 'low',
      note:
        alert.type === 'OUT_OF_STOCK'
          ? 'Medicament indisponibil; aprovizionare imediata recomandata.'
          : 'Stoc sub prag; planifica reaprovizionare in regim prioritar.'
    }));

  const predictedShortages = input.projected
    .map((item) => {
      const runoutAt = estimateRunoutDate(item.stockQuantity, item.dailyUsage);
      if (!runoutAt) return null;
      const days = daysUntil(runoutAt);
      if (days < 0 || days > input.horizonDays) return null;
      return {
        name: item.name,
        runoutAt: runoutAt ? runoutAt.toLocaleDateString('ro-RO') : null,
        reason: `Consum estimat ${item.dailyUsage ?? '-'} ${item.unit}/zi; epuizare estimata in ${days} zile.`,
        urgency: (days <= 7 ? 'high' : days <= 14 ? 'medium' : 'low') as 'high' | 'medium' | 'low'
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .slice(0, 12);

  const phoneHeader = input.phoneNumber ? `Alerte stoc ${input.workspaceName} (${input.phoneNumber}):` : `Alerte stoc ${input.workspaceName}:`;
  const phoneRows =
    missingNow.length > 0
      ? missingNow.slice(0, 5).map((row) => `- ${row.name}: ${row.stockQuantity}/${row.threshold} ${row.unit}`)
      : ['- Nu exista lipsuri critice in acest moment.'];

  return {
    summary:
      missingNow.length > 0
        ? `Sunt ${missingNow.length} medicamente cu lipsa/stoc redus care necesita interventie rapida, plus ${predictedShortages.length} potentiale epuizari in urmatoarele ${input.horizonDays} zile.`
        : `Nu exista lipsuri critice; monitorizarea indica ${predictedShortages.length} potentiale epuizari in urmatoarele ${input.horizonDays} zile.`,
    missingNow,
    predictedShortages,
    staffSteps: [
      'Valideaza fizic stocul pentru primele medicamente marcate cu urgenta ridicata.',
      'Plaseaza comenzi pe baza cantitatilor recomandate si confirma termenele de livrare.',
      'Actualizeaza stocurile in sistem imediat dupa receptie pentru a recalcula predictiile AI.'
    ],
    phoneAlertMessage: [phoneHeader, ...phoneRows].join('\n')
  };
}

function buildDigestPrompt(input: {
  horizonDays: number;
  workspaceName: string;
  phoneNumber: string | null;
  items: Array<{
    name: string;
    categoryLabel: string;
    shelf: string | null;
    stockQuantity: number;
    minStockThreshold: number;
    unit: string;
    dailyUsage: number | null;
    estimatedRestockQuantity: number;
    predictedRunoutAt: string | null;
  }>;
  alerts: Array<{
    name: string;
    type: string;
    stockQuantity: number;
    minStockThreshold: number;
    unit: string;
    categoryLabel: string;
    shelf: string | null;
  }>;
}) {
  return `Esti asistent operational AI pentru un sistem intern de gestiune medicamente.
Construieste un raport orientativ de aprovizionare pentru echipa.
Nu inventa medicamente sau valori care nu exista in date.

Context:
- Workspace: ${input.workspaceName}
- Orizont predictie: ${input.horizonDays} zile
- Telefon notificare setat: ${input.phoneNumber ?? 'nu'}

Date inventar:
${JSON.stringify(input.items)}

Alerte active:
${JSON.stringify(input.alerts)}

Returneaza STRICT JSON (fara markdown) cu forma:
{
  "summary": "rezumat operational",
  "missingNow": [
    {
      "name": "denumire",
      "categoryLabel": "categorie",
      "shelf": "raft sau null",
      "stockQuantity": 0,
      "threshold": 1,
      "unit": "cutii",
      "recommendedRestockQuantity": 0,
      "urgency": "high|medium|low",
      "note": "explicatie scurta"
    }
  ],
  "predictedShortages": [
    {
      "name": "denumire",
      "runoutAt": "data sau null",
      "reason": "motiv scurt",
      "urgency": "high|medium|low"
    }
  ],
  "staffSteps": ["pas 1", "pas 2", "pas 3"],
  "phoneAlertMessage": "mesaj scurt gata de trimis pe telefon"
}

Reguli:
- Limba romana.
- missingNow sa contina in primul rand OUT_OF_STOCK si LOW_STOCK.
- Mentioneaza rafturile/categoriile unde sunt disponibile.
- phoneAlertMessage maxim 8 linii, clar, fara date sensibile inutile.
- Max 12 elemente per lista.`;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    const membership = await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    const parsed = requestSchema.parse(await request.json());

    const [items, preference] = await prisma.$transaction([
      prisma.medicationItem.findMany({
        where: { workspaceId: params.workspaceId },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        include: {
          purchases: {
            select: { unitPrice: true, purchasedAt: true },
            orderBy: { purchasedAt: 'desc' },
            take: 6
          }
        }
      }),
      prisma.medicationNotificationPreference.upsert({
        where: { workspaceId: params.workspaceId },
        update: {},
        create: { workspaceId: params.workspaceId }
      })
    ]);

    if (!items.length) {
      throw new HttpError(400, 'Nu exista medicamente in inventar');
    }

    const projected = items.map(mapPrismaMedicationItem);
    const alerts = calculateMedicationAlerts(projected, preference.expiryAlertDays);
    const fallbackDigest = buildFallbackDigest({
      horizonDays: parsed.horizonDays,
      workspaceName: membership.workspace.name,
      phoneNumber: preference.phoneNumber,
      alerts,
      projected
    });

    const prompt = buildDigestPrompt({
      horizonDays: parsed.horizonDays,
      workspaceName: membership.workspace.name,
      phoneNumber: preference.phoneNumber,
      items: projected.map((item) => ({
        name: item.name,
        categoryLabel: toMedicationCategoryLabel(item.category),
        shelf: item.shelf,
        stockQuantity: item.stockQuantity,
        minStockThreshold: item.minStockThreshold,
        unit: item.unit,
        dailyUsage: item.dailyUsage,
        estimatedRestockQuantity: estimateRestockQuantity(item),
        predictedRunoutAt: estimateRunoutDate(item.stockQuantity, item.dailyUsage)?.toISOString() ?? null
      })),
      alerts: alerts.map((alert) => ({
        name: alert.name,
        type: alert.type,
        stockQuantity: alert.stockQuantity,
        minStockThreshold: alert.minStockThreshold,
        unit: alert.unit,
        categoryLabel: toMedicationCategoryLabel(alert.category),
        shelf: alert.shelf
      }))
    });

    let digest = fallbackDigest;
    let fallbackRulesUsed = true;
    let model: string | null = null;
    try {
      const generated = await generateText({
        provider: parsed.provider as Provider,
        prompt,
        maxTokens: 1300,
        temperature: 0.2
      });
      model = generated.model;
      digest = digestSchema.parse(extractJsonObject(generated.text));
      fallbackRulesUsed = false;
    } catch {
      // fallback digest already computed from real inventory data.
    }

    return NextResponse.json({
      digest,
      ai: {
        provider: parsed.provider,
        model,
        fallbackRulesUsed
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
