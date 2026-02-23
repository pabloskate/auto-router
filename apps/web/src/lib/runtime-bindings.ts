// ─────────────────────────────────────────────────────────────────────────────
// runtime-bindings.ts
//
// Reads Cloudflare Worker environment bindings (D1, KV, secrets) and normalises
// them into a typed RouterRuntimeBindings object.
//
// Why this exists: Next.js / OpenNext exposes Cloudflare bindings through
// multiple APIs depending on the version (getCloudflareContext, globalThis,
// process.env). This file isolates all that plumbing in one place.
//
// Usage: call getRuntimeBindings() at the top of any route handler.
//
// Required bindings (see .env.example for local dev):
//   ROUTER_DB              D1Database
//   ROUTER_KV              KVNamespace
//   ADMIN_SECRET           string
//
// Optional bindings:
//   BYOK_ENCRYPTION_SECRET string (encrypt/decrypt per-user upstream API keys)
//   OPENAI_COMPAT_BASE_URL string (default upstream base URL if user does not set one)
//   OPENROUTER_API_KEY     string (used by catalog recompute endpoint)
//   AA_API_KEY             string  (Artificial Analysis — for ingestion)
//   ROUTER_CLASSIFIER_MODEL string (overrides the default frontier classifier)
//   SESSION_COOKIE_SECURE   "true"|"false" (defaults to NODE_ENV === production)
// ─────────────────────────────────────────────────────────────────────────────

export { getRuntimeBindings, type RouterRuntimeBindings } from "./runtime";
