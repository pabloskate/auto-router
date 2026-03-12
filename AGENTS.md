# AGENTS.md — AI Agent Navigation Guide

> **Start here.** This file is the authoritative map of this codebase for AI agents and new engineers. Read it before touching any file.

---

## What This Is

CustomRouter is a **highly customizable LLM routing proxy** deployed on Cloudflare Workers. It allows you to build a "composite model" by routing each request to the best underlying model based on:

1. A cheap frontier LLM classifier that reads the user's prompt
2. Thread stickiness (pinning a model for multi-turn conversations)
3. Runtime guardrails that circuit-break underperforming models

The router is **transparent** — it speaks OpenAI's API, so any SDK pointing at it works without modification. Just set `model: "auto"`.

---

## Monorepo Layout

```
/
├── apps/
│   ├── web/              ← Next.js app: API routes + admin UI
│   └── ingest-worker/    ← Cloudflare cron: daily catalog refresh
├── packages/
│   ├── core/             ← Routing engine (framework-agnostic)
│   └── data/             ← OpenRouter catalog adapter
├── docs/                 ← Deployment guide, eval methodology
├── infra/d1/schema.sql   ← D1 database schema
├── .env.example          ← Required env vars (copy to .env.local)
└── AGENTS.md             ← This file
```

---

## Request Flow (happy path)

```
Client
  └─ POST /api/v1/chat/completions
       │
       ├─ [auth]     apps/web/app/api/v1/chat/completions/route.ts
       │               authenticateRequest() → checks API key against D1
       │
       ├─ [route]    apps/web/src/lib/routing/router-service.ts  routeAndProxy()
       │               loads config + catalog from storage/repository.ts
       │               calls RouterEngine.decide()
       │                  └─ packages/core/src/router-engine.ts
       │                       checks thread pin (D1 via D1PinStore)
       │                       if no pin → calls frontier classifier
       │                          └─ apps/web/src/lib/routing/frontier-classifier.ts
       │               builds attempt list (skips guardrail-disabled models)
       │               calls OpenRouter for each attempt
       │               records guardrail event
       │               pins thread on success (if shouldPin)
       │               stores RoutingExplanation in D1
       │
       └─ Response with x-router-* headers attached
```

---

## Key Files — What Each One Does

### `apps/web/src/lib/`

| Path | Responsibility |
|------|---------------|
| `constants.ts` | **All magic numbers.** Guardrail thresholds, auth settings, classifier defaults. Edit here, not inline. |
| `schemas.ts` | Zod schemas for request body validation (chatCompletion, responses, routerConfig). |
| `auth/auth.ts` | API key auth, session auth, password hashing (PBKDF2), cookie building. See constants.ts for config. |
| `auth/route-helpers.ts` | Composable route middleware: `withApiKeyAuth`, `withSessionAuth`, `withCsrf`, `withDb`. Use in route handlers instead of repeating the auth pattern. |
| `auth/rate-limit.ts` | Sliding-window rate limiting via D1. Fails open if schema is not migrated. |
| `auth/csrf.ts` | Same-origin check for browser-facing mutation endpoints. |
| `auth/byok-crypto.ts` | BYOK encryption helpers for storing upstream credentials safely. |
| `auth/user-upstream-store.ts` | Persistence helpers for per-user upstream credentials. |
| `routing/router-service.ts` | Orchestrates one routed request end-to-end (config merge → decide → proxy → guardrail → pin). |
| `routing/guardrail-manager.ts` | In-process circuit breaker per model/provider. Three triggers: error rate, fallback rate, latency spike. |
| `routing/frontier-classifier.ts` | Calls a cheap LLM on OpenRouter to pick the best model. Returns null on any failure. |
| `routing/config-chat.ts` | Conversational config editor for `$$config` sessions. |
| `storage/repository.ts` | `CloudflareRepository` (D1+KV) and `MemoryRepository` (local dev). `getRouterRepository()` auto-selects. |
| `storage/gateway-store.ts` | D1 helpers for user-configured upstream gateways and model catalogs. |
| `storage/defaults.ts` | Default catalog and router config used in local dev / bootstrapping. |
| `upstream/upstream.ts` | OpenAI-compatible upstream transport + URL normalization helpers. |
| `upstream/openrouter.ts` | Thin wrapper that proxies a request to OpenRouter and normalises the result. |
| `upstream/openrouter-models.ts` | Model catalog search and validation against OpenRouter's public models API. |
| `infra/runtime-bindings.ts` | Reads Cloudflare bindings from OpenNext / globalThis / process.env with multiple fallbacks. |
| `infra/http.ts` | `json()` response builder and `attachRouterHeaders()` for x-router-* response headers. |
| `infra/request-id.ts` | Generates `router_<uuid>` IDs used in headers + D1. |
| `infra/cloudflare-types.ts` | Minimal TypeScript types for D1Database and KVNamespace (avoids the full @cloudflare/workers-types dep). |

