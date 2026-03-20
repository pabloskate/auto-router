// Canonical hard-coded model intelligence for routing-profile suggestions.
// This dataset is intentionally separate from runtime routing presets/catalogs.

import type {
  ProfileBuilderSource,
  ProfileBuilderTaskFamily,
} from "@/src/features/routing/profile-builder-contracts";

export type ModelIntelligenceGatewayPresetId = "openrouter" | "vercel";
export type ModelIntelligenceContextBand = "standard" | "long" | "ultra";
export type ModelIntelligenceCostTier = "budget" | "efficient" | "mid" | "premium";

export type ModelIntelligenceMetricKind =
  | "benchmark"
  | "cost"
  | "latency"
  | "throughput"
  | "context"
  | "capability";

export type ModelIntelligenceMetricDirection =
  | "higher_better"
  | "lower_better"
  | "neutral";

export const MODEL_INTELLIGENCE_LENS_IDS = [
  "overall_quality",
  "coding_quality",
  "coding_value",
  "throughput",
  "ttft",
  "long_context",
  "research",
  "multimodal",
  "structured_output",
  "classifier_candidate",
  "budget_text",
  "open_source",
  "image_generation",
] as const;

export type ModelIntelligenceLensId = (typeof MODEL_INTELLIGENCE_LENS_IDS)[number];

export interface ModelIntelligenceMetricFact {
  metricId: string;
  label: string;
  kind: ModelIntelligenceMetricKind;
  value: number | string | boolean;
  unit: string;
  direction: ModelIntelligenceMetricDirection;
  source: ProfileBuilderSource;
  verifiedAt: string;
  note?: string;
}

export interface ModelIntelligenceLens {
  lens: ModelIntelligenceLensId;
  rank: number;
  rationale: string;
}

export interface ModelIntelligenceProfileBuilderMetadata {
  contextBand: ModelIntelligenceContextBand;
  costTier: ModelIntelligenceCostTier;
  quality: number;
  speed: number;
  cost: number;
  reliability: number;
}

export interface ModelIntelligenceDerivedMetadata {
  taskFamilies: readonly ProfileBuilderTaskFamily[];
  strengths: readonly string[];
  caveats?: readonly string[];
  whenToUse: string;
  profileBuilder: ModelIntelligenceProfileBuilderMetadata;
}

export interface ModelIntelligenceModel {
  id: string;
  name: string;
  supportedGateways: readonly ModelIntelligenceGatewayPresetId[];
  modality?: string;
  openSource: boolean;
  structuredOutput: boolean;
  toolUse: boolean;
  vision: boolean;
  contextWindow?: number;
  lastVerified: string;
  metrics: readonly ModelIntelligenceMetricFact[];
  lenses: readonly ModelIntelligenceLens[];
  derived: ModelIntelligenceDerivedMetadata;
}

export const MODEL_INTELLIGENCE_LAST_VERIFIED = "2026-03-19";

function source(label: string, url: string): ProfileBuilderSource {
  return {
    label,
    url,
    verifiedAt: MODEL_INTELLIGENCE_LAST_VERIFIED,
  };
}

function fact(args: Omit<ModelIntelligenceMetricFact, "verifiedAt">): ModelIntelligenceMetricFact {
  return {
    ...args,
    verifiedAt: args.source.verifiedAt,
  };
}

function artificialAnalysisSource(slug: string, label: string): ProfileBuilderSource {
  return source(label, `https://artificialanalysis.ai/models/${slug}`);
}

function openRouterSource(): ProfileBuilderSource {
  return source("OpenRouter models API", "https://openrouter.ai/api/v1/models");
}

function vercelModelsSource(): ProfileBuilderSource {
  return source("Vercel AI Gateway models endpoint", "https://ai-gateway.vercel.sh/v1/models");
}

function openRouterOperationalFacts(args: {
  contextWindow: number;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
}): ModelIntelligenceMetricFact[] {
  const apiSource = openRouterSource();
  return [
    fact({
      metricId: "openrouter_context_window_tokens",
      label: "OpenRouter context window",
      kind: "context",
      value: args.contextWindow,
      unit: "tokens",
      direction: "higher_better",
      source: apiSource,
    }),
    fact({
      metricId: "openrouter_input_price_per_million",
      label: "OpenRouter input price",
      kind: "cost",
      value: args.inputPricePerMillion,
      unit: "usd_per_million_tokens",
      direction: "lower_better",
      source: apiSource,
    }),
    fact({
      metricId: "openrouter_output_price_per_million",
      label: "OpenRouter output price",
      kind: "cost",
      value: args.outputPricePerMillion,
      unit: "usd_per_million_tokens",
      direction: "lower_better",
      source: apiSource,
    }),
  ];
}

function vercelOperationalFacts(args: {
  contextWindow: number;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
}): ModelIntelligenceMetricFact[] {
  const apiSource = vercelModelsSource();
  return [
    fact({
      metricId: "vercel_context_window_tokens",
      label: "Vercel context window",
      kind: "context",
      value: args.contextWindow,
      unit: "tokens",
      direction: "higher_better",
      source: apiSource,
    }),
    fact({
      metricId: "vercel_input_price_per_million",
      label: "Vercel input price",
      kind: "cost",
      value: args.inputPricePerMillion,
      unit: "usd_per_million_tokens",
      direction: "lower_better",
      source: apiSource,
    }),
    fact({
      metricId: "vercel_output_price_per_million",
      label: "Vercel output price",
      kind: "cost",
      value: args.outputPricePerMillion,
      unit: "usd_per_million_tokens",
      direction: "lower_better",
      source: apiSource,
    }),
  ];
}

