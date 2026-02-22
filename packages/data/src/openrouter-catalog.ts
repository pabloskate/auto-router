import type { NormalizedOpenRouterModel, OpenRouterModelRaw } from "./types";

const DEFAULT_URL = "https://openrouter.ai/api/v1/models";

function numeric(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function priceToPerMillion(value: unknown): number {
  const parsed = numeric(value);
  if (parsed <= 0) {
    return 0;
  }

  // OpenRouter pricing is often per-token decimal dollar values.
  if (parsed < 0.1) {
    return parsed * 1_000_000;
  }

  return parsed;
}

function normalizeModel(model: OpenRouterModelRaw): NormalizedOpenRouterModel {
  return {
    id: model.id,
    name: model.name ?? model.id,
    contextTokens: model.context_length ?? model.top_provider?.max_completion_tokens ?? 0,
    inputPricePerMillion: priceToPerMillion(model.pricing?.prompt),
    outputPricePerMillion: priceToPerMillion(model.pricing?.completion),
    modality: model.architecture?.modality
  };
}

function extractRows(payload: unknown): OpenRouterModelRaw[] {
  if (Array.isArray(payload)) {
    return payload as OpenRouterModelRaw[];
  }

  if (payload && typeof payload === "object") {
    const maybeObject = payload as { data?: unknown; models?: unknown };
    if (Array.isArray(maybeObject.data)) {
      return maybeObject.data as OpenRouterModelRaw[];
    }

    if (Array.isArray(maybeObject.models)) {
      return maybeObject.models as OpenRouterModelRaw[];
    }
  }

  return [];
}

export async function fetchOpenRouterCatalog(args: {
  apiKey?: string;
  url?: string;
  fetchImpl?: typeof fetch;
}): Promise<NormalizedOpenRouterModel[]> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const headers: Record<string, string> = {
    Accept: "application/json"
  };

  if (args.apiKey) {
    headers.Authorization = `Bearer ${args.apiKey}`;
  }

  const response = await fetchImpl(args.url ?? DEFAULT_URL, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter catalog request failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as unknown;
  const rows = extractRows(payload);
  return rows.map(normalizeModel);
}
