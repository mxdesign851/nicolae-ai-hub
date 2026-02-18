export const FAMILY_SUPPORT_LEVELS = ['DA', 'NU', 'PARTIAL'] as const;
export const HOUSING_STATUSES = ['FARA_ADAPOST', 'CENTRU', 'FAMILIE', 'ALTA'] as const;
export const COMMUNICATION_LEVELS = ['MIC', 'MEDIU', 'BUN'] as const;
export const STRESS_REACTIONS = ['CALM', 'AGITAT', 'CRIZE'] as const;
export const RELATIONSHIP_STYLES = ['RETRAS', 'SOCIABIL', 'AGRESIV'] as const;
export const AUTONOMY_LEVELS = ['DEPENDENT', 'PARTIAL', 'INDEPENDENT'] as const;
export const SLEEP_QUALITIES = ['BUN', 'SLAB'] as const;
export const APPETITE_LEVELS = ['NORMAL', 'SCAZUT'] as const;

export type FamilySupportLevel = (typeof FAMILY_SUPPORT_LEVELS)[number];
export type HousingStatus = (typeof HOUSING_STATUSES)[number];
export type CommunicationLevel = (typeof COMMUNICATION_LEVELS)[number];
export type StressReaction = (typeof STRESS_REACTIONS)[number];
export type RelationshipStyle = (typeof RELATIONSHIP_STYLES)[number];
export type AutonomyLevel = (typeof AUTONOMY_LEVELS)[number];
export type SleepQuality = (typeof SLEEP_QUALITIES)[number];
export type AppetiteLevel = (typeof APPETITE_LEVELS)[number];

export const FAMILY_SUPPORT_LABELS: Record<FamilySupportLevel, string> = {
  DA: 'Da',
  NU: 'Nu',
  PARTIAL: 'Partial'
};

export const HOUSING_STATUS_LABELS: Record<HousingStatus, string> = {
  FARA_ADAPOST: 'Fara adapost',
  CENTRU: 'Centru',
  FAMILIE: 'Familie',
  ALTA: 'Alta situatie'
};

export const COMMUNICATION_LABELS: Record<CommunicationLevel, string> = {
  MIC: 'Mic',
  MEDIU: 'Mediu',
  BUN: 'Bun'
};

export const STRESS_LABELS: Record<StressReaction, string> = {
  CALM: 'Calm',
  AGITAT: 'Agitat',
  CRIZE: 'Crize'
};

export const RELATIONSHIP_LABELS: Record<RelationshipStyle, string> = {
  RETRAS: 'Retras',
  SOCIABIL: 'Sociabil',
  AGRESIV: 'Agresiv'
};

export const AUTONOMY_LABELS: Record<AutonomyLevel, string> = {
  DEPENDENT: 'Dependent',
  PARTIAL: 'Partial',
  INDEPENDENT: 'Independent'
};

export const SLEEP_LABELS: Record<SleepQuality, string> = {
  BUN: 'Bun',
  SLAB: 'Slab'
};

export const APPETITE_LABELS: Record<AppetiteLevel, string> = {
  NORMAL: 'Normal',
  SCAZUT: 'Scazut'
};

export type PsychosocialInput = {
  internalName: string;
  age: number;
  sex: string;
  locationCenter: string;
  assessmentDate: Date;
  responsiblePerson: string;
  familySupport: FamilySupportLevel;
  housingStatus: HousingStatus;
  familyContactFrequency?: string | null;
  institutionalizationHistory?: string | null;
  knownDiseases?: boolean | null;
  medicationInfo?: string | null;
  limitations?: string | null;
  previousPsychEvaluation?: boolean | null;
  communicationLevel: CommunicationLevel;
  stressReaction: StressReaction;
  relationshipStyle: RelationshipStyle;
  autonomyLevel: AutonomyLevel;
  sleepQuality: SleepQuality;
  appetite: AppetiteLevel;
  sadnessFrequent: boolean;
  anxiety: boolean;
  anger: boolean;
  apathy: boolean;
  hopeMotivation: boolean;
  observations?: string | null;
};

export type PsychosocialGeneratedProfile = {
  contextPersonal: string;
  emotionalProfile: string;
  mainNeeds: string[];
  risks: string[];
  staffRecommendations: string[];
  supportPlan: string[];
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('ro-RO', { dateStyle: 'medium' }).format(date);
}

function hasLowFamilySupport(level: FamilySupportLevel) {
  return level === 'NU' || level === 'PARTIAL';
}

function buildEmotionalLoadScore(input: PsychosocialInput) {
  return [input.sadnessFrequent, input.anxiety, input.anger, input.apathy, !input.hopeMotivation].filter(Boolean).length;
}

function selectEmotionalLoadText(score: number) {
  if (score >= 4) return 'prezinta semne de incarcare emotionala ridicata si nevoie de sustinere constanta (orientativ)';
  if (score >= 2) return 'prezinta semne de incarcare emotionala moderata, cu nevoie de monitorizare periodica (orientativ)';
  return 'nivel stabil de adaptare emotionala in evaluarea curenta (orientativ)';
}

