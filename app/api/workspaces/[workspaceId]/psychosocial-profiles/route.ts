import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUserOrThrow } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { extractJsonObject, generateText, Provider } from '@/lib/ai';
import { jsonError, HttpError } from '@/lib/http';
import {
  APPETITE_LEVELS,
  AUTONOMY_LEVELS,
  COMMUNICATION_LEVELS,
  FAMILY_SUPPORT_LEVELS,
  HOUSING_STATUSES,
  RELATIONSHIP_STYLES,
  SLEEP_QUALITIES,
  STRESS_REACTIONS,
  generatePsychosocialProfile,
  profileContainsDiagnosticLanguage
} from '@/lib/psychosocial';
import { prisma } from '@/lib/prisma';
import { sanitizeOptionalText, sanitizeText } from '@/lib/sanitize';
import { assertWorkspaceAccess } from '@/lib/tenant';

type Params = { params: { workspaceId: string } };

const optionalBooleanSchema = z.union([z.boolean(), z.null()]).optional();

const psychosocialSchema = z.object({
  provider: z.enum(['openai', 'claude', 'gemini']).default('openai'),
  internalName: z.string().min(2).max(80),
  age: z.coerce.number().int().min(0).max(120),
  sex: z.string().min(1).max(32),
  locationCenter: z.string().min(2).max(120),
  assessmentDate: z.string(),
  responsiblePerson: z.string().min(2).max(120),
  medicalConsent: z.boolean().default(false),
  familySupport: z.enum(FAMILY_SUPPORT_LEVELS),
  housingStatus: z.enum(HOUSING_STATUSES),
  familyContactFrequency: z.string().max(160).optional().nullable(),
  institutionalizationHistory: z.string().max(500).optional().nullable(),
  knownDiseases: optionalBooleanSchema,
  medicationInfo: z.string().max(500).optional().nullable(),
  limitations: z.string().max(500).optional().nullable(),
  previousPsychEvaluation: optionalBooleanSchema,
  communicationLevel: z.enum(COMMUNICATION_LEVELS),
  stressReaction: z.enum(STRESS_REACTIONS),
  relationshipStyle: z.enum(RELATIONSHIP_STYLES),
  autonomyLevel: z.enum(AUTONOMY_LEVELS),
  sleepQuality: z.enum(SLEEP_QUALITIES),
  appetite: z.enum(APPETITE_LEVELS),
  sadnessFrequent: z.boolean().default(false),
  anxiety: z.boolean().default(false),
  anger: z.boolean().default(false),
  apathy: z.boolean().default(false),
  hopeMotivation: z.boolean().default(false),
  photoConsent: z.boolean().default(false),
  photoReference: z.string().max(250).optional().nullable(),
  observations: z.string().max(1000).optional().nullable(),
  signatureResponsible: z.string().max(120).optional().nullable()
});

const aiGeneratedSchema = z.object({
  contextPersonal: z.string().min(20).max(2500),
  emotionalProfile: z.string().min(20).max(2500),
  mainNeeds: z.array(z.string().min(2).max(180)).min(1).max(7),
  risks: z.array(z.string().min(2).max(180)).min(1).max(7),
  staffRecommendations: z.array(z.string().min(2).max(220)).min(1).max(9),
  supportPlan: z.array(z.string().min(2).max(220)).min(1).max(7)
});

function parseAssessmentDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, 'Data evaluarii este invalida');
  }
  return parsed;
}

function boolText(value: boolean | null | undefined) {
  if (value === null || value === undefined) return 'nespecificat';
  return value ? 'da' : 'nu';
}

