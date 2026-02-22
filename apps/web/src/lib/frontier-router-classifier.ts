// ─────────────────────────────────────────────────────────────────────────────
// frontier-router-classifier.ts
//
// LLM-based routing classifier. Called by RouterEngine when it cannot make a
// confident routing decision from heuristics alone.
//
// How it works:
//   1. Builds a structured prompt from the user's request + catalog metadata
//   2. Calls a cheap, fast "frontier" model on OpenRouter with JSON mode
//   3. Parses the response into an LlmRoutingResult { selectedModel, confidence, signals }
//
// Status-quo bias: if the conversation is already using a model, the prompt
// heavily biases toward reusing it to preserve KV cache and reduce costs.
// The bias is overridden only when the task complexity shifts dramatically.
//
// Errors: returns null on any failure so the engine can fall back gracefully.
// ─────────────────────────────────────────────────────────────────────────────

import type { LlmRoutingResult } from "@auto-router/core";
import { CLASSIFIER } from "./constants";

type CatalogEntry = {
  id: string;
  thinking?: string;
  whenToUse?: string;
  description?: string;
  modality?: string;
};

function buildPrompt(args: {
  input: string;
  catalog: CatalogEntry[];
  routingInstructions?: string;
  currentModel?: string;
}): string {
  const modelList = args.catalog
    .map((m) => {
      const parts = [`- ${m.id}`];
      if (m.thinking) parts.push(`thinking:${m.thinking}`);
      if (m.modality?.includes("image")) parts.push("vision:yes");
      if (m.whenToUse) parts.push(`use:${m.whenToUse}`);
      if (m.description) parts.push(m.description);
      return parts.join(" | ");
    })
    .join("\n");

  // Status-quo bias: strongly prefer the current model to preserve KV cache.
  // Only override if the task type shifts so dramatically that the current
  // model physically cannot handle it (e.g., switching from text to vision).
  const statusQuoBias = args.currentModel
    ? `\nCRITICAL STATUS QUO BIAS:\nThe user is currently using the model '${args.currentModel}'. You MUST select this exact same model AGAIN, unless the user's latest message represents a massive shift in complexity or task type that this model physically cannot handle. We want to preserve their cache!\n`
    : "";

  return `You are a routing classifier for an LLM router.

Your job is to read the user's request and pick exactly one optimal model from the provided OpenRouter catalog.

Here are the custom routing instructions/hints to follow (if any):
====================
${args.routingInstructions || "No explicit routing instructions provided."}
====================

Available Models (Pick EXACTLY one from this list):
${modelList}

Decision Rules:
1) Output valid JSON only.
2) If the user specifically asks for a model that exists in the catalog, use it.
3) Follow the routing instructions closely.
4) If no routing instructions apply and no model is requested, try to pick a model suitable for the task.${statusQuoBias}

Return JSON with shape:
{"selectedModel":"anthropic/claude-3-opus","confidence":0.87,"signals":["routing_hint:coding","matched:claude-3"]}

User request context:
${args.input}`;
}

export async function routeWithFrontierModel(args: {
  apiKey: string;
  input: string;
  catalog: CatalogEntry[];
  routingInstructions?: string;
  model?: string;
  currentModel?: string;
  fetchImpl?: typeof fetch;
}): Promise<LlmRoutingResult | null> {
  const fetchImpl = args.fetchImpl ?? fetch;

  const response = await fetchImpl(CLASSIFIER.OPENROUTER_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: args.model ?? CLASSIFIER.DEFAULT_MODEL,
      messages: [{ role: "user", content: buildPrompt(args) }],
      response_format: { type: "json_object" },
      temperature: CLASSIFIER.TEMPERATURE,
      max_tokens: CLASSIFIER.MAX_TOKENS,
    }),
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    const parsed = JSON.parse(content) as {
      selectedModel?: string;
      confidence?: number;
      signals?: string[];
    };

    if (!parsed.selectedModel || typeof parsed.selectedModel !== "string") return null;

    return {
      selectedModel: parsed.selectedModel,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
      signals: Array.isArray(parsed.signals)
        ? parsed.signals.filter((s): s is string => typeof s === "string")
        : ["frontier_classification"],
    };
  } catch {
    return null;
  }
}
