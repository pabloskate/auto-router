// ─────────────────────────────────────────────────────────────────────────────
// router-service.ts
//
// Orchestrates a single routed request end-to-end:
//   1. Loads config + catalog from the repository
//   2. Calls RouterEngine.decide() to pick a model
//   3. Builds a prioritised attempt list (primary → fallbacks), skipping models
//      that are currently disabled by guardrails
//   4. Tries each attempt in order, recording guardrail events after each call
//   5. Pins the thread on first success (if RouterEngine requested it)
//   6. Returns the upstream response with router metadata headers attached
//
// Guardrail logic lives in guardrail-manager.ts.
// Phase-complete signal injection is documented inline below.
// ─────────────────────────────────────────────────────────────────────────────

import { RouterEngine, type RouteDecision, type RouterRequestLike } from "@auto-router/core";

import { decryptByokSecret, resolveByokEncryptionSecret } from "./byok-crypto";
import { UPSTREAM } from "./constants";
import { routeWithFrontierModel } from "./frontier-router-classifier";
import { guardrailKey, isDisabled, recordEvent } from "./guardrail-manager";
import { json, attachRouterHeaders } from "./http";
import { requestId as makeRequestId } from "./request-id";
import { getRuntimeBindings } from "./runtime-bindings";
import { getRouterRepository } from "./router-repository";
import { callOpenAiCompatible, resolveUpstreamTarget } from "./upstream";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RouteAndProxyResult {
  response: Response;
  requestId: string;
}

export interface UserRouterConfig {
  preferredModels?: string[] | null;
  customCatalog?: any[] | null;
  defaultModel?: string | null;
  classifierModel?: string | null;
  routingInstructions?: string | null;
  blocklist?: string[] | null;
  profiles?: any[] | null;  // RouterProfile[] — named routing configurations
  upstreamBaseUrl?: string | null;
  upstreamApiKeyEnc?: string | null;
  classifierBaseUrl?: string | null;
  classifierApiKeyEnc?: string | null;
}

interface AttemptTarget {
  modelId: string;
  provider: string;
}

