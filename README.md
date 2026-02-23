# Auto Router v1

Transparent OpenRouter routing with benchmark-aware scorecards, first-call-only routing, and thread stickiness.

## Monorepo Layout

- `apps/web`: Next.js API + minimal admin UI.
- `apps/ingest-worker`: Cloudflare Cron worker for daily scorecard refresh.
- `packages/core`: routing engine, classifier, stickiness policy.
- `packages/data`: Artificial Analysis + OpenRouter adapters and artifact builder.
- `infra/d1/schema.sql`: D1 schema.

## Compatibility Contract

- OpenAI-compatible endpoints:
  - `POST /api/v1/chat/completions`
  - `POST /api/v1/responses`
- Router opt-in only when `model=auto` or `model=router/auto`.
- No required custom fields.

### BYOK (per account, no custom headers)

Each user connects their own OpenRouter (or compatible) key once in the admin UI.
After that, clients like Cursor can call your OpenAI-compatible endpoints normally:

- `POST /api/v1/chat/completions`
- `POST /api/v1/responses`

with `model: "auto"` and your router API key only.

If a user has not connected BYOK, routed requests fail with `400` instead of falling back to server credits.

## Key Features

- Weighted model scoring by category (`coding`, `math`, `general`, `long_context`, `creative`).
- Daily ingestion from Artificial Analysis + OpenRouter catalog.
- Manual AA->OpenRouter mapping overrides in router config.
- Explainability endpoint: `GET /api/v1/router/explanations/:request_id`.
- 1-hour thread pinning to avoid rerouting every agent step.
- Privileged router/admin endpoints require `Authorization: Bearer <ADMIN_SECRET>`.
- UI auth uses HttpOnly session cookies (no client-side token storage).

## Local Development

```bash
npm install
npm run typecheck
npm run dev -w @auto-router/web
```

Copy `.env.example` to `.env.local` (or set secrets in Cloudflare bindings).

## Tests

```bash
npm run test -w @auto-router/core
```

## Cloudflare Deploy

See `docs/deployment-cloudflare.md`.
