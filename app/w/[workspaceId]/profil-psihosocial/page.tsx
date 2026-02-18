import { Role } from '@prisma/client';
import { PsychosocialProfileManager } from '@/components/dashboard/psychosocial-profile-manager';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { assertWorkspaceAccess } from '@/lib/tenant';

export default async function PsychosocialPage({ params }: { params: { workspaceId: string } }) {
  const { user } = await requireUser();
  await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

  const profiles = await prisma.psychosocialProfile.findMany({
    where: { workspaceId: params.workspaceId },
    orderBy: { assessmentDate: 'desc' },
    take: 50
  });

  return (
    <main className="space-y-4">
      <section className="card p-5">
        <h1 className="text-2xl font-semibold">Profil psihosocial beneficiar</h1>
        <p className="mt-1 text-sm text-slate-400">
          Modul orientativ de sprijin pentru personal: monitorizare, recomandari comportamentale si fisa PDF arhivabila pentru dosar.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Nu formuleaza diagnostice medicale. Datele medicale/poza se introduc doar cu acord explicit, iar exporturile sunt jurnalizate.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Generator AI activ pe OpenAI / Claude / Gemini. Seteaza cheile API in fisierul de mediu al aplicatiei.
        </p>
      </section>
      <PsychosocialProfileManager
        workspaceId={params.workspaceId}
        initialProfiles={profiles.map((profile) => ({
          ...profile,
          assessmentDate: profile.assessmentDate.toISOString(),
          createdAt: profile.createdAt.toISOString(),
          updatedAt: profile.updatedAt.toISOString()
        }))}
      />
    </main>
  );
}