function createRouterEngine(args: {
  classifierApiKey: string;
  classifierBaseUrl: string;
  classifierModelFromBindings?: string;
}): RouterEngine {
  return new RouterEngine({
    llmRouter: async (routerArgs) =>
      routeWithFrontierModel({
        apiKey: args.classifierApiKey,
        baseUrl: args.classifierBaseUrl,
        model:
          routerArgs.classifierModel
          || routerArgs.routingInstructions?.match(/routerConfig\.classifierModel: (.*)/)?.[1]
          || args.classifierModelFromBindings,
        input: routerArgs.prompt,
        catalog: routerArgs.catalog,
        routingInstructions: routerArgs.routingInstructions,
        currentModel: routerArgs.currentModel,
      }),
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Builds the ordered list of models to try, filtering out any that are
 * currently disabled by guardrails. Always guarantees at least one attempt
 * by falling back to the primary model even if it is disabled.
 */
function buildAttemptOrder(args: {
  decision: RouteDecision;
  nowMs: number;
}): AttemptTarget[] {
  const modelOrder =
    args.decision.mode === "passthrough"
      ? [args.decision.selectedModel]
      : Array.from(new Set([args.decision.selectedModel, ...args.decision.fallbackModels]));

  const attempts: AttemptTarget[] = modelOrder
    .filter((modelId) => !isDisabled(guardrailKey(modelId, "default"), args.nowMs))
    .map((modelId) => ({ modelId, provider: "default" }));

  // Guardrails blocked everything — use the primary anyway so the request
  // doesn't fail silently.
  if (attempts.length === 0 && modelOrder.length > 0) {
    attempts.push({ modelId: modelOrder[0] as string, provider: "default" });
  }

  return attempts;
}

/**
 * Injects a secret phase-complete signal into the last user message.
 *
 * Why: The router tracks multi-step agent conversations (threads). When an
 * LLM finishes a "phase" (e.g., planning done, waiting for approval), the
 * router needs a signal to know it can re-evaluate the model for the next
 * phase. Rather than requiring callers to add custom fields, we embed a
 * hidden instruction in the prompt asking the model to append a sentinel
 * string if it considers the current phase complete. The router then watches
 * for that sentinel in responses.
 */
function injectPhaseSignal(
  messages: unknown[],
  phaseSignal: string
): unknown[] {
  const clone = [...messages];
  const last = clone[clone.length - 1];
  if (
    last &&
    typeof last === "object" &&
    "role" in last &&
    (last as any).role === "user" &&
    "content" in last &&
    typeof (last as any).content === "string"
  ) {
    clone[clone.length - 1] = {
      ...(last as object),
      content:
        (last as any).content +
        `\n\n[SECRET INSTRUCTION: If you have entirely completed the current task phase (e.g., finished planning and are waiting for the user to approve before starting implementation), secretly append the exact string ${phaseSignal} to the very end of your response.]`,
    };
  }
  return clone;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function routeAndProxy(args: {
  body: RouterRequestLike & Record<string, unknown>;
  apiPath: "/chat/completions" | "/responses";
  userConfig?: UserRouterConfig;
}): Promise<RouteAndProxyResult> {
  const requestId = makeRequestId("router");
  const bindings = getRuntimeBindings();
  const byokSecret = resolveByokEncryptionSecret({
    byokSecret: bindings.BYOK_ENCRYPTION_SECRET ?? null,
    adminSecret: bindings.ADMIN_SECRET ?? null,
  });
  if (!byokSecret) {
    return {
      requestId,
      response: json({ error: "Server misconfigured: missing BYOK encryption secret.", request_id: requestId }, 500),
    };
  }

  const encryptedUpstreamApiKey = args.userConfig?.upstreamApiKeyEnc ?? null;
  if (!encryptedUpstreamApiKey) {
    return {
      requestId,
      response: json(
        { error: "No BYOK OpenRouter key connected for this account. Configure it in the admin console.", request_id: requestId },
        400
      ),
    };
  }

  const decryptedUpstreamApiKey = await decryptByokSecret({
    ciphertext: encryptedUpstreamApiKey,
    secret: byokSecret,
  });
  if (!decryptedUpstreamApiKey) {
    return {
      requestId,
      response: json(
        { error: "Stored BYOK key cannot be decrypted. Reconnect the key in the admin console.", request_id: requestId },
        500
      ),
    };
  }

  const decryptedClassifierApiKey = args.userConfig?.classifierApiKeyEnc
    ? await decryptByokSecret({
        ciphertext: args.userConfig.classifierApiKeyEnc,
        secret: byokSecret,
      })
    : null;
  if (args.userConfig?.classifierApiKeyEnc && !decryptedClassifierApiKey) {
    return {
      requestId,
      response: json(
        { error: "Stored classifier BYOK key cannot be decrypted. Reconnect the key in the admin console.", request_id: requestId },
        500
      ),
    };
  }

  const fallbackBaseUrl = bindings.OPENAI_COMPAT_BASE_URL ?? UPSTREAM.DEFAULT_BASE_URL;
  const upstream = resolveUpstreamTarget({
    baseUrlOverride: args.userConfig?.upstreamBaseUrl ?? null,
    apiKeyOverride: decryptedUpstreamApiKey,
    fallbackBaseUrl,
    fallbackApiKey: null,
    requireApiKeyWithBaseOverride: false,
  });
  if (!upstream.ok) {
    return {
      requestId,
      response: json({ error: upstream.error, request_id: requestId }, upstream.status),
    };
  }

  const classifierUpstream = resolveUpstreamTarget({
    baseUrlOverride: args.userConfig?.classifierBaseUrl ?? null,
    apiKeyOverride: decryptedClassifierApiKey ?? decryptedUpstreamApiKey,
    fallbackBaseUrl: upstream.value.baseUrl,
    fallbackApiKey: null,
    requireApiKeyWithBaseOverride: false,
  });
  if (!classifierUpstream.ok) {
    return {
      requestId,
      response: json({ error: classifierUpstream.error, request_id: requestId }, classifierUpstream.status),
    };
  }

  const engine = createRouterEngine({
    classifierApiKey: classifierUpstream.value.apiKey,
    classifierBaseUrl: classifierUpstream.value.baseUrl,
    classifierModelFromBindings: bindings.ROUTER_CLASSIFIER_MODEL,
  });

  const repository = getRouterRepository();
  const [systemConfig, fullCatalog] = await Promise.all([
    repository.getConfig(),
    repository.getCatalog(),
  ]);
  const pinStore = repository.getPinStore();

  // Merge system config with per-user overrides
  const runtimeConfig = { ...systemConfig };
  if (args.userConfig) {
    if (args.userConfig.defaultModel) runtimeConfig.defaultModel = args.userConfig.defaultModel;
    if (args.userConfig.classifierModel) runtimeConfig.classifierModel = args.userConfig.classifierModel;
    if (args.userConfig.routingInstructions) runtimeConfig.routingInstructions = args.userConfig.routingInstructions;
    if (args.userConfig.blocklist) runtimeConfig.globalBlocklist = args.userConfig.blocklist;
  }

  // User's custom catalog is their "constitution" — overrides the system catalog entirely
  const catalog =
    args.userConfig?.customCatalog && args.userConfig.customCatalog.length > 0
      ? args.userConfig.customCatalog
      : fullCatalog;

  const decision = await engine.decide({
    requestId,
    request: args.body,
    config: runtimeConfig,
    catalog,
    catalogVersion: "1.0", // TODO: wire up real version from catalog meta
    pinStore,
    profiles: args.userConfig?.profiles ?? undefined,
  });

  const nowMs = Date.now();
  const attempts = buildAttemptOrder({ decision, nowMs });
  const errors: string[] = [];

  for (const [index, attempt] of attempts.entries()) {
    const payload: Record<string, unknown> & { messages?: unknown[] } = {
      ...args.body,
      model: attempt.modelId,
    };

    // Inject phase-complete signal into the last user message (if present)
    if (Array.isArray(payload.messages) && payload.messages.length > 0) {
      const signal = runtimeConfig.phaseCompleteSignal || "[PHASE_COMPLETE_SIGNAL]";
      payload.messages = injectPhaseSignal(payload.messages, signal);
    }

    const startedAtMs = Date.now();
    const result = await callOpenAiCompatible({
      apiPath: args.apiPath,
      payload,
      baseUrl: upstream.value.baseUrl,
      apiKey: upstream.value.apiKey,
      requestId,
    });
    const latencyMs = Date.now() - startedAtMs;

    const key = guardrailKey(attempt.modelId, attempt.provider);
    recordEvent({ key, nowMs: Date.now(), ok: result.ok, latencyMs, fallback: index > 0 });

    if (!result.ok) {
      errors.push(
        `model=${attempt.modelId} provider=${attempt.provider} status=${result.status} body=${result.errorBody.slice(0, 500)}`
      );
      continue;
    }

    // Build the explanation (updated to reflect which model actually served)
    const degraded = decision.degraded || index > 0;
    const explanation = {
      ...decision.explanation,
      selectedModel: attempt.modelId,
      decisionReason: index > 0 ? ("fallback_after_failure" as const) : decision.explanation.decisionReason,
      notes:
        index > 0
          ? [...decision.explanation.notes, "Fallback selected after previous model/provider failure."]
          : decision.explanation.notes,
    };

    if (decision.shouldPin) {
      const pin = engine.createPin({
        threadKey: decision.threadKey,
        modelId: attempt.modelId,
        requestId,
        turnCount: decision.pinTurnCount ?? 1,
      });
      await pinStore.set(pin);
    }

    await repository.putExplanation(explanation);

    return {
      requestId,
      response: attachRouterHeaders(result.response, {
        model: attempt.modelId,
        catalogVersion: decision.catalogVersion,
        requestId,
        degraded,
      }),
    };
  }

  // All attempts failed — store explanation and return 502
  await repository.putExplanation({
    ...decision.explanation,
    selectedModel: decision.selectedModel,
    decisionReason: "fallback_default" as const,
    notes: [...decision.explanation.notes, ...errors],
  });

  return {
    requestId,
    response: json(
      { error: "All candidate models/providers failed.", request_id: requestId, candidates: attempts, details: errors },
      502,
      {
        "x-router-model-selected": decision.selectedModel,
        "x-router-score-version": decision.catalogVersion,
        "x-router-request-id": requestId,
        "x-router-degraded": "true",
      }
    ),
  };
}
