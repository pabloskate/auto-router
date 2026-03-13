// ─────────────────────────────────────────────────────────────────────────────
// openrouter-models.ts
//
// Lightweight helpers for validating and searching model IDs against the
// OpenRouter /api/v1/models endpoint. The /models endpoint is public and
// requires no API key.
// ─────────────────────────────────────────────────────────────────────────────

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

export interface OpenRouterModelInfo {
  id: string;
  name: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  architecture?: { modality?: string };
}

let cachedModels: OpenRouterModelInfo[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchModelList(): Promise<OpenRouterModelInfo[]> {
  const now = Date.now();
  if (cachedModels && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedModels;
  }

  const response = await fetch(OPENROUTER_MODELS_URL, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`OpenRouter /models request failed (${response.status})`);
  }

  const payload = (await response.json()) as { data?: unknown[] };
  const rows = Array.isArray(payload.data) ? payload.data : [];

  cachedModels = rows as OpenRouterModelInfo[];
  cacheTimestamp = now;
  return cachedModels;
}

export async function validateModelId(
  modelId: string
): Promise<OpenRouterModelInfo | null> {
  const models = await fetchModelList();
  return models.find((m) => m.id === modelId) ?? null;
}

export async function searchModels(
  query: string,
  limit = 10
): Promise<OpenRouterModelInfo[]> {
  const models = await fetchModelList();
  const q = query.toLowerCase();

  const matches = models.filter(
    (m) =>
      m.id.toLowerCase().includes(q) ||
      (m.name && m.name.toLowerCase().includes(q))
  );

  return matches.slice(0, limit).map((m) => ({
    id: m.id,
    name: m.name,
    context_length: m.context_length,
    pricing: m.pricing,
    architecture: m.architecture,
  }));
}
