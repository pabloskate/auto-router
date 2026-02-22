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
//   OPENROUTER_API_KEY     string
//   ADMIN_SECRET           string
//
// Optional bindings:
//   AA_API_KEY             string  (Artificial Analysis — for ingestion)
//   ROUTER_CLASSIFIER_MODEL string (overrides the default frontier classifier)
//   SESSION_COOKIE_SECURE   "true"|"false" (defaults to NODE_ENV === production)
// ─────────────────────────────────────────────────────────────────────────────

export { getRuntimeBindings, type RouterRuntimeBindings } from "./runtime";