export function generatePsychosocialProfile(input: PsychosocialInput): PsychosocialGeneratedProfile {
  const needs = new Set<string>();
  const risks = new Set<string>();
  const recommendations = new Set<string>();
  const supportPlan = new Set<string>();

  const contextParts: string[] = [
    `${input.internalName}, ${input.age} ani, evaluat la data de ${formatDate(input.assessmentDate)} in ${input.locationCenter}.`,
    `Suport familial: ${FAMILY_SUPPORT_LABELS[input.familySupport]}.`,
    `Stare locativa: ${HOUSING_STATUS_LABELS[input.housingStatus]}.`
  ];

  if (input.familyContactFrequency) {
    contextParts.push(`Contact cu familia: ${input.familyContactFrequency}.`);
  }
  if (input.institutionalizationHistory) {
    contextParts.push(`Istoric institutionalizare: ${input.institutionalizationHistory}.`);
  }

  if (input.knownDiseases === true) {
    contextParts.push('Exista afectiuni medicale cunoscute care necesita urmarire.');
    needs.add('monitorizare medicala si aderenta la tratament');
    supportPlan.add('revizuire medicala periodica cu acord informat');
  } else if (input.knownDiseases === false) {
    contextParts.push('Nu sunt raportate afectiuni medicale majore in evaluarea curenta.');
  } else {
    contextParts.push('Datele medicale sunt partiale si necesita completare cu acord.');
  }

  if (input.medicationInfo) {
    contextParts.push(`Tratament mentionat: ${input.medicationInfo}.`);
    needs.add('organizare consecventa a administrarii tratamentului');
  }
  if (input.limitations) {
    contextParts.push(`Limitari functionale: ${input.limitations}.`);
    needs.add('sprijin pentru autonomie functionala');
  }

  if (hasLowFamilySupport(input.familySupport)) {
    needs.add('atasament si suport relational stabil');
    risks.add('risc de abandon social');
    supportPlan.add('facilitarea contactului cu familia sau reteaua de sprijin');
  }
  if (input.housingStatus === 'FARA_ADAPOST') {
    needs.add('stabilitate locativa');
    risks.add('risc crescut de instabilitate sociala');
    supportPlan.add('plan activ pentru mentinerea locuirii protejate');
  }

  if (input.communicationLevel === 'MIC') {
    recommendations.add('folositi mesaje scurte, clare si repetate calm');
  }
  if (input.stressReaction === 'AGITAT' || input.stressReaction === 'CRIZE') {
    needs.add('predictibilitate si rutina zilnica');
    recommendations.add('mentineti ton calm, evitati suprastimularea si escaladarea');
    risks.add('posibile reactii intense in situatii de stres – recomandare: abordare calma');
    supportPlan.add('protocol simplu de de-escaladare aplicat unitar de echipa');
  }
  if (input.relationshipStyle === 'RETRAS') {
    needs.add('integrare sociala graduala');
    risks.add('risc de izolare');
    recommendations.add('incurajati activitati in grupuri mici, fara presiune');
  }
  if (input.relationshipStyle === 'AGRESIV') {
    recommendations.add('evitati confruntarea directa si folositi limite ferme, dar respectuoase');
    risks.add('risc de conflict interpersonal');
  }
  if (input.autonomyLevel !== 'INDEPENDENT') {
    needs.add('sprijin structurat pentru activitatile zilnice');
    supportPlan.add('plan zilnic cu pasi simpli pentru cresterea autonomiei');
  }
  if (input.sleepQuality === 'SLAB' || input.appetite === 'SCAZUT') {
    needs.add('monitorizare somn si alimentatie');
    supportPlan.add('urmarire saptamanala a somnului si a apetitului');
  }

  const emotionalLoadScore = buildEmotionalLoadScore(input);
  if (input.sadnessFrequent || input.apathy || input.anxiety) {
    needs.add('consiliere emotionala regulata');
    risks.add('prezinta semne de retragere si nevoie de sustinere');
  }
  if (input.anger) {
    recommendations.add('validati emotiile inainte de corectarea comportamentului');
  }
  if (!input.hopeMotivation) {
    needs.add('cresterea motivatiei prin obiective mici si realizabile');
  }

  recommendations.add('documentati observatiile zilnice in fisa de monitorizare');
  recommendations.add('pastrati abordare constanta intre toate turele');
  supportPlan.add('sedinta lunara de revizuire interdisciplinara');
  supportPlan.add('monitorizare psihosociala periodica, fara diagnostic – doar profil orientativ de sprijin');

  const emotionalProfile = [
    `Evaluarea orientativa indica ${selectEmotionalLoadText(emotionalLoadScore)}.`,
    `Reactia la stres este ${STRESS_LABELS[input.stressReaction].toLowerCase()},`,
    `relationarea este ${RELATIONSHIP_LABELS[input.relationshipStyle].toLowerCase()},`,
    `iar nivelul de autonomie este ${AUTONOMY_LABELS[input.autonomyLevel].toLowerCase()}.`,
    `Comunicarea este ${COMMUNICATION_LABELS[input.communicationLevel].toLowerCase()},`,
    `somnul este ${SLEEP_LABELS[input.sleepQuality].toLowerCase()} si apetitul este ${APPETITE_LABELS[input.appetite].toLowerCase()}.`
  ].join(' ');

  if (!risks.size) {
    risks.add('necesitate monitorizare consecventa pentru mentinerea stabilitatii');
  }
  if (!needs.size) {
    needs.add('mentinerea suportului relational si a rutinei zilnice');
  }

  return {
    contextPersonal: contextParts.join(' '),
    emotionalProfile,
    mainNeeds: Array.from(needs).slice(0, 6),
    risks: Array.from(risks).slice(0, 6),
    staffRecommendations: Array.from(recommendations).slice(0, 7),
    supportPlan: Array.from(supportPlan).slice(0, 6)
  };
}