function artificialAnalysisFacts(args: {
  slug: string;
  label: string;
  intelligenceIndex: number;
  outputTps?: number;
  ttftSeconds?: number;
  note?: string;
}): ModelIntelligenceMetricFact[] {
  const modelSource = artificialAnalysisSource(args.slug, args.label);
  const results: ModelIntelligenceMetricFact[] = [
    fact({
      metricId: "artificial_analysis_intelligence_index",
      label: "Artificial Analysis Intelligence Index",
      kind: "benchmark",
      value: args.intelligenceIndex,
      unit: "index",
      direction: "higher_better",
      source: modelSource,
      note: args.note,
    }),
  ];

  if (typeof args.outputTps === "number") {
    results.push(
      fact({
        metricId: "artificial_analysis_output_tps",
        label: "Artificial Analysis output speed",
        kind: "throughput",
        value: args.outputTps,
        unit: "tokens_per_second",
        direction: "higher_better",
        source: modelSource,
        note: args.note,
      }),
    );
  }

  if (typeof args.ttftSeconds === "number") {
    results.push(
      fact({
        metricId: "artificial_analysis_ttft_seconds",
        label: "Artificial Analysis TTFT",
        kind: "latency",
        value: args.ttftSeconds,
        unit: "seconds",
        direction: "lower_better",
        source: modelSource,
        note: args.note,
      }),
    );
  }

  return results;
}

function benchmarkClaimFact(args: {
  metricId: string;
  label: string;
  value: number | string;
  unit: string;
  source: ProfileBuilderSource;
  note?: string;
}): ModelIntelligenceMetricFact {
  return fact({
    metricId: args.metricId,
    label: args.label,
    kind: "benchmark",
    value: args.value,
    unit: args.unit,
    direction: "higher_better",
    source: args.source,
    note: args.note,
  });
}

