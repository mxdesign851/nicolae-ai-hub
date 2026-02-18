import { Plan } from '@prisma/client';

export type PlanLimits = {
  maxWorkspaces: number;
  maxLocations: number;
  monthlyGenerations: number;
  maxUsers: number;
  hasBrandVoice: boolean;
  hasApprovalWorkflow: boolean;
  hasBulkTools: boolean;
  hasExports: boolean;
  hasPrioritySettings: boolean;
  hasBasicTemplatesOnly: boolean;
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    maxWorkspaces: 1,
    maxLocations: 1,
    monthlyGenerations: 50,
    maxUsers: 2,
    hasBrandVoice: false,
    hasApprovalWorkflow: false,
    hasBulkTools: false,
    hasExports: false,
    hasPrioritySettings: false,
    hasBasicTemplatesOnly: true
  },
  PRO: {
    maxWorkspaces: 5,
    maxLocations: 3,
    monthlyGenerations: 1000,
    maxUsers: 10,
    hasBrandVoice: true,
    hasApprovalWorkflow: true,
    hasBulkTools: false,
    hasExports: false,
    hasPrioritySettings: false,
    hasBasicTemplatesOnly: false
  },
  AGENCY: {
    maxWorkspaces: Number.MAX_SAFE_INTEGER,
    maxLocations: Number.MAX_SAFE_INTEGER,
    monthlyGenerations: 10000,
    maxUsers: Number.MAX_SAFE_INTEGER,
    hasBrandVoice: true,
    hasApprovalWorkflow: true,
    hasBulkTools: true,
    hasExports: true,
    hasPrioritySettings: true,
    hasBasicTemplatesOnly: false
  }
};

export function getMonthBucket(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

const PLAN_WEIGHT: Record<Plan, number> = {
  FREE: 0,
  PRO: 1,
  AGENCY: 2
};

export function planMeetsRequirement(current: Plan, required: Plan) {
  return PLAN_WEIGHT[current] >= PLAN_WEIGHT[required];
}

export function planDisplayName(plan: Plan) {
  switch (plan) {
    case 'FREE':
      return 'Free';
    case 'PRO':
      return 'Pro';
    case 'AGENCY':
      return 'Agency';
    default:
      return plan;
  }
}
