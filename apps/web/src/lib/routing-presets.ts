// ─────────────────────────────────────────────────────────────────────────────
// routing-presets.ts
//
// Hard-coded routing presets that auto-populate a gateway's model list and
// the global routing configuration (classifier, fallback, instructions) in
// one click. Each preset is a self-contained setup for a specific use case.
//
// To add a new preset, append an entry to the ROUTING_PRESETS array below.
// Model IDs use provider/model-name identifiers compatible with the target gateway.
// ─────────────────────────────────────────────────────────────────────────────

import type { GatewayModel } from "@/src/features/gateways/contracts";
import { GATEWAY_PRESETS } from "./gateway-presets";

export interface RoutingPreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** ID from GATEWAY_PRESETS — only show this preset on matching gateways. */
  readonly gatewayPresetId: string;
  readonly models: readonly GatewayModel[];
  readonly classifierModel: string;
  readonly defaultModel: string;
  readonly routingInstructions: string;
}

/**
 * Derives the GATEWAY_PRESETS id (e.g. "openrouter") from a gateway's baseUrl.
 * Returns undefined for custom / unrecognized providers.
 */
export function getGatewayPresetId(baseUrl: string): string | undefined {
  const normalized = baseUrl.replace(/\/$/, "").toLowerCase();
  return GATEWAY_PRESETS.find(
    (p) => normalized.startsWith(p.baseUrl.replace(/\/$/, "").toLowerCase())
  )?.id;
}

// ── Presets ───────────────────────────────────────────────────────────────────