function buildPsychosocialAIPrompt(input: {
  internalName: string;
  age: number;
  sex: string;
  locationCenter: string;
  assessmentDate: Date;
  responsiblePerson: string;
  medicalConsent: boolean;
  familySupport: string;
  housingStatus: string;
  familyContactFrequency: string | null;
  institutionalizationHistory: string | null;
  knownDiseases: boolean | null | undefined;
  medicationInfo: string | null;
  limitations: string | null;
  previousPsychEvaluation: boolean | null | undefined;
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
  observations: string | null;
}) {
  return `Esti asistent pentru fise psihosociale in centru de ingrijire.
Scopul este ORIENTATIV de sprijin pentru personal.
Nu formula diagnostice clinice. Nu folosi expresii de diagnostic (ex: "depresie severa").
Foloseste formulare observationale si de suport.

Date reale evaluare:
- Beneficiar: ${input.internalName}
- Varsta: ${input.age}
- Sex: ${input.sex}
- Locatie/Centru: ${input.locationCenter}
- Data evaluarii: ${input.assessmentDate.toISOString()}
- Responsabil: ${input.responsiblePerson}
- Acord date medicale optionale: ${input.medicalConsent ? 'da' : 'nu'}
- Familie: ${input.familySupport}
- Locuire: ${input.housingStatus}
- Contact familie: ${input.familyContactFrequency ?? 'nespecificat'}
- Istoric institutionalizare: ${input.institutionalizationHistory ?? 'nespecificat'}
- Boli cunoscute: ${boolText(input.knownDiseases)}
- Medicatie: ${input.medicationInfo ?? 'nespecificat'}
- Limitari: ${input.limitations ?? 'nespecificat'}
- Evaluare psihologica anterioara: ${boolText(input.previousPsychEvaluation)}
- Comunicare: ${input.communicationLevel}
- Reactie la stres: ${input.stressReaction}
- Relationare: ${input.relationshipStyle}
- Autonomie: ${input.autonomyLevel}
- Somn: ${input.sleepQuality}
- Apetit: ${input.appetite}
- Indicatori emotionali: tristete=${input.sadnessFrequent}, anxietate=${input.anxiety}, furie=${input.anger}, apatie=${input.apathy}, speranta/motivatie=${input.hopeMotivation}
- Observatii suplimentare: ${input.observations ?? 'fara observatii suplimentare'}

Returneaza STRICT JSON (fara markdown) cu forma:
{
  "contextPersonal": "text 2-4 fraze",
  "emotionalProfile": "text 2-4 fraze",
  "mainNeeds": ["nevoie 1", "nevoie 2"],
  "risks": ["risc 1", "risc 2"],
  "staffRecommendations": ["recomandare 1", "recomandare 2"],
  "supportPlan": ["pas 1", "pas 2"]
}

Reguli:
- limba romana
- max 7 puncte per lista
- recomandari concrete pentru personal (ton calm, structura, evitarea conflictului, activitati recomandate cand relevant)
- fara etichete de diagnostic
- daca acord date medicale optionale = nu, mentioneaza explicit doar ca datele medicale nu au fost incluse in evaluarea curenta.`;
}

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
  contextPersonal: string;
  emotionalProfile: string;
  mainNeeds: string[];
  risks: string[];
  staffRecommendations: string[];
  supportPlan: string[];
  observations: string | null;
  signatureResponsible: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...profile,
    assessmentDate: profile.assessmentDate.toISOString(),
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString()
  };
}

