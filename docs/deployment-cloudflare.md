# Cloudflare Deployment

## Prerequisites

- Cloudflare account with Workers, D1, and KV enabled.
- OpenRouter API key.
- Artificial Analysis API key.

## 1. Create infrastructure

1. Create D1 database named `auto-router`.
2. Create KV namespace for router artifacts and thread pins.
3. Apply schema in `infra/d1/schema.sql`.

## 2. Configure bindings

Update IDs in:

- `apps/web/wrangler.toml`
- `apps/ingest-worker/wrangler.toml`

Set secrets:

- `OPENROUTER_API_KEY`
- `AA_API_KEY`
- `ADMIN_SECRET` (required for privileged router/admin endpoints and worker `/run`)
- `SESSION_COOKIE_SECURE` (`true` in production HTTPS, `false` for local HTTP testing)

## 3. Deploy ingestion worker

- Cron is configured daily at `04:00 UTC`.
- Worker exposes `POST /run` for manual refresh.
- `POST /run` now requires `Authorization: Bearer <ADMIN_SECRET>`.

## 4. Deploy Next.js web app

- Build with OpenNext for Cloudflare and deploy worker output.
- Ensure `ROUTER_DB` and `ROUTER_KV` are bound in the web worker.

## 5. Bootstrap scorecard

- Trigger `POST /api/v1/router/recompute` once after deploy with `Authorization: Bearer <ADMIN_SECRET>`.
- Confirm artifact appears via `GET /api/v1/router/scorecard/current`.

## Runtime behavior

- Routing activates only for `model=auto` or `model=router/auto`.
- Explicit model requests are passed through unchanged.
- First routed call pins model by thread fingerprint for 1 hour.
- Continuations reuse pin unless hard failure or constraint violation.
