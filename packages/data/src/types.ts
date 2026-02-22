export interface OpenRouterModelRaw {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: {
    prompt?: string | number;
    completion?: string | number;
    request?: string | number;
    image?: string | number;
  };
  top_provider?: {
    max_completion_tokens?: number;
  };
  architecture?: {
    modality?: string;
    tokenizer?: string;
    instruct_type?: string;
  };
  [key: string]: unknown;
}

export interface OpenRouterProviderRaw {
  slug?: string;
  name?: string;
  status?: string;
  [key: string]: unknown;
}

export interface OpenRouterModelEndpointRaw {
  provider_name?: string;
  provider_slug?: string;
  status?: string;
  context_length?: number;
  [key: string]: unknown;
}

export interface NormalizedOpenRouterModel {
  id: string;
  name: string;
  contextTokens: number;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  modality?: string;
}

export interface NormalizedOpenRouterProvider {
  slug: string;
  name: string;
  status: string;
}

export interface NormalizedOpenRouterModelEndpoint {
  modelId: string;
  provider: string;
  status: string;
  contextTokens: number;
}

export interface IngestionOptions {
  now?: Date;
}

export interface IngestionResult {
  catalog: NormalizedOpenRouterModel[];
  version: string;
  generatedAt: string;
}
