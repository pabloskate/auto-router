import { fetchOpenRouterCatalog } from "./openrouter-catalog";
import type {
  IngestionOptions,
  IngestionResult,
} from "./types";

export async function fetchAndBuildIngestionArtifacts(args: {
  openRouterApiKey?: string;
  openRouterUrl?: string;
  options?: IngestionOptions;
  fetchImpl?: typeof fetch;
}): Promise<IngestionResult> {
  const now = args.options?.now ?? new Date();

  const openRouterModels = await fetchOpenRouterCatalog({
    apiKey: args.openRouterApiKey,
    url: args.openRouterUrl,
    fetchImpl: args.fetchImpl
  });

  return {
    catalog: openRouterModels,
    version: `catalog-${now.toISOString().slice(0, 10)}`,
    generatedAt: now.toISOString()
  };
}
