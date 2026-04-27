import { GATEWAY_PRESETS } from "@/src/lib/gateway-presets";

export type GatewayCapabilityTier = "full" | "partial" | "basic";

export interface GatewayCapabilityProfile {
  tier: GatewayCapabilityTier;
  supportsReasoningEffort: boolean;
  supportsReasoningDetails: boolean;
  supportsReasoningRoundTrip: boolean;
  supportsPromptCaching: boolean;
  supportsFamilyIdentity: boolean;
  supportsPreviousResponseLinking: boolean;
  supportsAdaptiveInFamilyShift: boolean;
}

const PRESET_CAPABILITIES: Record<string, GatewayCapabilityProfile> = {
  openrouter: {
    tier: "full",
    supportsReasoningEffort: true,
    supportsReasoningDetails: true,
    supportsReasoningRoundTrip: true,
    supportsPromptCaching: true,
    supportsFamilyIdentity: true,
    supportsPreviousResponseLinking: true,
    supportsAdaptiveInFamilyShift: true,
  },
  vercel: {
    tier: "full",
    supportsReasoningEffort: true,
    supportsReasoningDetails: true,
    supportsReasoningRoundTrip: true,
    supportsPromptCaching: true,
    supportsFamilyIdentity: true,
    supportsPreviousResponseLinking: true,
    supportsAdaptiveInFamilyShift: true,
  },
  "opencode-go": {
    tier: "basic",
    supportsReasoningEffort: false,
    supportsReasoningDetails: false,
    supportsReasoningRoundTrip: false,
    supportsPromptCaching: false,
    supportsFamilyIdentity: false,
    supportsPreviousResponseLinking: false,
    supportsAdaptiveInFamilyShift: false,
  },
  openai: {
    tier: "full",
    supportsReasoningEffort: true,
    supportsReasoningDetails: true,
    supportsReasoningRoundTrip: true,
    supportsPromptCaching: true,
    supportsFamilyIdentity: true,
    supportsPreviousResponseLinking: true,
    supportsAdaptiveInFamilyShift: true,
  },
  fireworks: {
    tier: "basic",
    supportsReasoningEffort: false,
    supportsReasoningDetails: false,
    supportsReasoningRoundTrip: false,
    supportsPromptCaching: false,
    supportsFamilyIdentity: false,
    supportsPreviousResponseLinking: false,
    supportsAdaptiveInFamilyShift: false,
  },
  together: {
    tier: "basic",
    supportsReasoningEffort: false,
    supportsReasoningDetails: false,
    supportsReasoningRoundTrip: false,
    supportsPromptCaching: false,
    supportsFamilyIdentity: false,
    supportsPreviousResponseLinking: false,
    supportsAdaptiveInFamilyShift: false,
  },
  groq: {
    tier: "partial",
    supportsReasoningEffort: true,
    supportsReasoningDetails: true,
    supportsReasoningRoundTrip: false,
    supportsPromptCaching: true,
    supportsFamilyIdentity: true,
    supportsPreviousResponseLinking: false,
    supportsAdaptiveInFamilyShift: true,
  },
  mistral: {
    tier: "partial",
    supportsReasoningEffort: true,
    supportsReasoningDetails: true,
    supportsReasoningRoundTrip: false,
    supportsPromptCaching: true,
    supportsFamilyIdentity: true,
    supportsPreviousResponseLinking: false,
    supportsAdaptiveInFamilyShift: true,
  },
  perplexity: {
    tier: "basic",
    supportsReasoningEffort: false,
    supportsReasoningDetails: false,
    supportsReasoningRoundTrip: false,
    supportsPromptCaching: false,
    supportsFamilyIdentity: false,
    supportsPreviousResponseLinking: false,
    supportsAdaptiveInFamilyShift: false,
  },
  deepseek: {
    tier: "partial",
    supportsReasoningEffort: true,
    supportsReasoningDetails: false,
    supportsReasoningRoundTrip: false,
    supportsPromptCaching: true,
    supportsFamilyIdentity: true,
    supportsPreviousResponseLinking: false,
    supportsAdaptiveInFamilyShift: true,
  },
  xai: {
    tier: "partial",
    supportsReasoningEffort: true,
    supportsReasoningDetails: false,
    supportsReasoningRoundTrip: false,
    supportsPromptCaching: true,
    supportsFamilyIdentity: true,
    supportsPreviousResponseLinking: false,
    supportsAdaptiveInFamilyShift: true,
  },
  deepinfra: {
    tier: "basic",
    supportsReasoningEffort: false,
    supportsReasoningDetails: false,
    supportsReasoningRoundTrip: false,
    supportsPromptCaching: false,
    supportsFamilyIdentity: false,
    supportsPreviousResponseLinking: false,
    supportsAdaptiveInFamilyShift: false,
  },
  cerebras: {
    tier: "basic",
    supportsReasoningEffort: false,
    supportsReasoningDetails: false,
    supportsReasoningRoundTrip: false,
    supportsPromptCaching: false,
    supportsFamilyIdentity: false,
    supportsPreviousResponseLinking: false,
    supportsAdaptiveInFamilyShift: false,
  },
  novita: {
    tier: "basic",
    supportsReasoningEffort: false,
    supportsReasoningDetails: false,
    supportsReasoningRoundTrip: false,
    supportsPromptCaching: false,
    supportsFamilyIdentity: false,
    supportsPreviousResponseLinking: false,
    supportsAdaptiveInFamilyShift: false,
  },
  hyperbolic: {
    tier: "basic",
    supportsReasoningEffort: false,
    supportsReasoningDetails: false,
    supportsReasoningRoundTrip: false,
    supportsPromptCaching: false,
    supportsFamilyIdentity: false,
    supportsPreviousResponseLinking: false,
    supportsAdaptiveInFamilyShift: false,
  },
  baseten: {
    tier: "partial",
    supportsReasoningEffort: true,
    supportsReasoningDetails: true,
    supportsReasoningRoundTrip: false,
    supportsPromptCaching: true,
    supportsFamilyIdentity: true,
    supportsPreviousResponseLinking: false,
    supportsAdaptiveInFamilyShift: true,
  },
  moonshot: {
    tier: "partial",
    supportsReasoningEffort: true,
    supportsReasoningDetails: true,
    supportsReasoningRoundTrip: false,
    supportsPromptCaching: true,
    supportsFamilyIdentity: true,
    supportsPreviousResponseLinking: false,
    supportsAdaptiveInFamilyShift: true,
  },
  gemini: {
    tier: "full",
    supportsReasoningEffort: true,
    supportsReasoningDetails: true,
    supportsReasoningRoundTrip: true,
    supportsPromptCaching: true,
    supportsFamilyIdentity: true,
    supportsPreviousResponseLinking: true,
    supportsAdaptiveInFamilyShift: true,
  },
};

