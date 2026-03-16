import type { CatalogItem, RouterProfile, RouterProfileModel } from "@custom-router/core";

export const AUTO_PROFILE_ID = "auto";
export const AUTO_PROFILE_NAME = "Auto";
const PROFILE_MODEL_KEY_SEPARATOR = "::";

function sanitizeOptionalString(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function buildProfileModelKey(gatewayId: string, modelId: string): string {
  return `${gatewayId}${PROFILE_MODEL_KEY_SEPARATOR}${modelId}`;
}

export function parseProfileModelKey(value: string | null | undefined): { gatewayId: string; modelId: string } | null {
  const trimmed = sanitizeOptionalString(value);
  if (!trimmed) {
    return null;
  }

  const separatorIndex = trimmed.indexOf(PROFILE_MODEL_KEY_SEPARATOR);
  if (separatorIndex <= 0) {
    return null;
  }

  const gatewayId = trimmed.slice(0, separatorIndex);
  const modelId = trimmed.slice(separatorIndex + PROFILE_MODEL_KEY_SEPARATOR.length);
  if (!gatewayId || !modelId) {
    return null;
  }

  return { gatewayId, modelId };
}

export function normalizeProfileModel(model: RouterProfileModel): RouterProfileModel {
  const reasoningPreset = model.reasoningPreset ?? model.thinking;

  return {
    gatewayId: sanitizeOptionalString(model.gatewayId),
    modelId: sanitizeOptionalString(model.modelId) ?? "",
    name: sanitizeOptionalString(model.name),
    modality: sanitizeOptionalString(model.modality),
    reasoningPreset,
    thinking: reasoningPreset ?? model.thinking,
    whenToUse: sanitizeOptionalString(model.whenToUse),
    description: sanitizeOptionalString(model.description),
  };
}

export function hasResolvedProfileModel(model: RouterProfileModel | null | undefined): model is RouterProfileModel & { gatewayId: string } {
  return Boolean(sanitizeOptionalString(model?.gatewayId) && sanitizeOptionalString(model?.modelId));
}

export function profileModelToCatalogItem(model: RouterProfileModel | null | undefined): CatalogItem | null {
  if (!model || !hasResolvedProfileModel(model)) {
    return null;
  }

  const normalized = normalizeProfileModel(model);
  const reasoningPreset = normalized.reasoningPreset ?? normalized.thinking;

  return {
    id: normalized.modelId,
    name: normalized.name ?? normalized.modelId,
    modality: normalized.modality,
    reasoningPreset,
    thinking: reasoningPreset ?? normalized.thinking,
    whenToUse: normalized.whenToUse,
    description: normalized.description,
    gatewayId: normalized.gatewayId,
  };
}

export function normalizeProfile(profile: RouterProfile): RouterProfile {
  return {
    id: sanitizeOptionalString(profile.id) ?? "",
    name: sanitizeOptionalString(profile.name) ?? "",
    description: sanitizeOptionalString(profile.description),
    defaultModel: sanitizeOptionalString(profile.defaultModel),
    classifierModel: sanitizeOptionalString(profile.classifierModel),
    routingInstructions: sanitizeOptionalString(profile.routingInstructions),
    models: Array.isArray(profile.models) ? profile.models.map(normalizeProfileModel) : [],
  };
}

export function ensureAutoProfile(profiles: RouterProfile[] | null | undefined): RouterProfile[] {
  const items = (profiles ?? []).map(normalizeProfile);
  const autoIndex = items.findIndex((profile) => profile.id === AUTO_PROFILE_ID);

  if (autoIndex === -1) {
    return [{ id: AUTO_PROFILE_ID, name: AUTO_PROFILE_NAME, models: [] }, ...items];
  }

  const autoProfile = items[autoIndex] as RouterProfile;
  items[autoIndex] = {
    ...autoProfile,
    id: AUTO_PROFILE_ID,
    name: sanitizeOptionalString(autoProfile.name) ?? AUTO_PROFILE_NAME,
    models: Array.isArray(autoProfile.models) ? autoProfile.models : [],
  };

  return items;
}

function profileHasLegacyShape(profile: unknown): boolean {
  if (!profile || typeof profile !== "object") {
    return true;
  }

  const candidate = profile as Record<string, unknown>;
  if ("overrideModels" in candidate || "blocklist" in candidate || "catalogFilter" in candidate) {
    return true;
  }

  return !Array.isArray(candidate.models);
}

export function hasLegacyRoutingConfig(args: {
  defaultModel?: string | null;
  classifierModel?: string | null;
  routingInstructions?: string | null;
  blocklist?: string[] | null;
  profiles?: unknown[] | null;
}): boolean {
  if (sanitizeOptionalString(args.defaultModel) || sanitizeOptionalString(args.classifierModel) || sanitizeOptionalString(args.routingInstructions)) {
    return true;
  }

  if (Array.isArray(args.blocklist) && args.blocklist.some((value) => sanitizeOptionalString(value))) {
    return true;
  }

  if (!Array.isArray(args.profiles)) {
    return false;
  }

  return args.profiles.some(profileHasLegacyShape);
}
