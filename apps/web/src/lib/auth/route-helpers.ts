// ─────────────────────────────────────────────────────────────────────────────
// route-helpers.ts
//
// Composable helpers for Next.js route handlers. Every route that needs auth,
// a DB connection, or CSRF protection should use these instead of duplicating
// the pattern inline.
//
// Usage example:
//
//   export async function GET(request: Request) {
//     return withSessionAuth(request, async (auth, bindings) => {
//       return json({ user: auth.userId });
//     });
//   }
// ─────────────────────────────────────────────────────────────────────────────

import { authenticateRequest, authenticateSession, type AuthResult } from "./auth";
import { isSameOriginRequest } from "./csrf";
import { json } from "../infra/http";
import { getRuntimeBindings, type RouterRuntimeBindings } from "../infra/runtime-bindings";

// ── withDb ────────────────────────────────────────────────────────────────────
// Guards against misconfigured deployments where ROUTER_DB isn't bound.

export async function withDb<T>(
  handler: (bindings: RouterRuntimeBindings & { ROUTER_DB: NonNullable<RouterRuntimeBindings["ROUTER_DB"]> }) => Promise<T>
): Promise<T | Response> {
  const bindings = getRuntimeBindings();
  if (!bindings.ROUTER_DB) {
    return json({ error: "Server misconfigured: missing database binding." }, 500);
  }
  return handler(bindings as RouterRuntimeBindings & { ROUTER_DB: NonNullable<RouterRuntimeBindings["ROUTER_DB"]> });
}

// ── withApiKeyAuth ────────────────────────────────────────────────────────────
// For public API endpoints authenticated via Bearer API key.
// Use on: POST /api/v1/chat/completions, POST /api/v1/responses

export async function withApiKeyAuth(
  request: Request,
  handler: (auth: AuthResult, bindings: RouterRuntimeBindings) => Promise<Response>
): Promise<Response> {
  const bindings = getRuntimeBindings();
  if (!bindings.ROUTER_DB) {
    return json({ error: "Server misconfigured: missing database binding." }, 500);
  }
  const auth = await authenticateRequest(request, bindings.ROUTER_DB);
  if (!auth) {
    return json({ error: "Unauthorized. Provide a valid API key via Authorization: Bearer <key>." }, 401);
  }
  return handler(auth, bindings);
}

// ── withSessionAuth ───────────────────────────────────────────────────────────
// For browser/UI endpoints authenticated via session cookie.
// Use on: GET/PUT /api/v1/user/*, GET /api/v1/user/keys

export async function withSessionAuth(
  request: Request,
  handler: (auth: AuthResult, bindings: RouterRuntimeBindings) => Promise<Response>
): Promise<Response> {
  const bindings = getRuntimeBindings();
  if (!bindings.ROUTER_DB) {
    return json({ error: "Server misconfigured: missing database binding." }, 500);
  }
  const auth = await authenticateSession(request, bindings.ROUTER_DB);
  if (!auth) {
    return json({ error: "Unauthorized." }, 401);
  }
  return handler(auth, bindings);
}

// ── withCsrf ──────────────────────────────────────────────────────────────────
// Wraps a handler with a same-origin check. Compose with withSessionAuth for
// state-mutating browser endpoints (PUT, POST, DELETE from the UI).

export function withCsrf(
  request: Request,
  handler: () => Promise<Response>
): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return Promise.resolve(json({ error: "Invalid origin." }, 403));
  }
  return handler();
}
