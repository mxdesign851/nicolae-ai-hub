import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUserOrThrow } from '@/lib/api-auth';
import { jsonError, HttpError } from '@/lib/http';
import {
  APPETITE_LEVELS,
  AUTONOMY_LEVELS,
  COMMUNICATION_LEVELS,
  FAMILY_SUPPORT_LEVELS,
  HOUSING_STATUSES,
  RELATIONSHIP_STYLES,
  SLEEP_QUALITIES,
  STRESS_REACTIONS
} from '@/lib/psychosocial';
import { prisma } from '@/lib/prisma';
import { sanitizeOptionalText, sanitizeText } from '@/lib/sanitize';
import { assertWorkspaceAccess } from '@/lib/tenant';

type Params = { params: { workspaceId: string; profileId: string } };

const optionalBooleanSchema = z.union([z.boolean(), z.null()]).optional();

const updateSchema = z.object({
  internalName: z.string().min(2).max(80).optional(),
  age: z.coerce.number().int().min(0).max(120).optional(),
  sex: z.string().min(1).max(32).optional(),
  locationCenter: z.string().min(2).max(120).optional(),
  assessmentDate: z.string().optional(),
  responsiblePerson: z.string().min(2).max(120).optional(),
  familySupport: z.enum(FAMILY_SUPPORT_LEVELS).optional(),
  housingStatus: z.enum(HOUSING_STATUSES).optional(),
  familyContactFrequency: z.string().max(160).optional().nullable(),
  institutionalizationHistory: z.string().max(500).optional().nullable(),
  knownDiseases: optionalBooleanSchema,
  medicationInfo: z.string().max(500).optional().nullable(),
  limitations: z.string().max(500).optional().nullable(),
  previousPsychEvaluation: optionalBooleanSchema,
  communicationLevel: z.enum(COMMUNICATION_LEVELS).optional(),
  stressReaction: z.enum(STRESS_REACTIONS).optional(),
  relationshipStyle: z.enum(RELATIONSHIP_STYLES).optional(),
  autonomyLevel: z.enum(AUTONOMY_LEVELS).optional(),
  sleepQuality: z.enum(SLEEP_QUALITIES).optional(),
  appetite: z.enum(APPETITE_LEVELS).optional(),
  sadnessFrequent: z.boolean().optional(),
  anxiety: z.boolean().optional(),
  anger: z.boolean().optional(),
  apathy: z.boolean().optional(),
  hopeMotivation: z.boolean().optional(),
  photoConsent: z.boolean().optional(),
  photoReference: z.string().max(250).optional().nullable(),
  gdprConsent: z.boolean().optional(),
  observations: z.string().max(1000).optional().nullable(),
  signatureResponsible: z.string().max(120).optional().nullable()
});

function serializeProfile(profile: {
  id: string;
  internalName: string;
  age: number;
  sex: string;
  locationCenter: string;
  assessmentDate: Date;
  responsiblePerson: string;
  familySupport: string;
  housingStatus: string;
  familyContactFrequency: string | null;
  institutionalizationHistory: string | null;
  knownDiseases: boolean | null;
  medicationInfo: string | null;
  limitations: string | null;
  previousPsychEvaluation: boolean | null;
  communicationLevel: string;
  stressReaction: string;
  relationshipStyle: string;
  autonomyLevel: string;
  sleepQuality: string;
  appetite: string;
  sadnessFrequent: boolean;
  anxiety: boolean;
  anger: boolean;
  apathy: boolean;
  hopeMotivation: boolean;
  photoConsent: boolean;
  photoReference: string | null;
  gdprConsent: boolean;
  gdprConsentDate: Date | null;
  contextPersonal: string;
  emotionalProfile: string;
  mainNeeds: string[];
  risks: string[];
  staffRecommendations: string[];
  supportPlan: string[];
  observations: string | null;
  signatureResponsible: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...profile,
    assessmentDate: profile.assessmentDate.toISOString(),
    gdprConsentDate: profile.gdprConsentDate?.toISOString() ?? null,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString()
  };
}

