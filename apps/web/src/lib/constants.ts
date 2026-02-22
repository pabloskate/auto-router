// ─────────────────────────────────────────────────────────────────────────────
// constants.ts
//
// Central home for every magic number and hard-coded string in the web app.
// Import from here instead of scattering literals across files.
// ─────────────────────────────────────────────────────────────────────────────

// ── Guardrail Thresholds ──────────────────────────────────────────────────────
//
// Guardrails temporarily disable a model/provider when observed performance
// metrics breach configured limits. State is in-process (Map) so it resets on
// worker restart — this is intentional: a fresh worker should give models a
// clean slate.
//
// How it works:
//   1. Every routed request records an event (ok, latencyMs, fallback).
//   2. After each event, three checks run against rolling windows:
//      a. 5-min error rate  > ERROR_RATE_LIMIT
//      b. 10-min fallback rate > FALLBACK_RATE_LIMIT
//      c. 5-min P95 latency  > day P95 * LATENCY_DEGRADATION_FACTOR
//   3. If any check fires AND the sample is large enough (MIN_EVENTS), the
//      model is disabled for COOLDOWN_MS.
//   4. Events older than MAX_AGE_MS are pruned to keep memory bounded.

export const GUARDRAIL = {
  // Rolling window sizes
  FIVE_MIN_MS: 5 * 60 * 1000,
  TEN_MIN_MS: 10 * 60 * 1000,
  DAY_MS: 24 * 60 * 60 * 1000,

  // How long a model stays disabled after a threshold breach
  COOLDOWN_MS: 30 * 60 * 1000,

  // Minimum sample size before any threshold check is evaluated.
  // Avoids false positives during warm-up.
  MIN_EVENTS: 50,

  // Disable if 5-min error rate (non-2xx responses) exceeds 3 %
  ERROR_RATE_LIMIT: 0.03,

  // Disable if 10-min fallback rate (requests that fell through to a backup
  // model) exceeds 8 %
  FALLBACK_RATE_LIMIT: 0.08,

  // Disable if recent P95 latency is 80 % worse than the day baseline.
  // Formula: fiveMinP95 > dayP95 * LATENCY_DEGRADATION_FACTOR
  LATENCY_DEGRADATION_FACTOR: 1.8,

  // Minimum latency sample sizes for the latency check
  MIN_DAY_LATENCY_SAMPLES: 50,
  MIN_RECENT_LATENCY_SAMPLES: 20,
} as const;

// ── Authentication ────────────────────────────────────────────────────────────

export const AUTH = {
  // Prefix on every user-visible API key. Change requires a migration.
  API_KEY_PREFIX: "ar_sk_",

  // How many characters of the key are stored as the "prefix" for display
  // (e.g. "ar_sk_1a2b3c…"). Covers the literal prefix + a few hex chars.
  API_KEY_DISPLAY_PREFIX_LENGTH: 12,

  // PBKDF2-SHA256 iterations. NIST SP 800-132 recommends ≥ 10 000; 100 000
  // is the current recommended minimum for password hashing.
  PBKDF2_ITERATIONS: 100_000,

  // Session cookie lifetime
  SESSION_TTL_MS: 1000 * 60 * 60 * 24 * 30,      // 30 days
  SESSION_MAX_AGE_SECONDS: 60 * 60 * 24 * 30,     // 30 days
  SESSION_COOKIE_NAME: "auto_router_session",
} as const;

// ── LLM Classifier ────────────────────────────────────────────────────────────
//
// The frontier classifier is a cheap, fast LLM that reads the user's request
// and picks the best model from the catalog. It is only invoked when the router
// engine decides it cannot make the decision with heuristics alone.

export const CLASSIFIER = {
  // Fallback model when neither the user nor the system config specifies one.
  // Must be a valid OpenRouter model ID.
  DEFAULT_MODEL: "gpt-oss-120b:nitro",

  // Force deterministic output so routing decisions are reproducible.
  TEMPERATURE: 0,

  // JSON response is small; cap tokens to reduce cost.
  MAX_TOKENS: 400,

  OPENROUTER_CHAT_URL: "https://openrouter.ai/api/v1/chat/completions",
} as const;
