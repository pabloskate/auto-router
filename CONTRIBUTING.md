# Contributing

Thanks for contributing to CustomRouter.

## Ground Rules

- Keep the public API contract stable unless the change is intentional and documented.
- Do not add hosted-only behavior to the open-source router path.
- Keep routing logic in `packages/core` when it is reusable across deployments.
- Put new magic numbers in `apps/web/src/lib/constants.ts`.
- Document schema changes in `infra/d1/migrations` and user-visible changes in `CHANGELOG.md`.

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run typecheck
npm run dev -w @auto-router/web
```

Without Cloudflare bindings, the app falls back to the in-memory repository for local UI work.

## Verification

Run the smallest relevant set before opening a PR:

```bash
npm run test
npm run typecheck
npm run build
```

If you change routes, auth, or deployment behavior, also test the flow manually in `apps/web`.

## Pull Requests

- Keep PRs scoped to one change or one release concern.
- Call out API, schema, or deployment changes clearly in the PR description.
- Include migration steps if D1 schema or runtime bindings changed.
- Update `README.md`, `docs/`, or `CHANGELOG.md` when the behavior is user-facing.

## Commercial Boundary

This repo is the source of truth for the self-hostable product. Marketing, billing, hosted operations, and support tooling belong outside the public codebase.