export const MODEL_INTELLIGENCE: readonly ModelIntelligenceModel[] = [
  {
    id: "openai/gpt-5.4",
    name: "GPT-5.4",
    supportedGateways: ["openrouter"],
    modality: "text,image,file->text",
    openSource: false,
    structuredOutput: true,
    toolUse: true,
    vision: true,
    contextWindow: 1_050_000,
    lastVerified: MODEL_INTELLIGENCE_LAST_VERIFIED,
    metrics: [
      ...openRouterOperationalFacts({
        contextWindow: 1_050_000,
        inputPricePerMillion: 2.5,
        outputPricePerMillion: 15,
      }),
      ...artificialAnalysisFacts({
        slug: "gpt-5-4",
        label: "Artificial Analysis - GPT-5.4",
        intelligenceIndex: 57,
        outputTps: 78.9,
        ttftSeconds: 145.25,
        note: "Artificial Analysis benchmarks the xhigh reasoning variant on its model page.",
      }),
    ],
    lenses: [
      {
        lens: "overall_quality",
        rank: 1,
        rationale: "Highest raw intelligence score in this seeded shortlist, with frontier context and multimodal support.",
      },
      {
        lens: "research",
        rank: 2,
        rationale: "Strong long-context reasoning for synthesis-heavy work when premium latency is acceptable.",
      },
      {
        lens: "structured_output",
        rank: 3,
        rationale: "Reliable schema-heavy option when quality matters more than cost.",
      },
    ],
    derived: {
      taskFamilies: ["general", "research", "long_context", "multimodal"],
      strengths: ["Highest overall quality", "Huge context window", "Strong multimodal reasoning"],
      caveats: ["Very expensive", "High TTFT on the measured xhigh AA variant"],
      whenToUse: "Top-end general reasoning, synthesis, and high-stakes long-context work where cost is secondary.",
      profileBuilder: {
        contextBand: "ultra",
        costTier: "premium",
        quality: 3,
        speed: 2,
        cost: 0,
        reliability: 3,
      },
    },
  },
  {
    id: "openai/gpt-5.4-mini",
    name: "GPT-5.4 Mini",
    supportedGateways: ["openrouter", "vercel"],
    modality: "text,image,file->text",
    openSource: false,
    structuredOutput: true,
    toolUse: true,
    vision: true,
    contextWindow: 400_000,
    lastVerified: MODEL_INTELLIGENCE_LAST_VERIFIED,
    metrics: [
      ...openRouterOperationalFacts({
        contextWindow: 400_000,
        inputPricePerMillion: 0.75,
        outputPricePerMillion: 4.5,
      }),
      ...artificialAnalysisFacts({
        slug: "gpt-5-4-mini",
        label: "Artificial Analysis - GPT-5.4 mini",
        intelligenceIndex: 48,
        outputTps: 272.7,
        ttftSeconds: 5.11,
        note: "Artificial Analysis benchmarks the xhigh reasoning variant on its model page.",
      }),
    ],
    lenses: [
      {
        lens: "overall_quality",
        rank: 3,
        rationale: "High AA intelligence with much stronger speed and cost than the full GPT-5.4 frontier model.",
      },
      {
        lens: "structured_output",
        rank: 2,
        rationale: "Strong fit for strict tool- and schema-heavy work when you still want frontier-grade quality.",
      },
      {
        lens: "throughput",
        rank: 3,
        rationale: "One of the fastest high-capability reasoning models in the shortlist.",
      },
    ],
    derived: {
      taskFamilies: ["general", "coding", "agentic_coding", "multimodal"],
      strengths: ["Fast frontier model", "Reliable tools and JSON", "Good executor default"],
      caveats: ["Still meaningfully pricier than budget classifiers", "Measured TTFT is not low-latency despite high throughput"],
      whenToUse: "Balanced high-capability default for coding, tool use, and structured outputs at scale.",
      profileBuilder: {
        contextBand: "long",
        costTier: "mid",
        quality: 3,
        speed: 3,
        cost: 2,
        reliability: 3,
      },
    },
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 Mini",
    supportedGateways: ["openrouter", "vercel"],
    modality: "text,image,file->text",
    openSource: false,
    structuredOutput: true,
    toolUse: true,
    vision: true,
    contextWindow: 400_000,
    lastVerified: MODEL_INTELLIGENCE_LAST_VERIFIED,
    metrics: [
      ...openRouterOperationalFacts({
        contextWindow: 400_000,
        inputPricePerMillion: 0.25,
        outputPricePerMillion: 2,
      }),
      ...artificialAnalysisFacts({
        slug: "gpt-5-mini",
        label: "Artificial Analysis - GPT-5 mini",
        intelligenceIndex: 41,
        outputTps: 72.3,
        ttftSeconds: 73.35,
        note: "Artificial Analysis benchmarks the high reasoning variant on its model page.",
      }),
    ],
    lenses: [
      {
        lens: "structured_output",
        rank: 1,
        rationale: "Best value structured-output option in the seed set when exact JSON and tool calls matter.",
      },
      {
        lens: "classifier_candidate",
        rank: 2,
        rationale: "Good fit when you want reliable structured classification and can pay slightly more for OpenAI-style schema handling.",
      },
    ],
    derived: {
      taskFamilies: ["general", "coding", "support", "multimodal"],
      strengths: ["Cheap structured output", "Strong tool support", "Good classifier fallback"],
      caveats: ["Measured high-reasoning TTFT is very slow", "Not the cheapest classifier option"],
      whenToUse: "Budget-conscious structured outputs, lightweight coding, and schema-heavy classification.",
      profileBuilder: {
        contextBand: "long",
        costTier: "efficient",
        quality: 2,
        speed: 2,
        cost: 3,
        reliability: 3,
      },
    },
  },
  {
    id: "openai/gpt-5-codex",
    name: "GPT-5 Codex",
    supportedGateways: ["openrouter", "vercel"],
    modality: "text,file->text",
    openSource: false,
    structuredOutput: true,
    toolUse: true,
    vision: false,
    contextWindow: 400_000,
    lastVerified: MODEL_INTELLIGENCE_LAST_VERIFIED,
    metrics: [
      ...openRouterOperationalFacts({
        contextWindow: 400_000,
        inputPricePerMillion: 1.25,
        outputPricePerMillion: 10,
      }),
      ...artificialAnalysisFacts({
        slug: "gpt-5-codex",
        label: "Artificial Analysis - GPT-5 Codex",
        intelligenceIndex: 45,
        outputTps: 211.4,
        ttftSeconds: 7.33,
        note: "Artificial Analysis benchmarks the high reasoning variant on its model page.",
      }),
    ],
    lenses: [
      {
        lens: "coding_quality",
        rank: 1,
        rationale: "Purpose-built coding model with strong measured intelligence and high coding-loop throughput.",
      },
      {
        lens: "structured_output",
        rank: 4,
        rationale: "Strong schema and tool fit for code-first agents.",
      },
    ],
    derived: {
      taskFamilies: ["coding", "agentic_coding"],
      strengths: ["Code-first executor", "Fast for agentic coding", "Large file context"],
      caveats: ["More expensive than value coding choices", "Measured TTFT is not reflex-fast"],
      whenToUse: "Harder implementation work, precise code editing, and tool-driven coding loops.",
      profileBuilder: {
        contextBand: "long",
        costTier: "mid",
        quality: 3,
        speed: 3,
        cost: 1,
        reliability: 3,
      },
    },
  },
  {
    id: "anthropic/claude-opus-4.6",
    name: "Claude Opus 4.6",
    supportedGateways: ["openrouter", "vercel"],
    modality: "text,image->text",
    openSource: false,
    structuredOutput: true,
    toolUse: true,
    vision: true,
    contextWindow: 1_000_000,
    lastVerified: MODEL_INTELLIGENCE_LAST_VERIFIED,
    metrics: [
      ...openRouterOperationalFacts({
        contextWindow: 1_000_000,
        inputPricePerMillion: 5,
        outputPricePerMillion: 25,
      }),
      ...artificialAnalysisFacts({
        slug: "claude-opus-4-6",
        label: "Artificial Analysis - Claude Opus 4.6",
        intelligenceIndex: 46,
        outputTps: 52.2,
        ttftSeconds: 2.48,
        note: "Artificial Analysis benchmarks the non-reasoning, high-effort page variant.",
      }),
    ],
    lenses: [
      {
        lens: "overall_quality",
        rank: 2,
        rationale: "Premium frontier model with strong reasoning and sustained professional-work positioning.",
      },
      {
        lens: "coding_quality",
        rank: 3,
        rationale: "Capability-first coding choice when cost is secondary to judgment and persistence.",
      },
    ],
    derived: {
      taskFamilies: ["general", "coding", "agentic_coding", "research", "multimodal"],
      strengths: ["Premium reasoning", "Large-context professional work", "Strong multimodal judgment"],
      caveats: ["Most expensive mainstream option", "Low throughput relative to cheaper coding models"],
      whenToUse: "Highest-stakes reasoning, architecture, and long-form professional work where cost can be ignored.",
      profileBuilder: {
        contextBand: "ultra",
        costTier: "premium",
        quality: 3,
        speed: 1,
        cost: 0,
        reliability: 3,
      },
    },
  },
  {
    id: "anthropic/claude-sonnet-4.6",
    name: "Claude Sonnet 4.6",
    supportedGateways: ["openrouter", "vercel"],
    modality: "text,image->text",
    openSource: false,
    structuredOutput: true,
    toolUse: true,
    vision: true,
    contextWindow: 1_000_000,
    lastVerified: MODEL_INTELLIGENCE_LAST_VERIFIED,
    metrics: [
      ...openRouterOperationalFacts({
        contextWindow: 1_000_000,
        inputPricePerMillion: 3,
        outputPricePerMillion: 15,
      }),
      ...artificialAnalysisFacts({
        slug: "claude-sonnet-4-6",
        label: "Artificial Analysis - Claude Sonnet 4.6",
        intelligenceIndex: 44,
        outputTps: 53.2,
        ttftSeconds: 1.67,
        note: "Artificial Analysis benchmarks the non-reasoning, high-effort page variant.",
      }),
    ],
    lenses: [
      {
        lens: "coding_quality",
        rank: 2,
        rationale: "High-confidence coding and review choice with better cost-quality balance than Opus.",
      },
      {
        lens: "multimodal",
        rank: 4,
        rationale: "Strong visual and document work with dependable instruction following.",
      },
    ],
    derived: {
      taskFamilies: ["general", "coding", "agentic_coding", "support", "multimodal"],
      strengths: ["Strong coding judgment", "Solid review quality", "Reliable all-purpose premium-mid option"],
      caveats: ["Still costly for large-scale classifier work", "Not a speed-first model"],
      whenToUse: "Capability-first default for nuanced coding, review, design-heavy tasks, and multimodal support work.",
      profileBuilder: {
        contextBand: "ultra",
        costTier: "mid",
        quality: 3,
        speed: 2,
        cost: 1,
        reliability: 3,
      },
    },
  },
  {
    id: "anthropic/claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    supportedGateways: ["openrouter", "vercel"],
    modality: "text,image->text",
    openSource: false,
    structuredOutput: true,
    toolUse: true,
    vision: true,
    contextWindow: 200_000,
    lastVerified: MODEL_INTELLIGENCE_LAST_VERIFIED,
    metrics: [
      ...openRouterOperationalFacts({
        contextWindow: 200_000,
        inputPricePerMillion: 1,
        outputPricePerMillion: 5,
      }),
      ...artificialAnalysisFacts({
        slug: "claude-4-5-haiku",
        label: "Artificial Analysis - Claude Haiku 4.5",
        intelligenceIndex: 31,
        outputTps: 104,
        ttftSeconds: 0.68,
        note: "Artificial Analysis benchmarks the Claude 4.5 Haiku page variant.",
      }),
    ],
    lenses: [
      {
        lens: "classifier_candidate",
        rank: 3,
        rationale: "Fast, reliable Claude-family option when you want better responsiveness without dropping into budget-tier models.",
      },
      {
        lens: "ttft",
        rank: 4,
        rationale: "Very low measured TTFT for a high-reliability multimodal model.",
      },
    ],
    derived: {
      taskFamilies: ["general", "support", "coding", "multimodal"],
      strengths: ["Fast Claude option", "Low TTFT", "Good instruction following"],
      caveats: ["More expensive than Gemini Flash Lite", "Not the cheapest classifier path"],
      whenToUse: "Fast general-purpose reasoning when you want Claude-family behavior at lower latency and cost.",
      profileBuilder: {
        contextBand: "long",
        costTier: "efficient",
        quality: 2,
        speed: 3,
        cost: 2,
        reliability: 3,
      },
    },
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    supportedGateways: ["openrouter", "vercel"],
    modality: "text,image,file,audio,video->text",
    openSource: false,
    structuredOutput: true,
    toolUse: true,
    vision: true,
    contextWindow: 1_048_576,
    lastVerified: MODEL_INTELLIGENCE_LAST_VERIFIED,
    metrics: [
      ...openRouterOperationalFacts({
        contextWindow: 1_048_576,
        inputPricePerMillion: 1.25,
        outputPricePerMillion: 10,
      }),
      ...artificialAnalysisFacts({
        slug: "gemini-2-5-pro",
        label: "Artificial Analysis - Gemini 2.5 Pro",
        intelligenceIndex: 35,
        outputTps: 131.3,
        ttftSeconds: 28.38,
        note: "Artificial Analysis benchmarks the Gemini 2.5 Pro page variant.",
      }),
      benchmarkClaimFact({
        metricId: "openrouter_lm_arena_placement",
        label: "Reported LM Arena placement",
        value: "first_place",
        unit: "placement",
        source: openRouterSource(),
        note: "OpenRouter model description states first-place positioning on LM Arena; the dataset keeps this as a categorical benchmark claim, not a numeric arena score.",
      }),
    ],
    lenses: [
      {
        lens: "research",
        rank: 1,
        rationale: "Best research-oriented long-context choice in the seed set, combining 1M context with strong multimodal inputs.",
      },
      {
        lens: "long_context",
        rank: 3,
        rationale: "High-quality 1M-context option when you want research strength over raw maximum window size.",
      },
      {
        lens: "multimodal",
        rank: 2,
        rationale: "Deep multimodal input coverage across file, audio, image, and video workflows.",
      },
    ],
    derived: {
      taskFamilies: ["research", "long_context", "general", "multimodal"],
      strengths: ["1M context", "Strong multimodal inputs", "Research-heavy default"],
      caveats: ["Measured TTFT is high", "Not a budget choice"],
      whenToUse: "Deep long-context analysis, research synthesis, and giant mixed-modality input workloads.",
      profileBuilder: {
        contextBand: "ultra",
        costTier: "mid",
        quality: 3,
        speed: 2,
        cost: 1,
        reliability: 2,
      },
    },
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    supportedGateways: ["openrouter", "vercel"],
    modality: "text,image,file,audio,video->text",
    openSource: false,
    structuredOutput: true,
    toolUse: true,
    vision: true,
    contextWindow: 1_048_576,
    lastVerified: MODEL_INTELLIGENCE_LAST_VERIFIED,
    metrics: [
      ...openRouterOperationalFacts({
        contextWindow: 1_048_576,
        inputPricePerMillion: 0.3,
        outputPricePerMillion: 2.5,
      }),
      ...artificialAnalysisFacts({
        slug: "gemini-2-5-flash",
        label: "Artificial Analysis - Gemini 2.5 Flash",
        intelligenceIndex: 21,
        outputTps: 231,
        ttftSeconds: 0.55,
        note: "Artificial Analysis benchmarks the non-reasoning page variant.",
      }),
    ],
    lenses: [
      {
        lens: "multimodal",
        rank: 1,
        rationale: "Best balance of multimodal breadth, 1M context, speed, and price in the current shortlist.",
      },
      {
        lens: "ttft",
        rank: 2,
        rationale: "Near-best TTFT with far broader modality support than most reflex models.",
      },
    ],
    derived: {
      taskFamilies: ["general", "research", "long_context", "multimodal", "support"],
      strengths: ["Fast multimodal workhorse", "Very low TTFT", "1M context"],
      caveats: ["Lower raw intelligence than premium frontier models", "Not the cheapest text-only option"],
      whenToUse: "Fast multimodal and long-context work when you want a strong balance of responsiveness and capability.",
      profileBuilder: {
        contextBand: "ultra",
        costTier: "efficient",
        quality: 2,
        speed: 3,
        cost: 2,
        reliability: 2,
      },
    },
  },
  {
    id: "google/gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    supportedGateways: ["openrouter", "vercel"],
    modality: "text,image,file,audio,video->text",
    openSource: false,
    structuredOutput: true,
    toolUse: true,
    vision: true,
    contextWindow: 1_048_576,
    lastVerified: MODEL_INTELLIGENCE_LAST_VERIFIED,
    metrics: [
      ...openRouterOperationalFacts({
        contextWindow: 1_048_576,
        inputPricePerMillion: 0.1,
        outputPricePerMillion: 0.4,
      }),
      ...artificialAnalysisFacts({
        slug: "gemini-2-5-flash-lite",
        label: "Artificial Analysis - Gemini 2.5 Flash-Lite",
        intelligenceIndex: 13,
        outputTps: 273,
        ttftSeconds: 0.52,
        note: "Artificial Analysis benchmarks the non-reasoning page variant.",
      }),
    ],
    lenses: [
      {
        lens: "classifier_candidate",
        rank: 1,
        rationale: "Cheapest high-speed multimodal classifier/extractor candidate with very low TTFT and 1M context.",
      },
      {
        lens: "ttft",
        rank: 1,
        rationale: "Lowest measured TTFT in the seed set.",
      },
      {
        lens: "throughput",
        rank: 2,
        rationale: "Second-fastest measured output speed after Mercury 2.",
      },
    ],
    derived: {
      taskFamilies: ["general", "support", "multimodal", "long_context"],
      strengths: ["Fastest TTFT", "Very cheap", "1M context and multimodal support"],
      caveats: ["Lower raw intelligence than stronger frontier models", "Use carefully for high-stakes nuanced reasoning"],
      whenToUse: "Budget-first classifier, extraction, and lightweight multimodal routing work where latency dominates.",
      profileBuilder: {
        contextBand: "ultra",
        costTier: "budget",
        quality: 1,
        speed: 3,
        cost: 3,
        reliability: 2,
      },
    },
  },
  {
    id: "deepseek/deepseek-v3.2",
    name: "DeepSeek V3.2",
    supportedGateways: ["openrouter", "vercel"],
    modality: "text->text",
    openSource: true,
    structuredOutput: true,
    toolUse: true,
    vision: false,
    contextWindow: 163_840,
    lastVerified: MODEL_INTELLIGENCE_LAST_VERIFIED,
    metrics: [
      ...openRouterOperationalFacts({
        contextWindow: 163_840,
        inputPricePerMillion: 0.26,
        outputPricePerMillion: 0.38,
      }),
      ...artificialAnalysisFacts({
        slug: "deepseek-v3-2",
        label: "Artificial Analysis - DeepSeek V3.2",
        intelligenceIndex: 32,
        outputTps: 33,
        ttftSeconds: 1.83,
        note: "Artificial Analysis benchmarks the non-reasoning page variant.",
      }),
    ],
    lenses: [
      {
        lens: "budget_text",
        rank: 1,
        rationale: "Best ultra-cheap text model in the shortlist while still carrying meaningful AA intelligence.",
      },
      {
        lens: "open_source",
        rank: 3,
        rationale: "Open-weight budget option for teams that want deployable open models over premium proprietary ones.",
      },
    ],
    derived: {
      taskFamilies: ["general", "coding", "support"],
      strengths: ["Very cheap text volume", "Open weights", "Respectable AA intelligence for the price"],
      caveats: ["Low throughput versus other fast models", "No native vision in this deployable ID"],
      whenToUse: "Budget-first text work, background tasks, and large-volume routing pools where output cost matters most.",
      profileBuilder: {
        contextBand: "standard",
        costTier: "budget",
        quality: 2,
        speed: 1,
        cost: 3,
        reliability: 2,
      },
    },
  },
  {
    id: "x-ai/grok-4.1-fast",
    name: "Grok 4.1 Fast",
    supportedGateways: ["openrouter"],
    modality: "text,image->text",
    openSource: false,
    structuredOutput: false,
    toolUse: true,
    vision: true,
    contextWindow: 2_000_000,
    lastVerified: MODEL_INTELLIGENCE_LAST_VERIFIED,
    metrics: [
      ...openRouterOperationalFacts({
        contextWindow: 2_000_000,
        inputPricePerMillion: 0.2,
        outputPricePerMillion: 0.5,
      }),
      ...artificialAnalysisFacts({
        slug: "grok-4-1-fast",
        label: "Artificial Analysis - Grok 4.1 Fast",
        intelligenceIndex: 24,
        outputTps: 155.3,
        ttftSeconds: 0.56,
        note: "Artificial Analysis benchmarks the non-reasoning page variant.",
      }),
    ],
    lenses: [
      {
        lens: "long_context",
        rank: 1,
        rationale: "Largest context window in the shortlist with excellent TTFT and strong practical throughput.",
      },
      {
        lens: "ttft",
        rank: 3,
        rationale: "Near-best TTFT with an unusually large 2M context window.",
      },
    ],
    derived: {
      taskFamilies: ["general", "support", "long_context", "multimodal"],
      strengths: ["2M context window", "Very low TTFT", "Good cost-speed ratio"],
      caveats: ["Structured-output reliability is not the primary reason to pick it", "OpenRouter-only exact ID"],
      whenToUse: "Very long-context and tool-heavy operational work when you want a fast model with huge window size.",
      profileBuilder: {
        contextBand: "ultra",
        costTier: "budget",
        quality: 2,
        speed: 3,
        cost: 3,
        reliability: 1,
      },
    },
  },
  {
    id: "xai/grok-4.1-fast-non-reasoning",
    name: "Grok 4.1 Fast Non-Reasoning",
    supportedGateways: ["vercel"],
    modality: "text->text",
    openSource: false,
    structuredOutput: false,
    toolUse: true,
    vision: false,
    contextWindow: 2_000_000,
    lastVerified: MODEL_INTELLIGENCE_LAST_VERIFIED,
    metrics: [
      ...vercelOperationalFacts({
        contextWindow: 2_000_000,
        inputPricePerMillion: 0.2,
        outputPricePerMillion: 0.5,
      }),
      ...artificialAnalysisFacts({
        slug: "grok-4-1-fast",
        label: "Artificial Analysis - Grok 4.1 Fast",
        intelligenceIndex: 24,
        outputTps: 155.3,
        ttftSeconds: 0.56,
        note: "Artificial Analysis covers the Grok 4.1 Fast non-reasoning variant; this maps directly to Vercel's text-only deployable ID.",
      }),
    ],
    lenses: [
      {
        lens: "long_context",
        rank: 2,
        rationale: "Best exact Vercel-only long-context speed option for text-heavy routing pools.",
      },
    ],
    derived: {
      taskFamilies: ["general", "support", "long_context"],
      strengths: ["2M text context", "Fast reflex model on Vercel", "Low-cost operational lookups"],
      caveats: ["Text-only variant", "Not a structured-output specialist"],
      whenToUse: "Vercel-only long-context text workflows where speed and context matter more than multimodal or schema-heavy behavior.",
      profileBuilder: {
        contextBand: "ultra",
        costTier: "budget",
        quality: 1,
        speed: 3,
        cost: 3,
        reliability: 1,
      },
    },
  },
  {
    id: "xai/grok-code-fast-1",
    name: "Grok Code Fast 1",
    supportedGateways: ["vercel"],
    modality: "text->text",
    openSource: false,
    structuredOutput: false,
    toolUse: true,
    vision: false,
    contextWindow: 256_000,
    lastVerified: MODEL_INTELLIGENCE_LAST_VERIFIED,
    metrics: [
      ...vercelOperationalFacts({
        contextWindow: 256_000,
        inputPricePerMillion: 0.2,
        outputPricePerMillion: 1.5,
      }),
      ...artificialAnalysisFacts({
        slug: "grok-code-fast-1",
        label: "Artificial Analysis - Grok Code Fast 1",
        intelligenceIndex: 29,
        outputTps: 201.1,
        ttftSeconds: 3.44,
        note: "Artificial Analysis benchmarks the Grok Code Fast 1 page variant.",
      }),
    ],
    lenses: [
      {
        lens: "coding_value",
        rank: 3,
        rationale: "Fast budget-conscious coding option on Vercel with strong measured throughput.",
      },
    ],
    derived: {
      taskFamilies: ["coding", "agentic_coding"],
      strengths: ["Fast coding loop", "Cheap Vercel coding option", "Strong measured throughput"],
      caveats: ["TTFT is not best-in-class", "Structured output is not the main selling point"],
      whenToUse: "Fast, lower-cost coding on Vercel when exact frontier coding quality is not required.",
      profileBuilder: {
        contextBand: "long",
        costTier: "budget",
        quality: 2,
        speed: 3,
        cost: 3,
        reliability: 2,
      },
    },
  },
  {
    id: "minimax/minimax-m2.7",
    name: "MiniMax M2.7",
    supportedGateways: ["openrouter"],
    modality: "text->text",
    openSource: false,
    structuredOutput: true,
    toolUse: true,
    vision: false,
    contextWindow: 204_800,
    lastVerified: MODEL_INTELLIGENCE_LAST_VERIFIED,
    metrics: [
      ...openRouterOperationalFacts({
        contextWindow: 204_800,
        inputPricePerMillion: 0.3,
        outputPricePerMillion: 1.2,
      }),
      ...artificialAnalysisFacts({
        slug: "minimax-m2-7",
        label: "Artificial Analysis - MiniMax-M2.7",
        intelligenceIndex: 50,
        outputTps: 49.7,
        ttftSeconds: 3.05,
        note: "Artificial Analysis benchmarks the MiniMax-M2.7 page variant.",
      }),
      benchmarkClaimFact({
        metricId: "openrouter_swe_pro_pct",
        label: "Reported SWE-Pro",
        value: 56.2,
        unit: "percent",
        source: openRouterSource(),
        note: "OpenRouter model description cites 56.2% on SWE-Pro.",
      }),
      benchmarkClaimFact({
        metricId: "openrouter_terminal_bench_2_pct",
        label: "Reported Terminal Bench 2",
        value: 57,
        unit: "percent",
        source: openRouterSource(),
        note: "OpenRouter model description cites 57.0% on Terminal Bench 2.",
      }),
      benchmarkClaimFact({
        metricId: "openrouter_gdpval_aa_elo",
        label: "Reported GDPval-AA Elo",
        value: 1495,
        unit: "elo",
        source: openRouterSource(),
        note: "OpenRouter model description cites a 1495 Elo on GDPval-AA.",
      }),
    ],
    lenses: [
      {
        lens: "coding_value",
        rank: 1,
        rationale: "Best price-to-performance coding choice in the current shortlist, with strong cited agentic coding benchmarks.",
      },
      {
        lens: "overall_quality",
        rank: 4,
        rationale: "Very high measured intelligence for its price tier even before accounting for value.",
      },
    ],
    derived: {
      taskFamilies: ["coding", "agentic_coding", "general"],
      strengths: ["Excellent coding value", "Strong cited agentic benchmarks", "High AA intelligence for the price"],
      caveats: ["Not a latency-first choice", "OpenRouter-only exact ID"],
      whenToUse: "Primary coding value pick when you want frontier-adjacent agentic coding without paying premium output prices.",
      profileBuilder: {
        contextBand: "long",
        costTier: "efficient",
        quality: 3,
        speed: 2,
        cost: 2,
        reliability: 2,
      },
    },
  },
  {
    id: "moonshotai/kimi-k2.5",
    name: "Kimi K2.5",
    supportedGateways: ["openrouter"],
    modality: "text,image->text",
    openSource: true,
    structuredOutput: true,
    toolUse: true,
    vision: true,
    contextWindow: 262_144,
    lastVerified: MODEL_INTELLIGENCE_LAST_VERIFIED,
    metrics: [
      ...openRouterOperationalFacts({
        contextWindow: 262_144,
        inputPricePerMillion: 0.45,
        outputPricePerMillion: 2.2,
      }),
      ...artificialAnalysisFacts({
        slug: "kimi-k2-5",
        label: "Artificial Analysis - Kimi K2.5",
        intelligenceIndex: 47,
        outputTps: 47.1,
        ttftSeconds: 2.81,
        note: "Artificial Analysis benchmarks the reasoning page variant.",
      }),
    ],
    lenses: [
      {
        lens: "open_source",
        rank: 2,
        rationale: "High-intelligence open-weight option with multimodal and tool-use coverage.",
      },
      {
        lens: "multimodal",
        rank: 3,
        rationale: "Useful open-weight multimodal alternative when you want tool use plus vision in one pool.",
      },
    ],
    derived: {
      taskFamilies: ["general", "research", "multimodal", "agentic_coding"],
      strengths: ["Open weights", "Strong AA intelligence", "Vision plus tool use"],
      caveats: ["Not fast", "More expensive than DeepSeek for plain text volume"],
      whenToUse: "Open-weight multimodal and agentic workflows where you want stronger quality than budget open models.",
      profileBuilder: {
        contextBand: "long",
        costTier: "efficient",
        quality: 3,
        speed: 1,
        cost: 2,
        reliability: 2,
      },
    },
  },
  {
    id: "inception/mercury-2",
    name: "Mercury 2",
    supportedGateways: ["openrouter"],
    modality: "text->text",
    openSource: false,
    structuredOutput: true,
    toolUse: true,
    vision: false,
    contextWindow: 128_000,
    lastVerified: MODEL_INTELLIGENCE_LAST_VERIFIED,
    metrics: [
      ...openRouterOperationalFacts({
        contextWindow: 128_000,
        inputPricePerMillion: 0.25,
        outputPricePerMillion: 0.75,
      }),
      ...artificialAnalysisFacts({
        slug: "mercury-2",
        label: "Artificial Analysis - Mercury 2",
        intelligenceIndex: 33,
        outputTps: 1021.5,
        ttftSeconds: 4.36,
        note: "Artificial Analysis benchmarks the Mercury 2 page variant.",
      }),
    ],
    lenses: [
      {
        lens: "throughput",
        rank: 1,
        rationale: "Clear throughput winner in the shortlist with measured 1,021.5 tokens/sec.",
      },
      {
        lens: "budget_text",
        rank: 2,
        rationale: "Great value for fast operational text workloads when raw throughput matters more than top-end reasoning depth.",
      },
    ],
    derived: {
      taskFamilies: ["general", "coding", "support"],
      strengths: ["Best throughput", "Cheap text generation", "Structured output and tools"],
      caveats: ["High TTFT despite huge throughput", "No vision support"],
      whenToUse: "Fastest text generation for agent loops, coding churn, and high-throughput operational workloads.",
      profileBuilder: {
        contextBand: "standard",
        costTier: "budget",
        quality: 2,
        speed: 3,
        cost: 3,
        reliability: 2,
      },
    },
  },
  {
    id: "openai/gpt-5-image",
    name: "GPT-5 Image",
    supportedGateways: ["openrouter"],
    modality: "text,image,file->text,image",
    openSource: false,
    structuredOutput: false,
    toolUse: false,
    vision: true,
    contextWindow: 400_000,
    lastVerified: MODEL_INTELLIGENCE_LAST_VERIFIED,
    metrics: [
      ...openRouterOperationalFacts({
        contextWindow: 400_000,
        inputPricePerMillion: 10,
        outputPricePerMillion: 10,
      }),
    ],
    lenses: [
      {
        lens: "image_generation",
        rank: 1,
        rationale: "Best current hard-coded image-generation pick for high-quality image work in the shortlist.",
      },
    ],
    derived: {
      taskFamilies: ["multimodal", "general"],
      strengths: ["Image generation", "OpenAI multimodal stack", "High-quality creative output"],
      caveats: ["Expensive", "Not a text-first routing default"],
      whenToUse: "Premium image generation and detailed image-editing workflows when image quality is the primary goal.",
      profileBuilder: {
        contextBand: "long",
        costTier: "premium",
        quality: 3,
        speed: 1,
        cost: 0,
        reliability: 2,
      },
    },
  },
  {
    id: "qwen/qwen3-coder",
    name: "Qwen3 Coder 480B A35B",
    supportedGateways: ["openrouter"],
    modality: "text->text",
    openSource: true,
    structuredOutput: true,
    toolUse: true,
    vision: false,
    contextWindow: 262_144,
    lastVerified: MODEL_INTELLIGENCE_LAST_VERIFIED,
    metrics: [
      ...openRouterOperationalFacts({
        contextWindow: 262_144,
        inputPricePerMillion: 0.22,
        outputPricePerMillion: 1,
      }),
    ],
    lenses: [
      {
        lens: "open_source",
        rank: 1,
        rationale: "Best open-source coding-specialist entry in the initial shortlist, with low API cost and long code context.",
      },
      {
        lens: "coding_value",
        rank: 2,
        rationale: "Very compelling open-source coding value when you want a cheaper alternative to proprietary coding models.",
      },
    ],
    derived: {
      taskFamilies: ["coding", "agentic_coding"],
      strengths: ["Open-source coding specialist", "Cheap long-context code model", "Tool-call capable"],
      caveats: ["No AA page captured yet in v1", "OpenRouter pricing increases above 128K input tokens"],
      whenToUse: "Open-source-first coding and repository work when you want a cheaper code specialist without going fully budget-tier.",
      profileBuilder: {
        contextBand: "long",
        costTier: "efficient",
        quality: 2,
        speed: 2,
        cost: 2,
        reliability: 2,
      },
    },
  },
] as const;

