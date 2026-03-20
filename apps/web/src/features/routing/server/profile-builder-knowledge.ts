import type {
  ProfileBuilderResearchMode,
  ProfileBuilderSource,
  ProfileBuilderTaskFamily,
} from "@/src/features/routing/profile-builder-contracts";
import {
  listModelIntelligenceSources,
  MODEL_INTELLIGENCE,
  MODEL_INTELLIGENCE_LAST_VERIFIED,
  type ModelIntelligenceContextBand,
  type ModelIntelligenceCostTier,
  type ModelIntelligenceGatewayPresetId,
  type ModelIntelligenceModel,
} from "./model-intelligence";

export type ProfileBuilderGatewayPresetId = ModelIntelligenceGatewayPresetId;
export type ProfileBuilderContextBand = ModelIntelligenceContextBand;
export type ProfileBuilderCostTier = ModelIntelligenceCostTier;

export interface ProfileBuilderKnowledgeModel {
  id: string;
  name: string;
  supportedGateways: readonly ProfileBuilderGatewayPresetId[];
  modality?: string;
  contextBand: ProfileBuilderContextBand;
  costTier: ProfileBuilderCostTier;
  vision: boolean;
  structuredOutput: boolean;
  toolUse: boolean;
  quality: number;
  speed: number;
  cost: number;
  reliability: number;
  taskFamilies: readonly ProfileBuilderTaskFamily[];
  strengths: readonly string[];
  whenToUse: string;
  lastVerified: string;
  sources: readonly ProfileBuilderSource[];
}

export const PROFILE_BUILDER_LAST_VERIFIED = MODEL_INTELLIGENCE_LAST_VERIFIED;

function toProfileBuilderKnowledgeModel(model: ModelIntelligenceModel): ProfileBuilderKnowledgeModel {
  return {
    id: model.id,
    name: model.name,
    supportedGateways: model.supportedGateways,
    modality: model.modality,
    contextBand: model.derived.profileBuilder.contextBand,
    costTier: model.derived.profileBuilder.costTier,
    vision: model.vision,
    structuredOutput: model.structuredOutput,
    toolUse: model.toolUse,
    quality: model.derived.profileBuilder.quality,
    speed: model.derived.profileBuilder.speed,
    cost: model.derived.profileBuilder.cost,
    reliability: model.derived.profileBuilder.reliability,
    taskFamilies: model.derived.taskFamilies,
    strengths: model.derived.strengths,
    whenToUse: model.derived.whenToUse,
    lastVerified: model.lastVerified,
    sources: listModelIntelligenceSources(model),
  };
}

export const PROFILE_BUILDER_KNOWLEDGE: readonly ProfileBuilderKnowledgeModel[] =
  MODEL_INTELLIGENCE.map(toProfileBuilderKnowledgeModel);

export function getProfileBuilderKnowledge(modelId: string): ProfileBuilderKnowledgeModel | undefined {
  return PROFILE_BUILDER_KNOWLEDGE.find((entry) => entry.id === modelId);
}

export function mergeProfileBuilderSources(
  sources: readonly ProfileBuilderSource[],
  extras: readonly ProfileBuilderSource[] = [],
): ProfileBuilderSource[] {
  const seen = new Set<string>();
  const merged = [...sources, ...extras].filter((source) => {
    const key = `${source.label}::${source.url}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  return merged;
}

export function profileBuilderResearchModeFromVerification(usedLiveVerification: boolean): ProfileBuilderResearchMode {
  return usedLiveVerification ? "live_verified" : "catalog_only";
}
