import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUserOrThrow } from '@/lib/api-auth';
import { extractJsonObject, generateText, Provider } from '@/lib/ai';
import { jsonError, HttpError } from '@/lib/http';
import {
  calculateMedicationAlerts,
  estimateRestockQuantity,
  mapPrismaMedicationItem,
  toMedicationCategoryLabel
} from '@/lib/medications';
import { prisma } from '@/lib/prisma';
import { assertWorkspaceAccess } from '@/lib/tenant';

type Params = { params: { workspaceId: string } };

const schema = z.object({
  provider: z.enum(['openai', 'claude', 'gemini']).default('openai'),
  horizonDays: z.coerce.number().int().min(7).max(120).default(30)
});

const responseSchema = z.object({
  summary: z.string().min(10).max(1200),
  totalEstimatedBudgetRon: z.number().nullable(),
  priorityOrders: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        reason: z.string().min(3).max(350),
        recommendedQuantity: z.number().min(0),
        estimatedUnitPriceRon: z.number().nullable(),
        estimatedTotalRon: z.number().nullable(),
        urgency: z.enum(['high', 'medium', 'low'])
      })
    )
    .max(12),
  recommendations: z.array(z.string().min(2).max(350)).max(8)
});

function buildFallbackForecast(input: {
  horizonDays: number;
  projected: ReturnType<typeof mapPrismaMedicationItem>[];
  alerts: ReturnType<typeof calculateMedicationAlerts>;
}) {
  const byId = new Map(input.projected.map((item) => [item.id, item]));
  const priorityOrders = input.alerts
    .filter((alert) => alert.type === 'OUT_OF_STOCK' || alert.type === 'LOW_STOCK')
    .slice(0, 10)
    .map((alert) => {
      const item = byId.get(alert.itemId);
      const recommendedQuantity = item ? estimateRestockQuantity(item) : Math.max(alert.missingQuantity, 0);
      const estimatedUnitPriceRon = alert.predictedUnitPrice ?? item?.lastUnitPrice ?? null;
      const estimatedTotalRon = estimatedUnitPriceRon === null ? null : Number((estimatedUnitPriceRon * recommendedQuantity).toFixed(2));
      return {
        name: alert.name,
        reason:
          alert.type === 'OUT_OF_STOCK'
            ? `Stoc epuizat pe categoria ${toMedicationCategoryLabel(alert.category)}${alert.shelf ? ` (raft ${alert.shelf})` : ''}.`
            : `Stoc sub prag pentru ${toMedicationCategoryLabel(alert.category)}${alert.shelf ? ` (raft ${alert.shelf})` : ''}.`,
        recommendedQuantity,
        estimatedUnitPriceRon,
        estimatedTotalRon,
        urgency: alert.type === 'OUT_OF_STOCK' ? ('high' as const) : ('medium' as const)
      };
    });

  const totalEstimatedBudgetRon = priorityOrders.reduce<number | null>((acc, order) => {
    if (order.estimatedTotalRon === null) return acc;
    return (acc ?? 0) + order.estimatedTotalRon;
  }, 0);

  return {
    summary:
      priorityOrders.length > 0
        ? `Forecast intern: ${priorityOrders.length} medicamente necesita comanda in urmatoarele ${input.horizonDays} zile.`
        : `Forecast intern: nu exista comenzi prioritare in urmatoarele ${input.horizonDays} zile.`,
    totalEstimatedBudgetRon,
    priorityOrders,
    recommendations: [
      'Verifica fizic stocurile marcate cu urgenta high inainte de lansarea comenzilor.',
      'Confirma preturile la furnizori pentru pozitiile fara cost estimat.',
      'Actualizeaza consumul zilnic per produs pentru predictii AI mai precise.'
    ]
  };
}

function buildMedicationForecastPrompt(input: {
  horizonDays: number;
  items: Array<{
    name: string;
    categoryLabel: string;
    shelf: string | null;
    stockQuantity: number;
    minStockThreshold: number;
    unit: string;
    dailyUsage: number | null;
    lastUnitPrice: number | null;
    expiresAt: string | null;
  }>;
  alerts: Array<{
    name: string;
    type: string;
    stockQuantity: number;
    minStockThreshold: number;
    unit: string;
    expiresAt: string | null;
  }>;
}) {
  return `You are a medication operations planning assistant for an internal care home system.
Create a realistic restock forecast using ONLY the provided real inventory data.
Do not invent medicines, quantities, or prices not supported by data. If price is unknown, return null.

Forecast horizon: ${input.horizonDays} days.

Inventory data:
${JSON.stringify(input.items)}

Current alerts:
${JSON.stringify(input.alerts)}

Return strict JSON only (no markdown) with this exact shape:
{
  "summary": "short operational summary in Romanian",
  "totalEstimatedBudgetRon": number|null,
  "priorityOrders": [
    {
      "name": "medicine name",
      "reason": "why it should be reordered now",
      "recommendedQuantity": number,
      "estimatedUnitPriceRon": number|null,
      "estimatedTotalRon": number|null,
      "urgency": "high|medium|low"
    }
  ],
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2"]
}

Rules:
- If stock is at or below threshold, prioritize it.
- Use dailyUsage and horizonDays when available to estimate quantity.
- Keep quantities pragmatic (max two decimals).
- Output at most 10 priorityOrders.`;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    const parsed = schema.parse(await request.json());

    const items = await prisma.medicationItem.findMany({
      where: { workspaceId: params.workspaceId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        purchases: {
          select: { unitPrice: true, purchasedAt: true },
          orderBy: { purchasedAt: 'desc' },
          take: 6
        }
      }
    });

    if (!items.length) {
      throw new HttpError(400, 'Nu exista medicamente in inventar pentru predictie');
    }

    const projected = items.map(mapPrismaMedicationItem);
    const alerts = calculateMedicationAlerts(projected);

    const prompt = buildMedicationForecastPrompt({
      horizonDays: parsed.horizonDays,
      items: projected.map((item) => ({
        name: item.name,
        categoryLabel: toMedicationCategoryLabel(item.category),
        shelf: item.shelf,
        stockQuantity: item.stockQuantity,
        minStockThreshold: item.minStockThreshold,
        unit: item.unit,
        dailyUsage: item.dailyUsage,
        lastUnitPrice: item.lastUnitPrice,
        expiresAt: item.expiresAt?.toISOString() ?? null
      })),
      alerts: alerts.map((alert) => ({
        name: alert.name,
        type: alert.type,
        stockQuantity: alert.stockQuantity,
        minStockThreshold: alert.minStockThreshold,
        unit: alert.unit,
        expiresAt: alert.expiresAt?.toISOString() ?? null
      }))
    });
    const fallbackForecast = buildFallbackForecast({
      horizonDays: parsed.horizonDays,
      projected,
      alerts
    });

    let validated = fallbackForecast;
    let model: string | null = null;
    let fallbackRulesUsed = true;
    try {
      const generated = await generateText({
        provider: parsed.provider as Provider,
        prompt,
        maxTokens: 1200,
        temperature: 0.2
      });
      const aiJson = extractJsonObject<unknown>(generated.text);
      validated = responseSchema.parse(aiJson);
      model = generated.model;
      fallbackRulesUsed = false;
    } catch {
      // fallback generated from deterministic inventory rules
    }

    return NextResponse.json({
      forecast: validated,
      provider: parsed.provider,
      model,
      fallbackRulesUsed
    });
  } catch (error) {
    return jsonError(error);
  }
}