const MODEL_INTELLIGENCE_BY_ID = new Map(
  MODEL_INTELLIGENCE.map((entry) => [entry.id, entry] as const),
);

function dedupeSources(sources: readonly ProfileBuilderSource[]): ProfileBuilderSource[] {
  const seen = new Set<string>();
  return sources.filter((item) => {
    const key = `${item.label}::${item.url}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function findLens(model: ModelIntelligenceModel, lens: ModelIntelligenceLensId): ModelIntelligenceLens | undefined {
  return model.lenses.find((entry) => entry.lens === lens);
}

export function getModelIntelligence(modelId: string): ModelIntelligenceModel | undefined {
  return MODEL_INTELLIGENCE_BY_ID.get(modelId);
}

export function getModelIntelligenceMetric(
  modelId: string,
  metricId: string,
): ModelIntelligenceMetricFact | undefined {
  return MODEL_INTELLIGENCE_BY_ID.get(modelId)?.metrics.find((metric) => metric.metricId === metricId);
}

export function listModelIntelligenceSources(model: ModelIntelligenceModel): ProfileBuilderSource[] {
  return dedupeSources(model.metrics.map((metric) => metric.source));
}

export function listModelIntelligenceForLens(args: {
  lens: ModelIntelligenceLensId;
  gatewayPresetId?: ModelIntelligenceGatewayPresetId;
}): ModelIntelligenceModel[] {
  return MODEL_INTELLIGENCE
    .filter((entry) => findLens(entry, args.lens))
    .filter((entry) => args.gatewayPresetId ? entry.supportedGateways.includes(args.gatewayPresetId) : true)
    .sort((left, right) => {
      const leftLens = findLens(left, args.lens);
      const rightLens = findLens(right, args.lens);
      if (!leftLens || !rightLens) {
        return left.id.localeCompare(right.id);
      }
      return leftLens.rank - rightLens.rank || left.id.localeCompare(right.id);
    });
}

export function getTopModelIntelligenceForLens(args: {
  lens: ModelIntelligenceLensId;
  gatewayPresetId?: ModelIntelligenceGatewayPresetId;
}): ModelIntelligenceModel | undefined {
  return listModelIntelligenceForLens(args)[0];
}
