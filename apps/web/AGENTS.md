# apps/web Agent Guide

This directory contains the Next.js app, API route adapters, admin UI, and Cloudflare Worker deployment.

## Start Points

- Architecture source of truth: `../../docs/ARCHITECTURE.md`
- Route adapters: `app/api/v1/**/route.ts`
- Feature behavior: `src/features/**`
- Shared primitives: `src/lib/**`
- D1/Cloudflare bindings: `src/lib/infra/**`
- Storage adapters: `src/lib/storage/**`

## Route Rules

- Keep route files thin.
- Use helpers from `src/lib/auth/route-helpers.ts`.
- Routed OpenAI-compatible routes must use `createRoutedEndpoint`.
- Move parsing/business behavior into `src/features/<feature>/server/*` when a route grows beyond wiring.

## Feature Rules

- Prefer feature-owned contracts from `src/features/*/contracts.ts`.
- Do not redefine DTOs inside UI components.
- Treat `src/components/admin/*` as compatibility/presentation unless the file is clearly a real component.
- For routing changes, read `src/features/routing/server/README.md` first.

## Verification

For web changes:

```bash
npm run test -w @custom-router/web
npm run typecheck -w @custom-router/web
```

For auth, admin UI, gateways, or user settings:

```bash
npm run local:stable
BASE_URL=http://localhost:3010 npm run verify:admin
```