export async function GET(_: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    const profile = await prisma.psychosocialProfile.findFirst({
      where: { id: params.profileId, workspaceId: params.workspaceId }
    });
    if (!profile) {
      throw new HttpError(404, 'Profilul nu a fost gasit');
    }

    await prisma.profileAccessLog.create({
      data: {
        profileId: profile.id,
        actorId: user.id,
        action: 'PROFILE_VIEWED'
      }
    });

    return NextResponse.json({ profile: serializeProfile(profile) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN]);

    const existing = await prisma.psychosocialProfile.findFirst({
      where: { id: params.profileId, workspaceId: params.workspaceId }
    });
    if (!existing) {
      throw new HttpError(404, 'Profilul nu a fost gasit');
    }

    const parsed = updateSchema.parse(await request.json());

    const data: Record<string, unknown> = { version: { increment: 1 } };

    if (parsed.internalName !== undefined) data.internalName = sanitizeText(parsed.internalName, 80);
    if (parsed.age !== undefined) data.age = parsed.age;
    if (parsed.sex !== undefined) data.sex = sanitizeText(parsed.sex, 32);
    if (parsed.locationCenter !== undefined) data.locationCenter = sanitizeText(parsed.locationCenter, 120);
    if (parsed.assessmentDate !== undefined) {
      const d = new Date(parsed.assessmentDate);
      if (Number.isNaN(d.getTime())) throw new HttpError(400, 'Data evaluarii este invalida');
      data.assessmentDate = d;
    }
    if (parsed.responsiblePerson !== undefined) data.responsiblePerson = sanitizeText(parsed.responsiblePerson, 120);
    if (parsed.familySupport !== undefined) data.familySupport = parsed.familySupport;
    if (parsed.housingStatus !== undefined) data.housingStatus = parsed.housingStatus;
    if (parsed.familyContactFrequency !== undefined) data.familyContactFrequency = sanitizeOptionalText(parsed.familyContactFrequency, 160);
    if (parsed.institutionalizationHistory !== undefined) data.institutionalizationHistory = sanitizeOptionalText(parsed.institutionalizationHistory, 500);
    if (parsed.knownDiseases !== undefined) data.knownDiseases = parsed.knownDiseases ?? null;
    if (parsed.medicationInfo !== undefined) data.medicationInfo = sanitizeOptionalText(parsed.medicationInfo, 500);
    if (parsed.limitations !== undefined) data.limitations = sanitizeOptionalText(parsed.limitations, 500);
    if (parsed.previousPsychEvaluation !== undefined) data.previousPsychEvaluation = parsed.previousPsychEvaluation ?? null;
    if (parsed.communicationLevel !== undefined) data.communicationLevel = parsed.communicationLevel;
    if (parsed.stressReaction !== undefined) data.stressReaction = parsed.stressReaction;
    if (parsed.relationshipStyle !== undefined) data.relationshipStyle = parsed.relationshipStyle;
    if (parsed.autonomyLevel !== undefined) data.autonomyLevel = parsed.autonomyLevel;
    if (parsed.sleepQuality !== undefined) data.sleepQuality = parsed.sleepQuality;
    if (parsed.appetite !== undefined) data.appetite = parsed.appetite;
    if (parsed.sadnessFrequent !== undefined) data.sadnessFrequent = parsed.sadnessFrequent;
    if (parsed.anxiety !== undefined) data.anxiety = parsed.anxiety;
    if (parsed.anger !== undefined) data.anger = parsed.anger;
    if (parsed.apathy !== undefined) data.apathy = parsed.apathy;
    if (parsed.hopeMotivation !== undefined) data.hopeMotivation = parsed.hopeMotivation;
    if (parsed.photoConsent !== undefined) data.photoConsent = parsed.photoConsent;
    if (parsed.photoReference !== undefined) data.photoReference = sanitizeOptionalText(parsed.photoReference, 250);
    if (parsed.gdprConsent !== undefined) {
      data.gdprConsent = parsed.gdprConsent;
      if (parsed.gdprConsent && !existing.gdprConsent) {
        data.gdprConsentDate = new Date();
      }
    }
    if (parsed.observations !== undefined) data.observations = sanitizeOptionalText(parsed.observations, 1000);
    if (parsed.signatureResponsible !== undefined) data.signatureResponsible = sanitizeOptionalText(parsed.signatureResponsible, 120);

    const profile = await prisma.psychosocialProfile.update({
      where: { id: params.profileId },
      data
    });

    await prisma.profileAccessLog.create({
      data: {
        profileId: profile.id,
        actorId: user.id,
        action: 'PROFILE_UPDATED',
        metadata: { fields: Object.keys(parsed).filter((k) => k !== 'provider') }
      }
    });

    return NextResponse.json({ profile: serializeProfile(profile) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN]);

    const existing = await prisma.psychosocialProfile.findFirst({
      where: { id: params.profileId, workspaceId: params.workspaceId }
    });
    if (!existing) {
      throw new HttpError(404, 'Profilul nu a fost gasit');
    }

    await prisma.psychosocialProfile.delete({ where: { id: params.profileId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
