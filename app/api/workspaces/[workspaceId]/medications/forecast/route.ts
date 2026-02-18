import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUserOrThrow } from '@/lib/api-auth';
import { extractJsonObject, generateText, Provider } from '@/lib/ai';
import { jsonError, HttpError } from '@/lib/http';
import {
  calculateMedicationAlerts,
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

    const generated = await generateText({
      provider: parsed.provider as Provider,
      prompt,
      maxTokens: 1200,
      temperature: 0.2
    });

    const aiJson = extractJsonObject<unknown>(generated.text);
    const validated = responseSchema.parse(aiJson);
    return NextResponse.json({
      forecast: validated,
      provider: parsed.provider,
      model: generated.model,
      usage: {
        inputTokens: generated.inputTokens,
        outputTokens: generated.outputTokens,
        estimatedCostUsd: generated.estimatedCostUsd
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
