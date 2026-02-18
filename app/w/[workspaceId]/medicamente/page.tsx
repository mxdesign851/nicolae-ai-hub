import { Role } from '@prisma/client';
import { MedicationHub } from '@/components/dashboard/medication-hub';
import { requireUser } from '@/lib/session';
import { assertWorkspaceAccess } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import {
  calculateMedicationAlerts,
  mapPrismaMedicationItem,
  summarizeMedicationAlerts,
  toMedicationCategoryLabel
} from '@/lib/medications';

export default async function MedicationsPage({ params }: { params: { workspaceId: string } }) {
  const { user } = await requireUser();
  const membership = await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

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

  const projected = items.map(mapPrismaMedicationItem);
  const alerts = calculateMedicationAlerts(projected, preference.expiryAlertDays);
  const summary = summarizeMedicationAlerts(alerts);
  const phoneNotificationPreview =
    preference.enablePhoneAlerts && preference.phoneNumber
      ? [
          `Alerte stoc ${new Date().toLocaleDateString('ro-RO')}:`,
          ...alerts.slice(0, 5).map((alert) =>
            alert.type === 'EXPIRING_SOON'
              ? `- ${alert.name}: expira ${alert.expiresAt?.toLocaleDateString('ro-RO') ?? '-'}`
              : `- ${alert.name}: ${alert.stockQuantity} / prag ${alert.minStockThreshold} ${alert.unit}`
          )
        ].join('\n')
      : null;

  return (
    <main className="space-y-4">
      <section className="card p-5">
        <h1 className="text-2xl font-semibold">Hub medicamente</h1>
        <p className="mt-1 text-sm text-slate-400">
          Inventar intern pe categorii/rafturi pentru {membership.workspace.name}, cu alerte, predictii de stoc si export PDF.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Categorii standard: cardio, diabet, gastro, respirator, neuro, psihiatric, antibiotice, durere, alergii, dermato, vitamine, altele.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          AI providers disponibili: OpenAI, Claude, Gemini. Configureaza cheile in env: OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY.
        </p>
      </section>
      <MedicationHub
        workspaceId={params.workspaceId}
        initialItems={projected.map((item) => ({
          ...item,
          lastPurchaseAt: item.lastPurchaseAt?.toISOString() ?? null,
          expiresAt: item.expiresAt?.toISOString() ?? null,
          categoryLabel: toMedicationCategoryLabel(item.category),
          purchases: (item.purchases ?? []).map((purchase) => ({
            unitPrice: purchase.unitPrice,
            purchasedAt: purchase.purchasedAt.toISOString()
          }))
        }))}
        initialAlerts={alerts.map((alert) => ({
          ...alert,
          categoryLabel: toMedicationCategoryLabel(alert.category),
          expiresAt: alert.expiresAt?.toISOString() ?? null,
          predictedRunoutAt: alert.predictedRunoutAt?.toISOString() ?? null
        }))}
        initialSummary={summary}
        initialPreference={preference}
        initialPhoneNotificationPreview={phoneNotificationPreview}
      />
    </main>
  );
}
