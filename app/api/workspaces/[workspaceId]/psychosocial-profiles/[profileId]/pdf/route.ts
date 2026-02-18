import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireApiUserOrThrow } from '@/lib/api-auth';
import { jsonError, HttpError } from '@/lib/http';
import { createSinglePagePdf } from '@/lib/pdf';
import { prisma } from '@/lib/prisma';
import {
  APPETITE_LABELS,
  AUTONOMY_LABELS,
  COMMUNICATION_LABELS,
  FAMILY_SUPPORT_LABELS,
  HOUSING_STATUS_LABELS,
  RELATIONSHIP_LABELS,
  SLEEP_LABELS,
  STRESS_LABELS
} from '@/lib/psychosocial';
import { assertWorkspaceAccess } from '@/lib/tenant';

type Params = { params: { workspaceId: string; profileId: string } };

function boolLabel(value: boolean | null) {
  if (value === null) return 'Nespecificat';
  return value ? 'Da' : 'Nu';
}

export async function GET(_: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    const profile = await prisma.psychosocialProfile.findFirst({
      where: {
        id: params.profileId,
        workspaceId: params.workspaceId
      }
    });
    if (!profile) {
      throw new HttpError(404, 'Profilul nu a fost gasit');
    }

    await prisma.profileAccessLog.create({
      data: {
        profileId: profile.id,
        actorId: user.id,
        action: 'PROFILE_PDF_DOWNLOADED'
      }
    });

    const sections = [
      {
        title: 'Date identificare',
        lines: [
          `Beneficiar: ${profile.internalName} | Varsta: ${profile.age} | Sex: ${profile.sex}`,
          `Locatie/Centru: ${profile.locationCenter}`,
          `Data evaluarii: ${profile.assessmentDate.toLocaleDateString('ro-RO')}`,
          `Responsabil: ${profile.responsiblePerson}`,
          `Acord GDPR: ${boolLabel(profile.gdprConsent)}${profile.gdprConsentDate ? ` (${profile.gdprConsentDate.toLocaleDateString('ro-RO')})` : ''}`
        ]
      },
      {
        title: 'Rezumat social',
        lines: [
          `Familie: ${FAMILY_SUPPORT_LABELS[profile.familySupport]} | Locuire: ${HOUSING_STATUS_LABELS[profile.housingStatus]}`,
          `Contact cu familia: ${profile.familyContactFrequency || 'Nespecificat'}`,
          `Istoric institutionalizare: ${profile.institutionalizationHistory || 'Nespecificat'}`,
          `Boli cunoscute: ${boolLabel(profile.knownDiseases)} | Evaluare psihologica anterioara: ${boolLabel(profile.previousPsychEvaluation)}`,
          `Tratament/medicatie: ${profile.medicationInfo || 'Nespecificat'}`,
          `Limitari/handicap: ${profile.limitations || 'Nespecificat'}`
        ]
      },
      {
        title: 'Profil emotional orientativ',
        lines: [
          profile.contextPersonal,
          profile.emotionalProfile,
          `Comunicare: ${COMMUNICATION_LABELS[profile.communicationLevel]} | Stres: ${STRESS_LABELS[profile.stressReaction]} | Relationare: ${RELATIONSHIP_LABELS[profile.relationshipStyle]}`,
          `Autonomie: ${AUTONOMY_LABELS[profile.autonomyLevel]} | Somn: ${SLEEP_LABELS[profile.sleepQuality]} | Apetit: ${APPETITE_LABELS[profile.appetite]}`,
          `Indicatori emotionali observati: tristete ${boolLabel(profile.sadnessFrequent)}, anxietate ${boolLabel(profile.anxiety)}, furie ${boolLabel(profile.anger)}, apatie ${boolLabel(profile.apathy)}, speranta/motivatie ${boolLabel(profile.hopeMotivation)}.`
        ]
      },
      {
        title: 'Nevoi principale',
        lines: profile.mainNeeds.length ? profile.mainNeeds.map((line) => `- ${line}`) : ['- Fara nevoi identificate.']
      },
      {
        title: 'Riscuri identificate',
        lines: profile.risks.length ? profile.risks.map((line) => `- ${line}`) : ['- Fara riscuri identificate.']
      },
      {
        title: 'Recomandari pentru personal',
        lines: profile.staffRecommendations.length ? profile.staffRecommendations.map((line) => `- ${line}`) : ['- Fara recomandari.']
      },
      {
        title: 'Plan de sprijin',
        lines: profile.supportPlan.length ? profile.supportPlan.map((line) => `- ${line}`) : ['- Fara plan definit.']
      },
      {
        title: 'Observatii / Semnatura',
        lines: [
          `Observatii: ${profile.observations || 'Nespecificat'}`,
          `Semnatura responsabil: ${profile.signatureResponsible || profile.responsiblePerson}`,
          `Versiune document: ${profile.version}`
        ]
      }
    ];

    const pdfBytes = await createSinglePagePdf({
      title: 'Fisa psihosociala orientativa',
      subtitle:
        'Document de sprijin pentru echipa. Nu reprezinta diagnostic medical si nu inlocuieste evaluarea clinica specializata. Confidential - GDPR.',
      sections,
      footerNote: `Generat la ${new Date().toLocaleString('ro-RO')} din aplicatia interna. Versiune: ${profile.version}`
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="profil-psihosocial-${profile.internalName.replace(/\s+/g, '-')}.pdf"`
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
