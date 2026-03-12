# Cloudflare Deployment

## Prerequisites

- Cloudflare account with Workers, D1, and KV enabled.

## 1. Create infrastructure

1. Create D1 database named `custom-router`.
2. Create KV namespace for router artifacts and thread pins.
3. Apply schema in `infra/d1/schema.sql`.
4. **After deploying new versions**: Run any migrations in `infra/d1/migrations/` if the schema changed.

## 2. Configure bindings

Update IDs in:

- `apps/web/wrangler.toml`
- `apps/ingest-worker/wrangler.toml`

Set secrets:

- `ADMIN_SECRET` (required for privileged router/admin endpoints and worker `/run`)
- `BYOK_ENCRYPTION_SECRET` (required if users will save gateway or classifier BYOK credentials)
- `SESSION_COOKIE_SECURE` (`true` in production HTTPS, `false` for local HTTP testing)
- `REGISTRATION_MODE` (optional, default `closed`) — controls who can create accounts:
  - `closed` — no signups (first user always allowed for initial setup)
  - `invite` — signup requires an invite code from an existing user
  - `open` — anyone can sign up

Important:

- `BYOK_ENCRYPTION_SECRET` must stay stable across deployments.
- If you change or remove it after users have saved gateway keys, those stored encrypted keys can no longer be decrypted.
- In that case, users must re-save their gateways and any stored classifier BYOK key in the admin console.

## 3. Deploy ingestion worker

- Cron is configured daily at `04:00 UTC` (catalog ingestion is disabled; app is BYOK-only).
- Worker exposes `POST /run` for manual refresh.
- `POST /run` requires `Authorization: Bearer <ADMIN_SECRET>`.

## 4. Deploy Next.js web app

- Build with OpenNext for Cloudflare and deploy worker output.
- Ensure `ROUTER_DB` and `ROUTER_KV` are bound in the web worker.

## Migrations

When the schema changes, run migrations against your production D1 database:

```bash
# From project root (ensure wrangler is logged in: wrangler login)
npx wrangler d1 execute custom-router --remote --file=infra/d1/migrations/001_add_show_model_in_response.sql --config apps/web/wrangler.toml
npx wrangler d1 execute custom-router --remote --file=infra/d1/migrations/002_add_user_gateways.sql --config apps/web/wrangler.toml
```

If a migration was already applied, you may see a "duplicate column name" or "table already exists" error — that's fine, both migrations use `IF NOT EXISTS` / `ADD COLUMN` guards.

## Runtime behavior

- Routing activates only for `model=auto` or `model=router/auto`.
- Explicit model requests are passed through unchanged.
- First routed call pins model by thread fingerprint for 1 hour.
- Continuations reuse pin unless hard failure or constraint violation.
