// ─────────────────────────────────────────────────────────────────────────────
// request-id.ts
//
// Generates short, collision-resistant IDs used to correlate a routed request
// across logs, response headers (x-router-request-id), and the explanations
// table in D1.
//
// Format:  <prefix>_<uuid>   e.g. router_550e8400-e29b-41d4-a716-446655440000
// Fallback (no crypto.randomUUID): <prefix>_<timestamp>_<random hex>
// ─────────────────────────────────────────────────────────────────────────────

export { requestId } from "./ids";
