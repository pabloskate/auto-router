# Release Process

The public repo is the source of truth for product releases. Hosted deployments should consume tagged public releases instead of a long-lived private fork.

## Before a Release

1. Update `CHANGELOG.md`.
2. Add any required D1 migrations under `infra/d1/migrations/`.
3. Update docs when setup, deployment, or public behavior changed.
4. Run:

```bash
npm run test
npm run typecheck
npm run build
```

5. For auth, admin UI, gateways, user settings, or local setup changes, also run:

```bash
npm run local:stable
BASE_URL=http://localhost:3010 npm run verify:admin
```

6. Run `npm run doctor:agent` before handing the release to another agent or operator.

## Tagging

- Tag releases from the public repo.
- Keep versioning simple and monotonic while the project is in `0.x`.
- Do not ship hosted-only API drift outside the public release stream.

## Migration Policy

- Every schema change must ship with an idempotent migration file.
- Release notes must call out migration requirements explicitly.
- Hosted upgrades should use the same migration files published here.

## Hosted Deployment Policy

- The managed BYOK service should pin public tags or release commits from this repo.
- Private infrastructure code may wrap the product, but it should not fork router behavior without an upstream plan.
- If a hosted-only operational patch is required, upstream it back into the public repo quickly or document why it cannot be shared.
