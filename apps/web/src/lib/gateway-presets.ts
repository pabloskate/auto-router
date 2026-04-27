// ─────────────────────────────────────────────────────────────────────────────
// gateway-presets.ts
//
// Known OpenAI-compatible API providers. Used by the gateway creation form
// to auto-fill name and base URL when the user picks a provider from the
// dropdown instead of typing values manually.
// ─────────────────────────────────────────────────────────────────────────────

export interface GatewayPreset {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string;
}

export const GATEWAY_PRESETS: readonly GatewayPreset[] = [
  { id: "openrouter",  name: "OpenRouter",    baseUrl: "https://openrouter.ai/api/v1" },
  { id: "vercel",      name: "Vercel AI Gateway", baseUrl: "https://ai-gateway.vercel.sh/v1" },
  { id: "opencode-go", name: "OpenCode Go",   baseUrl: "https://opencode.ai/zen/go/v1" },
  { id: "openai",      name: "OpenAI",        baseUrl: "https://api.openai.com/v1" },
  { id: "fireworks",   name: "Fireworks AI",  baseUrl: "https://api.fireworks.ai/inference/v1" },
  { id: "together",    name: "Together AI",   baseUrl: "https://api.together.xyz/v1" },
  { id: "groq",        name: "Groq",          baseUrl: "https://api.groq.com/openai/v1" },
  { id: "mistral",     name: "Mistral AI",    baseUrl: "https://api.mistral.ai/v1" },
  { id: "perplexity",  name: "Perplexity",    baseUrl: "https://api.perplexity.ai/v1" },
  { id: "deepseek",    name: "DeepSeek",      baseUrl: "https://api.deepseek.com" },
  { id: "xai",         name: "xAI",           baseUrl: "https://api.x.ai/v1" },
  { id: "deepinfra",   name: "Deepinfra",     baseUrl: "https://api.deepinfra.com/v1/openai" },
  { id: "cerebras",    name: "Cerebras",      baseUrl: "https://api.cerebras.ai/v1" },
  { id: "novita",      name: "Novita AI",     baseUrl: "https://api.novita.ai/openai" },
  { id: "hyperbolic",  name: "Hyperbolic",    baseUrl: "https://api.hyperbolic.xyz/v1" },
  { id: "baseten",     name: "BaseTen",       baseUrl: "https://inference.baseten.co/v1" },
  { id: "moonshot",    name: "Moonshot AI",   baseUrl: "https://api.moonshot.ai/v1" },
  { id: "gemini",      name: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/" },
];

/** Sentinel value for the "Other / Custom" dropdown option. */
export const CUSTOM_PRESET_ID = "__custom__";
