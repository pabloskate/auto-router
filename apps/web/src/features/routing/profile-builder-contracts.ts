import type { RouterProfile } from "@custom-router/core";

export const PROFILE_BUILDER_OPTIMIZE_FOR = ["balanced", "quality", "speed", "cost"] as const;
export type ProfileBuilderOptimizeFor = (typeof PROFILE_BUILDER_OPTIMIZE_FOR)[number];

export const PROFILE_BUILDER_TASK_FAMILIES = [
  "general",
  "coding",
  "agentic_coding",
  "research",
  "support",
  "long_context",
  "multimodal",
] as const;
export type ProfileBuilderTaskFamily = (typeof PROFILE_BUILDER_TASK_FAMILIES)[number];

export const PROFILE_BUILDER_LATENCY_SENSITIVITIES = ["low", "medium", "high"] as const;
export type ProfileBuilderLatencySensitivity = (typeof PROFILE_BUILDER_LATENCY_SENSITIVITIES)[number];

export const PROFILE_BUILDER_BUDGET_POSTURES = ["balanced", "budget_first", "quality_first"] as const;
export type ProfileBuilderBudgetPosture = (typeof PROFILE_BUILDER_BUDGET_POSTURES)[number];

export const PROFILE_BUILDER_RUN_STATUSES = ["running", "completed", "error"] as const;
export type ProfileBuilderRunStatus = (typeof PROFILE_BUILDER_RUN_STATUSES)[number];

export const PROFILE_BUILDER_RESEARCH_MODES = ["catalog_only", "live_verified"] as const;
export type ProfileBuilderResearchMode = (typeof PROFILE_BUILDER_RESEARCH_MODES)[number];

export interface ProfileBuilderRequest {
  profileId: string;
  displayName: string;
  optimizeFor: ProfileBuilderOptimizeFor;
  taskFamilies: ProfileBuilderTaskFamily[];
  needsVision: boolean;
  needsLongContext: boolean;
  latencySensitivity: ProfileBuilderLatencySensitivity;
  budgetPosture: ProfileBuilderBudgetPosture;
  preferredGatewayId?: string;
  mustUse?: string;
  avoid?: string;
  additionalContext?: string;
}

export interface ProfileBuilderExecutor {
  gatewayId: string;
  gatewayName: string;
  gatewayPresetId: "openrouter" | "vercel" | "opencode-go";
  modelId: string;
  modelName: string;
}

export interface ProfileBuilderSource {
  label: string;
  url: string;
  verifiedAt: string;
}

export interface ProfileBuilderRecommendation {
  gatewayId: string;
  modelId: string;
  modelName: string;
  roleLabel: string;
  rationale: string;
  score: number;
  liveVerified: boolean;
  contextSummary?: string;
  costSummary?: string;
}

export interface ProfileBuilderRejection {
  modelId: string;
  modelName: string;
  reason: string;
}

export interface ProfileBuilderRun {
  id: string;
  status: ProfileBuilderRunStatus;
  request: ProfileBuilderRequest;
  executor: ProfileBuilderExecutor;
  draftProfile?: RouterProfile;
  recommendations: ProfileBuilderRecommendation[];
  rejections: ProfileBuilderRejection[];
  sources: ProfileBuilderSource[];
  researchMode?: ProfileBuilderResearchMode;
  summary?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  finishedAt?: string;
}