const DEFAULT_PROFILE: GatewayCapabilityProfile = {
  tier: "basic",
  supportsReasoningEffort: false,
  supportsReasoningDetails: false,
  supportsReasoningRoundTrip: false,
  supportsPromptCaching: false,
  supportsFamilyIdentity: false,
  supportsPreviousResponseLinking: false,
  supportsAdaptiveInFamilyShift: false,
};

const BASE_URL_TO_PRESET = new Map<string, string>();
for (const preset of GATEWAY_PRESETS) {
  BASE_URL_TO_PRESET.set(normalizeUrl(preset.baseUrl), preset.id);
}

function normalizeUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/g, "").toLowerCase();
}

export function getCapabilityForPreset(presetId: string): GatewayCapabilityProfile {
  return PRESET_CAPABILITIES[presetId] ?? DEFAULT_PROFILE;
}

export function resolveGatewayCapabilityForBaseUrl(baseUrl?: string | null): GatewayCapabilityProfile {
  if (!baseUrl) {
    return DEFAULT_PROFILE;
  }
  const normalized = normalizeUrl(baseUrl);
  const presetId = BASE_URL_TO_PRESET.get(normalized);
  if (!presetId) {
    return DEFAULT_PROFILE;
  }
  return getCapabilityForPreset(presetId);
}

export const GATEWAY_CAPABILITY_PROFILES = PRESET_CAPABILITIES;
