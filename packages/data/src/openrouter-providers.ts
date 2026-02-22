import type {
  NormalizedOpenRouterModelEndpoint,
  NormalizedOpenRouterProvider,
  OpenRouterModelEndpointRaw,
  OpenRouterProviderRaw
} from "./types";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

function normalizeProviderRow(row: OpenRouterProviderRaw): NormalizedOpenRouterProvider | null {
  const slug = (row.slug ?? row.name ?? "").toString().trim().toLowerCase();
  if (!slug) {
    return null;
  }

  return {
    slug,
    name: (row.name ?? slug).toString(),
    status: (row.status ?? "unknown").toString()
  };
}

function extractRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const objectPayload = payload as { data?: unknown; providers?: unknown; endpoints?: unknown };

    if (Array.isArray(objectPayload.data)) {
      return objectPayload.data;
    }

    if (Array.isArray(objectPayload.providers)) {
      return objectPayload.providers;
    }

    if (Array.isArray(objectPayload.endpoints)) {
      return objectPayload.endpoints;
    }
  }

  return [];
}

function normalizeEndpointRow(
  modelId: string,
  row: OpenRouterModelEndpointRaw
): NormalizedOpenRouterModelEndpoint | null {
  const provider = (row.provider_slug ?? row.provider_name ?? "").toString().trim().toLowerCase();
  if (!provider) {
    return null;
  }

  return {
    modelId,
    provider,
    status: (row.status ?? "unknown").toString(),
    contextTokens: typeof row.context_length === "number" ? row.context_length : 0
  };
}

export async function fetchOpenRouterProviders(args: {
  apiKey: string;
  url?: string;
  fetchImpl?: typeof fetch;
}): Promise<NormalizedOpenRouterProvider[]> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const response = await fetchImpl(args.url ?? `${DEFAULT_BASE_URL}/providers`, {
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter providers request failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as unknown;
  return extractRows(payload)
    .map((row) => normalizeProviderRow(row as OpenRouterProviderRaw))
    .filter((row): row is NormalizedOpenRouterProvider => row !== null);
}

export async function fetchOpenRouterUserModelIds(args: {
  apiKey: string;
  url?: string;
  fetchImpl?: typeof fetch;
}): Promise<Set<string>> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const response = await fetchImpl(args.url ?? `${DEFAULT_BASE_URL}/models/user`, {
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    // Some keys may not have access to this endpoint; fail open.
    return new Set<string>();
  }

  const payload = (await response.json()) as unknown;
  const ids = extractRows(payload)
    .map((row) => {
      if (row && typeof row === "object" && "id" in row) {
        const id = (row as { id?: unknown }).id;
        return typeof id === "string" ? id : "";
      }
      return "";
    })
    .filter((id) => id.length > 0);

  return new Set(ids);
}

function encodeModelPath(modelId: string): string {
  return modelId
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export async function fetchOpenRouterModelEndpoints(args: {
  apiKey: string;
  modelIds: string[];
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}): Promise<NormalizedOpenRouterModelEndpoint[]> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const baseUrl = args.baseUrl ?? DEFAULT_BASE_URL;

  const results: NormalizedOpenRouterModelEndpoint[] = [];

  for (const modelId of args.modelIds) {
    const response = await fetchImpl(`${baseUrl}/models/${encodeModelPath(modelId)}/endpoints`, {
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      // Endpoint availability varies by model/provider; skip failures.
      continue;
    }

    const payload = (await response.json()) as unknown;
    const rows = extractRows(payload)
      .map((row) => normalizeEndpointRow(modelId, row as OpenRouterModelEndpointRaw))
      .filter((row): row is NormalizedOpenRouterModelEndpoint => row !== null);

    results.push(...rows);
  }

  return results;
}
