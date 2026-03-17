import type {
  CatalogItem,
  ReasoningEffort,
  ReasoningPolicyMode,
  ReasoningPreset,
} from "./types";
import { REASONING_PRESETS } from "./types";

export function getCatalogItemReasoningEffort(
  item: Pick<CatalogItem, "reasoningPreset" | "thinking"> | null | undefined
): ReasoningEffort | undefined {
  return item?.reasoningPreset ?? item?.thinking;
}

export function toComparableReasoningPreset(
  effort: ReasoningEffort | null | undefined
): ReasoningPreset {
  return !effort || effort === "provider_default" ? "none" : effort;
}

export function getCatalogItemReasoningPreset(
  item: Pick<CatalogItem, "reasoningPreset" | "thinking"> | null | undefined
): ReasoningPreset {
  return toComparableReasoningPreset(getCatalogItemReasoningEffort(item));
}

export function getCatalogItemFamilyId(
  item: Pick<CatalogItem, "id" | "upstreamModelId">
): string {
  return item.upstreamModelId ?? item.id;
}

export function getFamilyIdForModel(catalog: CatalogItem[], modelId: string): string | undefined {
  const item = catalog.find((candidate) => candidate.id === modelId);
  return item ? getCatalogItemFamilyId(item) : undefined;
}

export function compareReasoningPresets(left: ReasoningPreset, right: ReasoningPreset): number {
  return REASONING_PRESETS.indexOf(left) - REASONING_PRESETS.indexOf(right);
}

export function resolveFixedPolicyEffort(mode: ReasoningPolicyMode | undefined): ReasoningEffort | undefined {
  if (!mode || mode === "off" || mode === "adaptive") {
    return undefined;
  }

  if (mode === "fixed_provider_default") return "provider_default";
  if (mode === "fixed_none") return "none";
  if (mode === "fixed_minimal") return "minimal";
  if (mode === "fixed_low") return "low";
  if (mode === "fixed_medium") return "medium";
  if (mode === "fixed_high") return "high";
  return "xhigh";
}

export function resolveNearestFamilyModel(args: {
  catalog: CatalogItem[];
  familyId: string;
  targetEffort: ReasoningEffort;
  fallbackModelId?: string;
}): CatalogItem | undefined {
  const familyModels = args.catalog.filter((item) => getCatalogItemFamilyId(item) === args.familyId);
  if (familyModels.length === 0) {
    return undefined;
  }

  const exact = familyModels.find((item) => getCatalogItemReasoningEffort(item) === args.targetEffort);
  if (exact) {
    return exact;
  }

  const nearest = familyModels
    .slice()
    .sort((left, right) => {
      const leftDistance = Math.abs(compareReasoningPresets(
        getCatalogItemReasoningPreset(left),
        toComparableReasoningPreset(args.targetEffort),
      ));
      const rightDistance = Math.abs(compareReasoningPresets(
        getCatalogItemReasoningPreset(right),
        toComparableReasoningPreset(args.targetEffort),
      ));
      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }

      return left.id.localeCompare(right.id);
    })[0];

  if (nearest) {
    return nearest;
  }

  if (args.fallbackModelId) {
    return familyModels.find((item) => item.id === args.fallbackModelId);
  }

  return undefined;
}
