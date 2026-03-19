import { GATEWAY_PRESETS, type GatewayPreset } from "@/src/lib/gateway-presets";

export interface GatewayRecommendation {
  id: "openrouter" | "vercel" | "cloudflare";
  name: string;
  badge: string;
  summary: string;
  setup: string;
  quickSetup: boolean;
  baseUrlHint: string;
}

export const QUICK_SETUP_GATEWAY_PRESET_IDS = ["openrouter", "vercel"] as const;

const QUICK_SETUP_GATEWAY_PRESET_ID_SET = new Set<string>(QUICK_SETUP_GATEWAY_PRESET_IDS);

const PRESETS_BY_ID = new Map(GATEWAY_PRESETS.map((preset) => [preset.id, preset] as const));

function requirePreset(id: string): GatewayPreset {
  const preset = PRESETS_BY_ID.get(id);
  if (!preset) {
    throw new Error(`Missing gateway preset: ${id}`);
  }
  return preset;
}

const OPENROUTER_PRESET = requirePreset("openrouter");
const VERCEL_PRESET = requirePreset("vercel");

export const GATEWAY_RECOMMENDATIONS: readonly GatewayRecommendation[] = [
  {
    id: "openrouter",
    name: OPENROUTER_PRESET.name,
    badge: "Best default",
    summary: "Fastest path to a multi-provider inventory with one key.",
    setup: "Choose OpenRouter below, save the key, then sync models. Quick setup profiles work here today.",
    quickSetup: true,
    baseUrlHint: OPENROUTER_PRESET.baseUrl,
  },
  {
    id: "vercel",
    name: VERCEL_PRESET.name,
    badge: "Best if you use Vercel",
    summary: "Strong fit when you already want gateway-side budgets, fallbacks, and usage tracking in Vercel.",
    setup: "Choose Vercel AI Gateway below, save the key, then sync models. Quick setup profiles work here today.",
    quickSetup: true,
    baseUrlHint: VERCEL_PRESET.baseUrl,
  },
  {
    id: "cloudflare",
    name: "Cloudflare AI Gateway",
    badge: "Best if you use Cloudflare",
    summary: "Good fit for Cloudflare-native observability, caching, and rate limiting across providers.",
    setup: "Use Other / Custom below and paste your full OpenAI-compatible Cloudflare endpoint.",
    quickSetup: false,
    baseUrlHint: "https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/compat",
  },
];

export const GATEWAY_SPEND_GUIDANCE =
  "Set budget limits, spend alerts, and rate limits in your upstream gateway or provider account. CustomRouter routes requests, but it does not enforce upstream spend caps.";

export function isQuickSetupGatewayPreset(presetId?: string | null): presetId is (typeof QUICK_SETUP_GATEWAY_PRESET_IDS)[number] {
  return typeof presetId === "string" && QUICK_SETUP_GATEWAY_PRESET_ID_SET.has(presetId);
}

export function getRecommendedGatewayPresets(): GatewayPreset[] {
  return QUICK_SETUP_GATEWAY_PRESET_IDS.map((presetId) => requirePreset(presetId));
}

export function getDirectProviderPresets(): GatewayPreset[] {
  return GATEWAY_PRESETS.filter((preset) => !QUICK_SETUP_GATEWAY_PRESET_ID_SET.has(preset.id));
}

export function getGatewayFormHint(presetId?: string): string {
  if (!presetId) {
    return "Start with OpenRouter unless you already manage AI traffic in Vercel or Cloudflare.";
  }

  if (presetId === "openrouter") {
    return "Recommended for the simplest multi-provider setup. Quick setup profiles work here today.";
  }

  if (presetId === "vercel") {
    return "Recommended if you already manage budgets and usage in Vercel. Quick setup profiles work here today.";
  }

  if (presetId === "__custom__") {
    return "Use this for Cloudflare AI Gateway or any other custom OpenAI-compatible composite endpoint.";
  }

  return "Direct providers still work, but composite gateways are the best fit when you want cross-provider routing and upstream budget controls.";
}