export async function GET(_: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    const profiles = await prisma.psychosocialProfile.findMany({
      where: { workspaceId: params.workspaceId },
      orderBy: { assessmentDate: 'desc' },
      take: 50
    });

    return NextResponse.json({ profiles: profiles.map(serializeProfile) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    const parsed = psychosocialSchema.parse(await request.json());
    const assessmentDate = parseAssessmentDate(parsed.assessmentDate);

    const internalName = sanitizeText(parsed.internalName, 80);
    const sex = sanitizeText(parsed.sex, 32);
    const locationCenter = sanitizeText(parsed.locationCenter, 120);
    const responsiblePerson = sanitizeText(parsed.responsiblePerson, 120);
    const familyContactFrequency = sanitizeOptionalText(parsed.familyContactFrequency, 160);
    const institutionalizationHistory = sanitizeOptionalText(parsed.institutionalizationHistory, 500);
    const medicationInfo = parsed.medicalConsent ? sanitizeOptionalText(parsed.medicationInfo, 500) : null;
    const limitations = parsed.medicalConsent ? sanitizeOptionalText(parsed.limitations, 500) : null;
    const observations = sanitizeOptionalText(parsed.observations, 1000);
    const photoReference = sanitizeOptionalText(parsed.photoReference, 250);
    const signatureResponsible = sanitizeOptionalText(parsed.signatureResponsible, 120);
    const knownDiseases = parsed.medicalConsent ? parsed.knownDiseases ?? null : null;
    const previousPsychEvaluation = parsed.medicalConsent ? parsed.previousPsychEvaluation ?? null : null;

    if (photoReference && !parsed.photoConsent) {
      throw new HttpError(400, 'Poza poate fi salvata doar cu consimtamant legal explicit');
    }

    const normalizedInput = {
      internalName,
      age: parsed.age,
      sex,
      locationCenter,
      assessmentDate,
      responsiblePerson,
      medicalConsent: parsed.medicalConsent,
      familySupport: parsed.familySupport,
      housingStatus: parsed.housingStatus,
      familyContactFrequency,
      institutionalizationHistory,
      knownDiseases,
      medicationInfo,
      limitations,
      previousPsychEvaluation,
      communicationLevel: parsed.communicationLevel,
      stressReaction: parsed.stressReaction,
      relationshipStyle: parsed.relationshipStyle,
      autonomyLevel: parsed.autonomyLevel,
      sleepQuality: parsed.sleepQuality,
      appetite: parsed.appetite,
      sadnessFrequent: parsed.sadnessFrequent,
      anxiety: parsed.anxiety,
      anger: parsed.anger,
      apathy: parsed.apathy,
      hopeMotivation: parsed.hopeMotivation,
      observations
    };

    const aiPrompt = buildPsychosocialAIPrompt(normalizedInput);
    const generatedText = await generateText({
      provider: parsed.provider as Provider,
      prompt: aiPrompt,
      maxTokens: 1200,
      temperature: 0.2
    });

    const fallbackGenerated = generatePsychosocialProfile(normalizedInput);
    let generated = fallbackGenerated;
    let usedFallback = false;
    try {
      const parsedAi = aiGeneratedSchema.parse(extractJsonObject(generatedText.text));
      if (profileContainsDiagnosticLanguage(parsedAi)) {
        throw new Error('AI output contains diagnostic language');
      }
      generated = parsedAi;
    } catch {
      usedFallback = true;
    }

    const profile = await prisma.psychosocialProfile.create({
      data: {
        workspaceId: params.workspaceId,
        createdById: user.id,
        internalName,
        age: parsed.age,
        sex,
        locationCenter,
        assessmentDate,
        responsiblePerson,
        medicalConsent: parsed.medicalConsent,
        familySupport: parsed.familySupport,
        housingStatus: parsed.housingStatus,
        familyContactFrequency,
        institutionalizationHistory,
        knownDiseases,
        medicationInfo,
        limitations,
        previousPsychEvaluation,
        communicationLevel: parsed.communicationLevel,
        stressReaction: parsed.stressReaction,
        relationshipStyle: parsed.relationshipStyle,
        autonomyLevel: parsed.autonomyLevel,
        sleepQuality: parsed.sleepQuality,
        appetite: parsed.appetite,
        sadnessFrequent: parsed.sadnessFrequent,
        anxiety: parsed.anxiety,
        anger: parsed.anger,
        apathy: parsed.apathy,
        hopeMotivation: parsed.hopeMotivation,
        photoConsent: parsed.photoConsent,
        photoReference,
        contextPersonal: generated.contextPersonal,
        emotionalProfile: generated.emotionalProfile,
        mainNeeds: generated.mainNeeds,
        risks: generated.risks,
        staffRecommendations: generated.staffRecommendations,
        supportPlan: generated.supportPlan,
        observations,
        signatureResponsible
      }
    });

    await logAudit({
      workspaceId: params.workspaceId,
      actorId: user.id,
      action: 'PSYCHOSOCIAL_PROFILE_CREATED',
      metadata: {
        profileId: profile.id,
        internalName: profile.internalName
      }
    });

    return NextResponse.json(
      {
        profile: serializeProfile(profile),
        ai: {
          provider: parsed.provider,
          model: generatedText.model,
          fallbackRulesUsed: usedFallback
        }
      },
      { status: 201 }
    );
  } catch (error) {
    return jsonError(error);
  }
}
