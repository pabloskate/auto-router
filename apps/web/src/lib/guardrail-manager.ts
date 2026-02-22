// ─────────────────────────────────────────────────────────────────────────────
// guardrail-manager.ts
//
// In-process circuit breaker for individual model/provider pairs.
//
// State lives in a module-level Map so it persists for the lifetime of a
// Cloudflare Worker isolate (typically minutes to hours). On isolate restart
// every model gets a clean slate — intentional, because transient errors
// shouldn't permanently blacklist a model.
//
// Three independent triggers can disable a model:
//   1. Error rate  — too many non-2xx responses in the last 5 minutes
//   2. Fallback rate — too many requests that had to fall back to a backup
//                      model in the last 10 minutes
//   3. Latency spike — recent P95 is significantly worse than the day baseline
//
// All thresholds live in constants.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { GUARDRAIL } from "./constants";

// ── Types ─────────────────────────────────────────────────────────────────────

interface GuardrailEvent {
  ts: number;
  ok: boolean;
  latencyMs: number;
  /** true when this request was routed to a fallback model, not the primary */
  fallback: boolean;
}

interface GuardrailState {
  events: GuardrailEvent[];
  /** Unix ms timestamp. Model is disabled until this point in time. 0 = enabled. */
  disabledUntilMs: number;
}

// ── In-process state ──────────────────────────────────────────────────────────

const guardrailMap = new Map<string, GuardrailState>();

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Stable key for a (modelId, provider) pair used as the Map key. */
export function guardrailKey(modelId: string, provider: string): string {
  return `${modelId}|${provider}`;
}

/** P-th percentile of a numeric array. Returns 0 for empty arrays. */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index] ?? 0;
}

function getOrCreate(key: string): GuardrailState {
  let state = guardrailMap.get(key);
  if (!state) {
    state = { events: [], disabledUntilMs: 0 };
    guardrailMap.set(key, state);
  }
  return state;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns true if the model/provider is currently in its cooldown window. */
export function isDisabled(key: string, nowMs: number): boolean {
  return getOrCreate(key).disabledUntilMs > nowMs;
}

/**
 * Records the outcome of a single routed request and evaluates all three
 * guardrail triggers. If any trigger fires the model is disabled for
 * GUARDRAIL.COOLDOWN_MS.
 */
export function recordEvent(args: {
  key: string;
  nowMs: number;
  ok: boolean;
  latencyMs: number;
  fallback: boolean;
}): void {
  const state = getOrCreate(args.key);

  // Append event and prune anything older than one day
  const newEvent: GuardrailEvent = { ts: args.nowMs, ok: args.ok, latencyMs: args.latencyMs, fallback: args.fallback };
  state.events = [...state.events, newEvent].filter(
    (e) => args.nowMs - e.ts <= GUARDRAIL.DAY_MS
  );

  // Slice rolling windows
  const fiveMin = state.events.filter((e) => args.nowMs - e.ts <= GUARDRAIL.FIVE_MIN_MS);
  const tenMin = state.events.filter((e) => args.nowMs - e.ts <= GUARDRAIL.TEN_MIN_MS);
  const day = state.events;

  // ── Trigger 1: error rate ────────────────────────────────────────────────
  const errorRate = fiveMin.length > 0
    ? fiveMin.filter((e) => !e.ok).length / fiveMin.length
    : 0;
  const disableByErrors =
    fiveMin.length >= GUARDRAIL.MIN_EVENTS && errorRate > GUARDRAIL.ERROR_RATE_LIMIT;

  // ── Trigger 2: fallback rate ─────────────────────────────────────────────
  const fallbackRate = tenMin.length > 0
    ? tenMin.filter((e) => e.fallback).length / tenMin.length
    : 0;
  const disableByFallbacks =
    tenMin.length >= GUARDRAIL.MIN_EVENTS && fallbackRate > GUARDRAIL.FALLBACK_RATE_LIMIT;

  // ── Trigger 3: latency spike ─────────────────────────────────────────────
  const daySuccessLatencies = day.filter((e) => e.ok).map((e) => e.latencyMs);
  const recentLatencies = fiveMin.map((e) => e.latencyMs);
  const dayP95 = percentile(daySuccessLatencies, 95);
  const recentP95 = percentile(recentLatencies, 95);
  const disableByLatency =
    daySuccessLatencies.length >= GUARDRAIL.MIN_DAY_LATENCY_SAMPLES &&
    recentLatencies.length >= GUARDRAIL.MIN_RECENT_LATENCY_SAMPLES &&
    dayP95 > 0 &&
    recentP95 > dayP95 * GUARDRAIL.LATENCY_DEGRADATION_FACTOR;

  if (disableByErrors || disableByFallbacks || disableByLatency) {
    state.disabledUntilMs = args.nowMs + GUARDRAIL.COOLDOWN_MS;
  }
}