### `apps/web/app/api/v1/`

Every file is a Next.js route handler. Auth pattern (use route-helpers.ts):

```
GET  /api/v1/user/me           → withSessionAuth
PUT  /api/v1/user/me           → withSessionAuth + withCsrf
POST /api/v1/chat/completions  → withApiKeyAuth
POST /api/v1/responses         → withApiKeyAuth
GET  /api/v1/router/config     → verifyAdminSecret
PUT  /api/v1/router/config     → verifyAdminSecret
```

### `apps/web/src/components/`

| File | Responsibility |
|------|---------------|
| `admin-console.tsx` | Root shell — loads data, wires sub-components together |
| `AuthGate.tsx` | Login / signup form |
| `ApiKeyPanel.tsx` | Generate, list, revoke API keys |
| `RouterConfigPanel.tsx` | Default model, classifier model, routing instructions, blocklist |
| `CatalogEditorPanel.tsx` | Per-user model catalog editor ("constitution") |

### `packages/core/src/`

| File | Responsibility |
|------|---------------|
| `types.ts` | All shared types: RouterConfig, CatalogItem, RouteDecision, RoutingExplanation, etc. |
| `router-engine.ts` | `RouterEngine.decide()` — stateless routing decision logic (pin check → classifier → fallback) |
| `llm-router.ts` | Interface and helpers for the pluggable LLM classifier |
| `pin-store.ts` | `PinStore` interface + `InMemoryPinStore` |
| `index.ts` | Barrel export |

### `packages/data/src/`

Adapts OpenRouter's catalog API into `CatalogItem[]` that the router engine understands. Only used by the ingest-worker.

---

## Where Constants Live

**All magic numbers are in `apps/web/src/lib/constants.ts`.** Do not add literals to other files.

```
GUARDRAIL.*    — circuit breaker thresholds (error rate, fallback rate, latency)
AUTH.*         — PBKDF2 iterations, session TTL, cookie name, API key prefix
CLASSIFIER.*   — default model, temperature, max_tokens, OpenRouter URL
```

---

## Database (D1) — Table Summary

See `infra/d1/schema.sql` for full DDL.

| Table | Purpose |
|-------|---------|
| `users` | User accounts (name, email, hashed password, per-user router config) |
| `api_keys` | API keys (hash only, never raw), linked to users |
| `user_sessions` | HttpOnly session tokens (hash only) |
| `router_config` | Versioned system-wide router config blobs |
| `routing_explanations` | One row per routed request, queried by `/explanations/:id` |
| `ingestion_runs` | History of catalog ingest jobs |
| `thread_pins` | Active model pins per thread key |
| `rate_limit_counters` | Sliding window counters for IP rate limiting |

KV namespace (`ROUTER_KV`):
- `router:active:meta` → `{ version: string }`
- `router:active:catalog:<version>` → `CatalogItem[]` JSON blob

---

## Adding a New API Route

1. Create `apps/web/app/api/v1/<resource>/route.ts`
2. Use `route-helpers.ts` for auth — do not repeat the pattern inline:
   ```ts
   export async function GET(request: Request) {
     return withSessionAuth(request, async (auth, bindings) => {
       return json({ ... });
     });
   }
   ```
3. Validate the request body with a Zod schema from `schemas.ts`
4. Use `getRouterRepository()` for D1/KV access

---

## Adding a New Guardrail Trigger

All guardrail logic is in `apps/web/src/lib/routing/guardrail-manager.ts`. Thresholds are in `constants.ts`. Add a new trigger by:

1. Adding a constant to `GUARDRAIL` in `constants.ts`
2. Computing the metric in `recordEvent()` in `routing/guardrail-manager.ts`
3. Setting `disableByNew = ...` and OR-ing it into the final `if` statement

---

## Local Development

```bash
npm install
npm run typecheck
npm run dev -w @auto-router/web   # starts Next.js on localhost:3000

# Without Cloudflare bindings, the app uses MemoryRepository.
# Data resets on server restart. That's fine for UI development.
```

Copy `.env.example` → `.env.local` and fill in `OPENROUTER_API_KEY`.

---

## Tests

```bash
npm run test -w @auto-router/core
npm run test -w @auto-router/web
```

Core tests live in `packages/core/test/`. They cover `RouterEngine` and thread fingerprinting.
Web tests live alongside the app code under `apps/web/app/api/v1/`, `apps/web/src/lib/routing/`, and `apps/web/src/components/`.

---

## Deployment

See `docs/deployment-cloudflare.md`.
