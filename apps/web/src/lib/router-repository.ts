// ─────────────────────────────────────────────────────────────────────────────
// router-repository.ts
//
// Repository pattern for all persistent router state.
//
// Two implementations:
//   CloudflareRepository  — production; uses Cloudflare D1 (SQL) + KV (blobs)
//   MemoryRepository      — local dev / testing; state lives in-process
//
// The active implementation is selected at runtime by getRouterRepository()
// based on whether the Cloudflare bindings are present.
//
// Data stored here:
//   • Router config   (D1: router_config)
//   • Model catalog   (KV: router:active:catalog:<version>)
//   • Route explanations (D1: routing_explanations)
//   • Ingestion runs  (D1: ingestion_runs)
//   • Thread pins     (D1: thread_pins, via D1PinStore)
//
// See infra/d1/schema.sql for table definitions.
// ─────────────────────────────────────────────────────────────────────────────

export {
  getRouterRepository,
  type RouterRepository,
  type IngestionRunSummary,
} from "./storage";
