import { Plan } from '@prisma/client';

export type PlanLimits = {
  maxWorkspaces: number;
  maxLocations: number;
  monthlyGenerations: number;
  hasBrandVoice: boolean;
  hasApprovalWorkflow: boolean;
  hasBulkTools: boolean;
  hasExports: boolean;
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    maxWorkspaces: 1,
    maxLocations: 1,
    monthlyGenerations: 50,
    hasBrandVoice: false,
    hasApprovalWorkflow: false,
    hasBulkTools: false,
    hasExports: false
  },
  PRO: {
    maxWorkspaces: 10,
    maxLocations: 3,
    monthlyGenerations: 1000,
    hasBrandVoice: true,
    hasApprovalWorkflow: true,
    hasBulkTools: false,
    hasExports: false
  },
  AGENCY: {
    maxWorkspaces: 100,
    maxLocations: Number.MAX_SAFE_INTEGER,
    monthlyGenerations: 10000,
    hasBrandVoice: true,
    hasApprovalWorkflow: true,
    hasBulkTools: true,
    hasExports: true
  }
};

export function getMonthBucket(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
