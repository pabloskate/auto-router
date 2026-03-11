# Quickstart

This repo is the self-hostable CustomRouter product. The fastest path is local development first, then Cloudflare deployment.

## Local Development

```bash
npm install
cp .env.example .env.local
npm run typecheck
npm run dev -w @auto-router/web
```

Recommended local variables:

- `OPENROUTER_API_KEY` for classifier-backed routing
- `BYOK_ENCRYPTION_SECRET` for stored user upstream credentials (required for BYOK)
- `ADMIN_SECRET` if you want to exercise privileged routes locally

Open `http://localhost:3000/admin`, then:

1. Create an account.
2. Add a gateway or BYOK upstream.
3. Generate a router API key.
4. Send a request to `/api/v1/chat/completions` with `model: "auto"`.

## Cloudflare Deployment

1. Create a D1 database and KV namespace.
2. Apply `infra/d1/schema.sql`, then any migrations in `infra/d1/migrations/`.
3. Configure bindings in `apps/web/wrangler.toml` and `apps/ingest-worker/wrangler.toml`.
4. Deploy the ingest worker.
5. Deploy the web app with OpenNext for Cloudflare.
6. Trigger the initial router recompute.

See [deployment-cloudflare.md](deployment-cloudflare.md) for the full walkthrough.

## API Contract

Supported public endpoints:

- `POST /api/v1/chat/completions`
- `POST /api/v1/responses`
- `GET /api/v1/models`

Admin and user management routes remain self-hostable and are part of the public product.

## What Is Not In This Repo

This repo excludes the hosted landing site, pricing, billing, managed-service operations, backups, alerts, and internal support tooling. Those belong in a separate private system.