export const ROUTING_PRESETS: readonly RoutingPreset[] = [
  // ── 1. Balanced General-Purpose ─────────────────────────────────────────────
  {
    id: "general-balanced",
    name: "Balanced General-Purpose",
    description: "Practical daily driver: Claude for quality, Mercury 2 for speed, Gemini for long docs, Seed for images",
    gatewayPresetId: "openrouter",
    classifierModel: "google/gemini-3.1-flash-lite-preview",
    defaultModel: "anthropic/claude-sonnet-4.6",
    models: [
      {
        id: "anthropic/claude-sonnet-4.6",
        name: "Claude Sonnet 4.6",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Complex reasoning, creative writing, nuanced Q&A, professional emails, summarization. $3/$15 per M tokens.",
      },
      {
        id: "inception/mercury-2",
        name: "Mercury 2",
        modality: "text->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Short conversational replies, quick factual lookups, casual chat. 1000+ T/s. $0.25/$0.75 per M tokens.",
      },
      {
        id: "google/gemini-3.1-pro-preview",
        name: "Gemini 3.1 Pro",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Long document analysis, large pastes (>50K tokens), research synthesis, 1M context window. $2/$12 per M tokens.",
      },
      {
        id: "bytedance-seed/seed-1.6-flash",
        name: "Seed 1.6 Flash",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Image inputs, screenshots, visual content analysis. Multimodal, ultra-cheap. $0.075/$0.30 per M tokens.",
      },
      {
        id: "deepseek/deepseek-v3.2",
        name: "DeepSeek V3.2",
        modality: "text->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Budget-first mode when cost is the primary concern. Strong output quality. $0.26/$0.38 per M tokens.",
      },
    ],
    routingInstructions: `
Route every request to the single best model. Pricing is shown per million tokens (input/output).

MODEL REFERENCE
  anthropic/claude-sonnet-4.6    — $3/$15    — vision, 1M ctx
  inception/mercury-2            — $0.25/$0.75 — text only, 128K ctx, 1000+ T/s
  google/gemini-3.1-pro-preview  — $2/$12    — vision, 1M ctx
  bytedance-seed/seed-1.6-flash  — $0.075/$0.30 — vision, 256K ctx
  deepseek/deepseek-v3.2         — $0.26/$0.38 — text only, 163K ctx

ROUTING RULES (apply in order)

IMAGE INPUT (message contains an image or screenshot)
  → bytedance-seed/seed-1.6-flash  [cheapest vision; escalate to claude-sonnet-4.6 only if high-quality output explicitly needed]

WEB SEARCH / CURRENT INFO (user asks about "latest", "current", "today", "news", "recent", or requests a web lookup)
  → anthropic/claude-sonnet-4.6:online

LONG DOCUMENTS / ANALYSIS (large paste, PDF, "summarize this", context >50K tokens)
  → google/gemini-3.1-pro-preview

COMPLEX REASONING / CREATIVE / NUANCED Q&A
  → anthropic/claude-sonnet-4.6

QUICK CHAT / SHORT FACTUAL LOOKUPS / CONVERSATIONAL REPLIES
  → inception/mercury-2

BUDGET MODE (user says "cheap", "quick", or cost is the explicit priority)
  → deepseek/deepseek-v3.2

Default to Claude Sonnet 4.6 when the task is unclear.
`.trim(),
  },

  // ── 2. Speed-First / Low Latency ────────────────────────────────────────────
  {
    id: "speed-first",
    name: "Speed-First",
    description: "Minimum latency at all costs: Mercury 2 default (1000+ T/s), Seed for images, Grok for web search and tool calls",
    gatewayPresetId: "openrouter",
    classifierModel: "google/gemini-3.1-flash-lite-preview",
    defaultModel: "inception/mercury-2",
    models: [
      {
        id: "inception/mercury-2",
        name: "Mercury 2",
        modality: "text->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Default for everything. 1000+ T/s reasoning diffusion model, native tool use, 128K ctx. $0.25/$0.75 per M tokens.",
      },
      {
        id: "bytedance-seed/seed-1.6-flash",
        name: "Seed 1.6 Flash",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Image inputs, screenshots, visual content. Also the cheapest fast path for ultra-high-volume text. 256K ctx. $0.075/$0.30 per M tokens.",
      },
      {
        id: "x-ai/grok-4.1-fast",
        name: "Grok 4.1 Fast",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Tool calls / function calling, web search, long context (>128K tokens), 2M ctx window. 115.6 T/s. $0.20/$0.50 per M tokens.",
      },
      {
        id: "google/gemini-3.1-flash-lite-preview:nitro",
        name: "Gemini 3.1 Flash Lite (Nitro)",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Context >128K tokens when tool use is not needed. 1M ctx, throughput-optimized via :nitro. $0.25/$1.50 per M tokens.",
      },
      {
        id: "meta-llama/llama-3.3-70b-instruct:nitro",
        name: "Llama 3.3 70B (Nitro)",
        modality: "text->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Open-source preference, cost-optimized workloads. Routed to Groq via :nitro for fastest inference. $0.10/$0.32 per M tokens.",
      },
    ],
    routingInstructions: `
Route every request to the fastest appropriate model. Pricing shown per million tokens (input/output).

MODEL REFERENCE
  inception/mercury-2                         — $0.25/$0.75  — text only, 128K ctx, 1000+ T/s
  bytedance-seed/seed-1.6-flash               — $0.075/$0.30 — vision, 256K ctx
  x-ai/grok-4.1-fast                          — $0.20/$0.50  — vision, 2M ctx, native web search
  google/gemini-3.1-flash-lite-preview:nitro  — $0.25/$1.50  — vision, 1M ctx, throughput-sorted
  meta-llama/llama-3.3-70b-instruct:nitro     — $0.10/$0.32  — text only, 131K ctx, Groq-fast

ROUTING RULES (apply in order — speed is the primary objective)

IMAGE INPUT (message contains an image or screenshot)
  → bytedance-seed/seed-1.6-flash

WEB SEARCH / CURRENT INFO (user asks about "latest", "current", "today", "news", "recent")
  → x-ai/grok-4.1-fast  [has native web search + X search at $5/K calls]

TOOL USE / FUNCTION CALLING / AGENTIC
  → x-ai/grok-4.1-fast  [best tool-call throughput with 2M context]

CONTEXT > 128K TOKENS (no tool use needed)
  → google/gemini-3.1-flash-lite-preview:nitro

OPEN-SOURCE / COST-OPTIMIZED
  → meta-llama/llama-3.3-70b-instruct:nitro

EVERYTHING ELSE
  → inception/mercury-2  [default — fastest generation at 1000+ T/s]

Never use a slower model when a faster one can handle the task.
`.trim(),
  },

  // ── 3. Fast Coding ──────────────────────────────────────────────────────────
  {
    id: "coding-fast",
    name: "Fast Coding",
    description: "Near-frontier coding quality at a fraction of the cost: MiniMax M2.5 (80.2% SWE-bench) as the workhorse",
    gatewayPresetId: "openrouter",
    classifierModel: "google/gemini-3.1-flash-lite-preview",
    defaultModel: "minimax/minimax-m2.5",
    models: [
      {
        id: "minimax/minimax-m2.5",
        name: "MiniMax M2.5",
        modality: "text->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Most coding tasks: features, bug fixes, code review, refactors. 80.2% SWE-bench (near Claude Opus level at 1/20 the output cost). $0.25/$1.20 per M tokens.",
      },
      {
        id: "qwen/qwen3-coder",
        name: "Qwen3-Coder",
        modality: "text->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Large codebases, multi-file navigation, tool-heavy agentic coding. 480B total / 35B active MoE, 262K ctx. $0.22/$1 per M tokens.",
      },
      {
        id: "deepseek/deepseek-v3.2",
        name: "DeepSeek V3.2",
        modality: "text->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Scripts, data transforms, standalone logic-heavy functions. 73% SWE-bench, cheapest strong output. $0.26/$0.38 per M tokens.",
      },
      {
        id: "moonshotai/kimi-k2.5",
        name: "Kimi K2.5",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "UI/frontend coding, CSS, visual layout, image inputs (only vision-capable model here). 76.8% SWE-bench, 262K ctx. $0.45/$2.20 per M tokens.",
      },
      {
        id: "qwen/qwen3.5-9b",
        name: "Qwen 3.5 9B",
        modality: "text->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Trivial completions, fill-in-the-blank boilerplate, autocomplete-style tasks where cost matters most. $0.05/$0.15 per M tokens.",
      },
    ],
    routingInstructions: `
Route every request to the best coding model for the task. Pricing shown per million tokens (input/output).

MODEL REFERENCE
  minimax/minimax-m2.5    — $0.25/$1.20  — text only, 80.2% SWE-bench, 196K ctx
  qwen/qwen3-coder        — $0.22/$1     — text only, 480B/35B active MoE, 262K ctx
  deepseek/deepseek-v3.2  — $0.26/$0.38  — text only, 73% SWE-bench, 163K ctx
  moonshotai/kimi-k2.5    — $0.45/$2.20  — VISION, 76.8% SWE-bench, 262K ctx
  qwen/qwen3.5-9b         — $0.05/$0.15  — text only, ultra-cheap

ROUTING RULES (apply in order)

IMAGE INPUT (screenshot, UI mockup, diagram, code in an image)
  → moonshotai/kimi-k2.5  [only vision-capable model in this catalog]

WEB SEARCH / CURRENT DOCS (user asks about latest library version, API changes, "look up X")
  → minimax/minimax-m2.5:online  [append :online for Exa web search, ~$0.02/request]

AGENTIC / MULTI-FILE (codebase navigation, tool loops, multi-step execution)
  → qwen/qwen3-coder

SCRIPTS / DATA / STANDALONE FUNCTIONS (isolated logic, data transforms, one-file tasks)
  → deepseek/deepseek-v3.2  [cheapest strong output at $0.38/M]

UI / FRONTEND / CSS / VISUAL LAYOUT (text only, no image)
  → moonshotai/kimi-k2.5  [specialized for visual coding even without an image]

TRIVIAL BOILERPLATE / AUTOCOMPLETE (getters, setters, simple loops, obvious completions)
  → qwen/qwen3.5-9b

ALL OTHER CODING (features, bugs, reviews, refactors, tests)
  → minimax/minimax-m2.5  [default — 80.2% SWE-bench at $1.20/M output]

Only escalate to a more expensive model when the cheaper one genuinely cannot handle the task.
`.trim(),
  },

  // ── 4. Deep Premium Agentic Coding ──────────────────────────────────────────
  {
    id: "coding-agentic-premium",
    name: "Deep Premium Agentic",
    description: "Best-in-class agentic coding: Claude Opus for top tasks, MiniMax M2.5 as the smart-cheap workhorse (80.2% SWE-bench at 1/20 Opus cost)",
    gatewayPresetId: "openrouter",
    classifierModel: "google/gemini-3.1-flash-lite-preview",
    defaultModel: "minimax/minimax-m2.5",
    models: [
      {
        id: "anthropic/claude-opus-4.6",
        name: "Claude Opus 4.6",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Highest-stakes tasks: production architecture, security-critical refactors, complex multi-agent orchestration. 80.8% SWE-bench. $5/$25 per M tokens.",
      },
      {
        id: "openai/gpt-5.4",
        name: "GPT-5.4",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Computer use, browser automation, OS-level tool orchestration, image-in-code tasks. Built-in computer use, 57.7% SWE-Bench Pro, 1M ctx. $2.50/$15 per M tokens.",
      },
      {
        id: "minimax/minimax-m2.5",
        name: "MiniMax M2.5",
        modality: "text->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Standard agentic coding: features, bug fixes, PR reviews, most multi-file work. 80.2% SWE-bench at 1/20th Opus output cost. $0.25/$1.20 per M tokens.",
      },
      {
        id: "z-ai/glm-5",
        name: "GLM-5",
        modality: "text->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Long sequential agent loops, complex instruction decomposition, execution chains, self-correction cycles. 77.8% SWE-bench, optimized for persistent multi-turn agents. $0.72/$2.30 per M tokens.",
      },
      {
        id: "google/gemini-3.1-pro-preview",
        name: "Gemini 3.1 Pro",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Full codebase analysis, 100K+ token repos, architectural Q&A requiring entire-repo context. 1M ctx, cheapest frontier model. $2/$12 per M tokens.",
      },
    ],
    routingInstructions: `
Route every request to the best model for production-grade agentic coding. Pricing shown per million tokens (input/output).

MODEL REFERENCE
  anthropic/claude-opus-4.6     — $5/$25    — VISION, 80.8% SWE-bench, 1M ctx
  openai/gpt-5.4                — $2.50/$15  — VISION, 57.7% SWE-bench Pro, 1M ctx, computer use
  minimax/minimax-m2.5          — $0.25/$1.20 — text only, 80.2% SWE-bench, 196K ctx
  z-ai/glm-5                    — $0.72/$2.30 — text only, 77.8% SWE-bench, 202K ctx, agent-optimized
  google/gemini-3.1-pro-preview — $2/$12     — VISION, 1M ctx, cheapest frontier

ROUTING RULES (apply in order)

IMAGE INPUT (screenshots, diagrams, UI mockups, code in an image)
  → openai/gpt-5.4  [best vision + coding combination in this catalog]

WEB SEARCH / CURRENT DOCS / API LOOKUPS (user asks about latest versions, changelogs, real-time info)
  → openai/gpt-5.4:online  [or anthropic/claude-opus-4.6:online for highest-quality research]

COMPUTER USE / BROWSER AUTOMATION / OS-LEVEL TOOLING
  → openai/gpt-5.4

HIGHEST-STAKES: PRODUCTION ARCHITECTURE / SECURITY-CRITICAL / COMPLEX MULTI-AGENT
  → anthropic/claude-opus-4.6  [only when genuine complexity justifies the cost]

LONG AGENT LOOPS / EXECUTION CHAINS / SELF-CORRECTION CYCLES
  → z-ai/glm-5  [built for persistent step-by-step multi-turn agents]

ENTIRE REPO ANALYSIS / 100K+ TOKEN CONTEXT WINDOW REQUIRED
  → google/gemini-3.1-pro-preview  [1M context at $12/M output — far cheaper than Opus for read-heavy tasks]

ALL OTHER AGENTIC CODING (features, bugs, PRs, refactors, most multi-file work)
  → minimax/minimax-m2.5  [default — 80.2% SWE-bench at 1/20th Opus output cost]

Reserve Claude Opus 4.6 for tasks where the extra cost is genuinely justified by complexity.
Prefer MiniMax M2.5 by default — it matches Opus-class benchmark scores at a fraction of the price.
`.trim(),
  },

  // ── 5. Customer Support ─────────────────────────────────────────────────────
  {
    id: "customer-support",
    name: "Customer Support",
    description: "Nuanced support replies by default, with dedicated paths for long ticket history, screenshots, tool-driven lookups, and budget-scale FAQ volume",
    gatewayPresetId: "openrouter",
    classifierModel: "google/gemini-3.1-flash-lite-preview",
    defaultModel: "anthropic/claude-sonnet-4.6",
    models: [
      {
        id: "anthropic/claude-sonnet-4.6",
        name: "Claude Sonnet 4.6",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Default for nuanced customer replies, de-escalation, policy explanations, retention conversations, and other high-empathy cases. $3/$15 per M tokens.",
      },
      {
        id: "google/gemini-3.1-pro-preview",
        name: "Gemini 3.1 Pro",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Long ticket threads, full account histories, policy manuals, help-center synthesis, and large transcript summarization. 1M ctx. $2/$12 per M tokens.",
      },
      {
        id: "x-ai/grok-4.1-fast",
        name: "Grok 4.1 Fast",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Tool-driven support triage, order/account lookups, current-status checks, function calling, and fast operational answers. 2M ctx. $0.20/$0.50 per M tokens.",
      },
      {
        id: "bytedance-seed/seed-1.6-flash",
        name: "Seed 1.6 Flash",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Screenshot troubleshooting, UI walkthroughs, and image-based support issues at the cheapest multimodal price point. $0.075/$0.30 per M tokens.",
      },
      {
        id: "deepseek/deepseek-v3.2",
        name: "DeepSeek V3.2",
        modality: "text->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "High-volume FAQ handling, repetitive support macros, low-stakes deflection, and budget-sensitive queue coverage. $0.26/$0.38 per M tokens.",
      },
    ],
    routingInstructions: `
Route every request to the single best support model. Optimize for accurate, empathetic resolution with minimal follow-up. Pricing shown per million tokens (input/output).

MODEL REFERENCE
  anthropic/claude-sonnet-4.6    — $3/$15     — vision, 1M ctx
  google/gemini-3.1-pro-preview  — $2/$12     — vision, 1M ctx
  x-ai/grok-4.1-fast             — $0.20/$0.50 — vision, 2M ctx, strong for tools / live lookup
  bytedance-seed/seed-1.6-flash  — $0.075/$0.30 — vision, 256K ctx
  deepseek/deepseek-v3.2         — $0.26/$0.38 — text only, 163K ctx

ROUTING RULES (apply in order)

IMAGE INPUT / SCREENSHOT TROUBLESHOOTING
  → bytedance-seed/seed-1.6-flash

TOOL USE / FUNCTION CALLING / ACCOUNT LOOKUPS / ORDER STATUS / CURRENT INFO
  → x-ai/grok-4.1-fast

VERY LONG THREADS / FULL CASE HISTORY / LARGE POLICY OR HELP-CENTER PASTES / CONTEXT >50K TOKENS
  → google/gemini-3.1-pro-preview

UPSET CUSTOMER / CANCELLATION / RETENTION / BILLING DISPUTE / HIGH-EMPATHY OR HIGH-JUDGMENT RESPONSE
  → anthropic/claude-sonnet-4.6

FAQ / MACRO-LIKE REPLIES / HIGH-VOLUME LOW-STAKES SUPPORT WHERE COST IS THE PRIORITY
  → deepseek/deepseek-v3.2

EVERYTHING ELSE
  → anthropic/claude-sonnet-4.6

Default to Claude Sonnet 4.6 when the task is ambiguous.
`.trim(),
  },

  // ── 6. Vercel Balanced General-Purpose ─────────────────────────────────────
  {
    id: "vercel-balanced",
    name: "Vercel Balanced",
    description: "Balanced Vercel AI Gateway setup: Claude default, Gemini Pro for long context, Gemini Flash for speed, GPT-5 mini for structured/tool-heavy work, DeepSeek for budget",
    gatewayPresetId: "vercel",
    classifierModel: "google/gemini-2.5-flash-lite",
    defaultModel: "anthropic/claude-sonnet-4.6",
    models: [
      {
        id: "anthropic/claude-sonnet-4.6",
        name: "Claude Sonnet 4.6",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Default for nuanced reasoning, polished writing, and ambiguous tasks where quality matters most. $3/$15 per M tokens.",
      },
      {
        id: "google/gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Large documents, long transcripts, file-heavy analysis, and read-heavy work with 1M context. $1.25/$10 per M tokens up to 200K input tokens.",
      },
      {
        id: "google/gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Fast replies, lightweight multimodal tasks, and lower-latency general chat. $0.30/$2.50 per M tokens.",
      },
      {
        id: "openai/gpt-5-mini",
        name: "GPT-5 mini",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Structured outputs, tool-heavy tasks, and reliable instruction-following with lower cost than frontier GPT models. $0.25/$2 per M tokens.",
      },
      {
        id: "deepseek/deepseek-v3.2",
        name: "DeepSeek V3.2",
        modality: "text->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Budget-sensitive text workloads, repetitive tasks, and cheap high-volume throughput. $0.26/$0.38 per M tokens.",
      },
    ],
    routingInstructions: `
Route every request to the best Vercel AI Gateway model for the task. Prefer quality first, then speed and cost.

MODEL REFERENCE
  anthropic/claude-sonnet-4.6  — $3/$15      — vision, 1M ctx
  google/gemini-2.5-pro        — $1.25/$10   — vision, 1M ctx
  google/gemini-2.5-flash      — $0.30/$2.50 — vision, 1M ctx
  openai/gpt-5-mini            — $0.25/$2    — vision, 400K ctx
  deepseek/deepseek-v3.2       — $0.26/$0.38 — text only, 128K ctx

ROUTING RULES (apply in order)

LONG DOCUMENTS / FILE INPUT / TRANSCRIPTS / CONTEXT >50K TOKENS
  → google/gemini-2.5-pro

STRICT JSON / STRUCTURED OUTPUT / TOOL-HEAVY WORKFLOWS
  → openai/gpt-5-mini

QUICK GENERAL CHAT / LIGHTWEIGHT MULTIMODAL / LOWER-LATENCY REQUESTS
  → google/gemini-2.5-flash

BUDGET-FIRST TEXT TASKS
  → deepseek/deepseek-v3.2

EVERYTHING ELSE
  → anthropic/claude-sonnet-4.6

Default to Claude Sonnet 4.6 when the task is ambiguous.
`.trim(),
  },

  // ── 7. Vercel Speed-First ──────────────────────────────────────────────────
  {
    id: "vercel-speed-first",
    name: "Vercel Speed-First",
    description: "Low-latency Vercel AI Gateway setup with Gemini Flash Lite as default, Grok Fast for long-context tools, GPT-5 mini for stricter structured work, and DeepSeek for cheapest text volume",
    gatewayPresetId: "vercel",
    classifierModel: "google/gemini-2.5-flash-lite",
    defaultModel: "google/gemini-2.5-flash-lite",
    models: [
      {
        id: "google/gemini-2.5-flash-lite",
        name: "Gemini 2.5 Flash Lite",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Default for the fastest low-cost responses on Vercel with multimodal support. $0.10/$0.40 per M tokens.",
      },
      {
        id: "google/gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Fast multimodal tasks that need more headroom than Flash Lite. $0.30/$2.50 per M tokens.",
      },
      {
        id: "xai/grok-4.1-fast-non-reasoning",
        name: "Grok 4.1 Fast Non-Reasoning",
        modality: "text->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Long-context tool use, operational lookups, and fast text workflows with 2M context. $0.20/$0.50 per M tokens up to 128K input tokens.",
      },
      {
        id: "openai/gpt-5-mini",
        name: "GPT-5 mini",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Fast structured outputs and stricter instruction following when Flash Lite is too loose. $0.25/$2 per M tokens.",
      },
      {
        id: "deepseek/deepseek-v3.2",
        name: "DeepSeek V3.2",
        modality: "text->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Cheapest high-volume text path when quality needs are modest. $0.26/$0.38 per M tokens.",
      },
    ],
    routingInstructions: `
Route every request to the fastest acceptable model on Vercel AI Gateway. Minimize latency and cost before quality.

MODEL REFERENCE
  google/gemini-2.5-flash-lite     — $0.10/$0.40 — vision, 1M ctx
  google/gemini-2.5-flash          — $0.30/$2.50 — vision, 1M ctx
  xai/grok-4.1-fast-non-reasoning  — $0.20/$0.50 — text only, 2M ctx
  openai/gpt-5-mini                — $0.25/$2    — vision, 400K ctx
  deepseek/deepseek-v3.2           — $0.26/$0.38 — text only, 128K ctx

ROUTING RULES (apply in order)

LONG CONTEXT / TOOL-HEAVY TEXT WORKFLOWS
  → xai/grok-4.1-fast-non-reasoning

STRICT JSON / STRUCTURED OUTPUT
  → openai/gpt-5-mini

IMAGE INPUT / SCREENSHOTS / FAST MULTIMODAL
  → google/gemini-2.5-flash

CHEAPEST TEXT VOLUME
  → deepseek/deepseek-v3.2

EVERYTHING ELSE
  → google/gemini-2.5-flash-lite

Default to Gemini 2.5 Flash Lite when the task is simple or ambiguous.
`.trim(),
  },

  // ── 8. Cheap Frontier Coding ───────────────────────────────────────────────
  {
    id: "coding-cheap-frontier",
    name: "Cheap Frontier Coding",
    description:
      "OpenRouter coding preset with MiniMax M2.7 as the cheap implementation default, GLM 5 for architecture and complex builds, Kimi K2.5 for UI and multimodal work, Mercury 2 for quick edits, and Gemini 3.1 Flash Lite Preview for long-context overflow",
    gatewayPresetId: "openrouter",
    classifierModel: "google/gemini-3.1-flash-lite-preview",
    defaultModel: "minimax/minimax-m2.7",
    models: [
      {
        id: "minimax/minimax-m2.7",
        name: "MiniMax M2.7",
        modality: "text->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Default for everyday implementation, refactors, bug fixes, and general coding where price-performance matters most. 204.8K ctx. $0.30/$1.20 per M tokens.",
      },
      {
        id: "z-ai/glm-5",
        name: "GLM 5",
        modality: "text->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Architecture decisions, complex implementations, and harder engineering tasks that need a stronger text-only reasoning model. 80K ctx. $0.72/$2.30 per M tokens.",
      },
      {
        id: "moonshotai/kimi-k2.5",
        name: "Kimi K2.5",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "UI design, screenshot-driven debugging, multimodal implementation work, and fast frontend iteration. 262K ctx. $0.45/$2.20 per M tokens.",
      },
      {
        id: "inception/mercury-2",
        name: "Mercury 2",
        modality: "text->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Quick text-only edits, tiny diffs, low-stakes patches, and cheap fast-turn coding. 128K ctx. $0.25/$0.75 per M tokens.",
      },
      {
        id: "google/gemini-3.1-flash-lite-preview",
        name: "Gemini 3.1 Flash Lite Preview",
        modality: "text,image,file,audio,video->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Long-context overflow, repo-wide quick edits, large attachments, and multimodal coding tasks when the prompt size gets too large for the cheaper text-only fast-edit path. 1M ctx. $0.25/$1.50 per M tokens.",
      },
    ],
    routingInstructions: `
Route every request to the best OpenRouter model for cheap frontier coding. Optimize for coding quality per dollar first, then latency.

MODEL REFERENCE
  minimax/minimax-m2.7                    — $0.30/$1.20 — text only, 204.8K ctx
  z-ai/glm-5                              — $0.72/$2.30 — text only, 80K ctx
  moonshotai/kimi-k2.5                    — $0.45/$2.20 — vision, 262K ctx
  inception/mercury-2                     — $0.25/$0.75 — text only, 128K ctx
  google/gemini-3.1-flash-lite-preview    — $0.25/$1.50 — multimodal, 1M ctx

ROUTING RULES (apply in order)

UI DESIGN / SCREENSHOTS / IMAGE INPUT / FRONTEND POLISH / MULTIMODAL DEBUGGING
  → moonshotai/kimi-k2.5

ARCHITECTURE / SYSTEM DESIGN / COMPLEX IMPLEMENTATION / MULTI-STEP REFACTOR / HIGHER-DEPTH ENGINEERING
  → z-ai/glm-5

LONG CONTEXT / LARGE REPO READS / BIG PASTES / ATTACHMENTS / QUICK EDITS WITH CONTEXT OVERFLOW
  → google/gemini-3.1-flash-lite-preview

TINY PATCH / SINGLE-FILE TWEAK / LOW-STAKES QUICK EDIT / BUDGET-FIRST SHORT TURN
  → inception/mercury-2

EVERYTHING ELSE
  → minimax/minimax-m2.7

Default to MiniMax M2.7 when the task is ordinary implementation work and the route is ambiguous.
`.trim(),
  },

  // ── 9. Vercel Customer Support ─────────────────────────────────────────────
  {
    id: "vercel-customer-support",
    name: "Vercel Customer Support",
    description: "Customer-support routing for Vercel AI Gateway: Claude default, Gemini Pro for long case history, Gemini Flash for screenshots, GPT-5 mini for strict handoffs, DeepSeek for budget FAQs",
    gatewayPresetId: "vercel",
    classifierModel: "google/gemini-2.5-flash-lite",
    defaultModel: "anthropic/claude-sonnet-4.6",
    models: [
      {
        id: "anthropic/claude-sonnet-4.6",
        name: "Claude Sonnet 4.6",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Default for empathetic replies, de-escalation, policy explanations, and high-judgment support work. $3/$15 per M tokens.",
      },
      {
        id: "google/gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Long ticket histories, full account timelines, large policy docs, and case-summary synthesis. $1.25/$10 per M tokens up to 200K input tokens.",
      },
      {
        id: "google/gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Screenshot troubleshooting, quick support replies, and lower-latency multimodal support flows. $0.30/$2.50 per M tokens.",
      },
      {
        id: "openai/gpt-5-mini",
        name: "GPT-5 mini",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Strict JSON handoffs, CRM/tool workflows, and support automations with exact instruction following. $0.25/$2 per M tokens.",
      },
      {
        id: "deepseek/deepseek-v3.2",
        name: "DeepSeek V3.2",
        modality: "text->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "High-volume FAQ replies, low-stakes support macros, and cost-sensitive support queues. $0.26/$0.38 per M tokens.",
      },
    ],
    routingInstructions: `
Route every request to the single best Vercel AI Gateway model for customer support. Optimize for accurate, empathetic resolution with minimal follow-up.

MODEL REFERENCE
  anthropic/claude-sonnet-4.6  — $3/$15      — vision, 1M ctx
  google/gemini-2.5-pro        — $1.25/$10   — vision, 1M ctx
  google/gemini-2.5-flash      — $0.30/$2.50 — vision, 1M ctx
  openai/gpt-5-mini            — $0.25/$2    — vision, 400K ctx
  deepseek/deepseek-v3.2       — $0.26/$0.38 — text only, 128K ctx

ROUTING RULES (apply in order)

LONG CASE HISTORY / LARGE POLICY PASTE / MULTI-THREAD SUMMARY / CONTEXT >50K TOKENS
  → google/gemini-2.5-pro

IMAGE INPUT / SCREENSHOT TROUBLESHOOTING / UI WALKTHROUGH
  → google/gemini-2.5-flash

STRICT STRUCTURED HANDOFF / TOOL-DRIVEN SUPPORT AUTOMATION
  → openai/gpt-5-mini

FAQ / MACRO-LIKE REPLIES / LOW-STAKES HIGH-VOLUME SUPPORT WHERE COST MATTERS MOST
  → deepseek/deepseek-v3.2

EVERYTHING ELSE
  → anthropic/claude-sonnet-4.6

Default to Claude Sonnet 4.6 when the support task is ambiguous or emotionally sensitive.
`.trim(),
  },

  // ── 10. Vercel Fast Coding ─────────────────────────────────────────────────
  {
    id: "vercel-coding-fast",
    name: "Vercel Fast Coding",
    description: "Comparable to the OpenRouter fast-coding preset, but built from Vercel AI Gateway models: Grok Code Fast as the cheap code-first default, GPT-5 Codex for harder implementation work, Claude for review quality, Gemini for repo-wide reads",
    gatewayPresetId: "vercel",
    classifierModel: "google/gemini-2.5-flash-lite",
    defaultModel: "xai/grok-code-fast-1",
    models: [
      {
        id: "xai/grok-code-fast-1",
        name: "Grok Code Fast 1",
        modality: "text->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Default for everyday coding with a speed and cost bias: implementations, refactors, bug fixes, and interactive iteration. Code-specialized, 256K ctx. $0.20/$1.50 per M tokens.",
      },
      {
        id: "openai/gpt-5-codex",
        name: "GPT-5 Codex",
        modality: "text->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Harder implementation work, multi-step fixes, exact code edits, and stronger code-generation reliability. 400K ctx. $1.25/$10 per M tokens.",
      },
      {
        id: "anthropic/claude-sonnet-4.6",
        name: "Claude Sonnet 4.6",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Code review, architectural tradeoffs, nuanced explanations, and ambiguous engineering tasks where judgment matters. 1M ctx. $3/$15 per M tokens.",
      },
      {
        id: "google/gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Full-repo analysis, long transcripts, giant docs, and read-heavy coding tasks that need 1M context. $1.25/$10 per M tokens up to 200K input tokens.",
      },
      {
        id: "deepseek/deepseek-v3.2",
        name: "DeepSeek V3.2",
        modality: "text->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Cheap scripts, small utilities, data transforms, and budget-first text coding tasks. $0.26/$0.38 per M tokens.",
      },
    ],
    routingInstructions: `
Route every request to the best Vercel AI Gateway coding model for the task. Optimize for coding quality per dollar, then speed.

MODEL REFERENCE
  xai/grok-code-fast-1         — $0.20/$1.50 — text only, 256K ctx
  openai/gpt-5-codex           — $1.25/$10   — text only, 400K ctx
  anthropic/claude-sonnet-4.6  — $3/$15      — vision, 1M ctx
  google/gemini-2.5-pro        — $1.25/$10   — vision, 1M ctx
  deepseek/deepseek-v3.2       — $0.26/$0.38 — text only, 128K ctx

ROUTING RULES (apply in order)

FULL REPO ANALYSIS / LARGE CODEBASE READS / CONTEXT >100K TOKENS
  → google/gemini-2.5-pro

COMPLEX IMPLEMENTATION / MULTI-STEP BUG FIX / PRECISE CODE EDITS / HIGHER CONFIDENCE NEEDED
  → openai/gpt-5-codex

CODE REVIEW / DESIGN DISCUSSION / TRADEOFF ANALYSIS / AMBIGUOUS ENGINEERING QUESTIONS
  → anthropic/claude-sonnet-4.6

CHEAP SCRIPTS / SMALL UTILITIES / BUDGET-FIRST CODING
  → deepseek/deepseek-v3.2

EVERYTHING ELSE
  → xai/grok-code-fast-1

Default to Grok Code Fast 1 when the task is ordinary coding and the route is ambiguous.
`.trim(),
  },

  // ── 11. Vercel Deep Premium Agentic ────────────────────────────────────────
  {
    id: "vercel-coding-agentic-premium",
    name: "Vercel Deep Premium Agentic",
    description: "Comparable to the OpenRouter premium-agentic coding preset, built from Vercel AI Gateway models: Claude Sonnet as the premium workhorse, Claude Opus for highest-stakes work, GPT-5.4 and GPT-5 Codex for tool-heavy execution, Gemini Pro for whole-repo reads",
    gatewayPresetId: "vercel",
    classifierModel: "google/gemini-2.5-flash-lite",
    defaultModel: "anthropic/claude-sonnet-4.6",
    models: [
      {
        id: "anthropic/claude-sonnet-4.6",
        name: "Claude Sonnet 4.6",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Default premium workhorse for serious implementation, refactors, code review, and broad agentic coding. 1M ctx. $3/$15 per M tokens.",
      },
      {
        id: "anthropic/claude-opus-4.6",
        name: "Claude Opus 4.6",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Highest-stakes architecture, security-sensitive changes, and the hardest engineering tasks where cost is justified. 1M ctx. $5/$25 per M tokens.",
      },
      {
        id: "openai/gpt-5.4",
        name: "GPT 5.4",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Tool-heavy planning, structured execution, multimodal engineering tasks, and deep reasoning with 1.05M context. $2.50/$15 per M tokens.",
      },
      {
        id: "openai/gpt-5-codex",
        name: "GPT-5 Codex",
        modality: "text->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Precise code generation, exact code edits, and implementation-heavy agent loops. 400K ctx. $1.25/$10 per M tokens.",
      },
      {
        id: "google/gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        modality: "text,image->text",
        thinking: "none",
        reasoningPreset: "none",
        whenToUse:
          "Read-heavy whole-repo analysis, giant documents, and repository-scale architecture Q&A. 1M ctx. $1.25/$10 per M tokens up to 200K input tokens.",
      },
    ],
    routingInstructions: `
Route every request to the best Vercel AI Gateway model for premium agentic coding. Optimize for capability first and cost second.

MODEL REFERENCE
  anthropic/claude-sonnet-4.6  — $3/$15      — vision, 1M ctx
  anthropic/claude-opus-4.6    — $5/$25      — vision, 1M ctx
  openai/gpt-5.4               — $2.50/$15   — vision, 1.05M ctx
  openai/gpt-5-codex           — $1.25/$10   — text only, 400K ctx
  google/gemini-2.5-pro        — $1.25/$10   — vision, 1M ctx

ROUTING RULES (apply in order)

HIGHEST-STAKES ARCHITECTURE / SECURITY-SENSITIVE / VERY HARD ENGINEERING DECISIONS
  → anthropic/claude-opus-4.6

MULTIMODAL ENGINEERING / TOOL-HEAVY STRUCTURED EXECUTION / DEEP REASONING
  → openai/gpt-5.4

PRECISE IMPLEMENTATION / EXACT CODE EDITS / CODE-FIRST AGENT LOOPS
  → openai/gpt-5-codex

WHOLE-REPO READS / LONG DOCUMENTS / LARGE CONTEXT SYNTHESIS
  → google/gemini-2.5-pro

EVERYTHING ELSE
  → anthropic/claude-sonnet-4.6

Default to Claude Sonnet 4.6 when the task is premium coding work but the route is ambiguous.
`.trim(),
  },
];
