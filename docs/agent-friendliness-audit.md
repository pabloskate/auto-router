# Agent-Friendliness Audit

Date: 2026-03-12

Status: historical audit. Several findings have since been addressed. Use `docs/ARCHITECTURE.md`, root `AGENTS.md`, and the scoped `AGENTS.md` files as the current source of truth.

## Goal

Assess whether the repo is easy for an AI agent or a new engineer to navigate, change safely, and deploy without hidden context.

## Executive Summary

The repo is better than average for agent work in three ways:

- `AGENTS.md` gives a real architectural map instead of a placeholder.
- Core files generally have strong inline comments.
- Runtime concerns are split into sensible domains (`auth`, `routing`, `storage`, `upstream`, `infra`).

The biggest problems are not code quality so much as **operational drift**:

1. The repo advertises a clean release/deploy path, but the current safety checks are already out of sync.
2. Naming and deployment identifiers drifted between the product name and the slug used in packages/config.
3. Route conventions are documented as standard, but many real routes bypass the standard helpers.
4. Important context lives in large files and inline patterns instead of a few strongly enforced seams.
5. Workspace noise from generated/local artifacts makes broad file discovery less reliable.

## Findings

### 1. The repo’s main safety signal is broken

`npm run typecheck` passes, but `npm run test` currently fails because the admin tab tests no longer match the actual base tab list.

- Test expects no `invites` tab:
  - `apps/web/src/components/admin/admin-tabs.test.ts`
- Actual base tabs include `invites`:
  - `apps/web/src/components/admin/admin-tabs.tsx`

Impact:

- Agents cannot trust the advertised “run tests before release” path.
- Any future UI/admin changes will feel riskier because the red test suite may hide real regressions.

Recommended fix:

- Repair the failing test immediately.
- Add a minimal CI workflow that runs `npm run test`, `npm run typecheck`, and `npm run build` on every PR/push.

### 2. Product naming and deployment identifiers are inconsistent

The repo mixes at least three identities:

- npm/workspace identity: `custom-router`
- product/UI/docs identity: `CustomRouter`
- Cloudflare resource identity: `custom-router`

Examples:

- Root package name and local DB seed script now use `custom-router` / `custom-router-test`
- README and UI use `CustomRouter`
- Deployment docs tell operators to create a D1 database named `custom-router`
- Wrangler files should point at `custom-router-test` alongside `custom-router-*` worker names

Impact:

- Harder for agents to answer basic questions like “what is the canonical app name?”
- Higher chance of deploying against the wrong database or copying the wrong example command.
- Search is less reliable because terms do not converge on one source of truth.

Recommended fix:

- Pick one canonical slug and document it explicitly:
  - product name
  - repo/package slug
  - Cloudflare worker name
  - D1/KV naming convention
- Add a short `docs/naming.md` or a “Naming Conventions” section to `README.md`.

### 3. Route conventions exist, but they are not actually enforced

`AGENTS.md` and `route-helpers.ts` say routes should use the helper layer for auth/DB/CSRF. In practice, many routes still inline their own variants of the pattern.

Examples:

- Helpers define the standard path:
  - `apps/web/src/lib/auth/route-helpers.ts`
- Inline auth/DB flow in chat route:
  - `apps/web/app/api/v1/chat/completions/route.ts`
- Inline admin guard in router config route:
  - `apps/web/app/api/v1/router/config/route.ts`
- Inline session + CSRF + body parsing logic in user settings route:
  - `apps/web/app/api/v1/user/me/route.ts`

Impact:

- Agents cannot assume one route pattern and apply it safely everywhere.
- Error message wording and failure behavior drift over time.
- Small auth changes require touching many handlers instead of one seam.

Recommended fix:

- Finish the abstraction:
  - add `withAdminAuth`
  - add a browser-session variant for same-origin playground/testing
  - optionally add `parseJsonBody(schema)` helper
- Update existing routes to use the helpers consistently.
- Add a lint rule or a review rule: no direct `authenticateSession` / `authenticateRequest` inside route handlers unless justified.

### 4. The implementation map is good, but the actual file surface has outgrown it

`AGENTS.md` is useful, but it no longer reflects the full surface area an agent will hit in real work.

Examples missing or underrepresented:

- `InviteCodePanel.tsx`
- `GatewayPanel.tsx`
- `PlaygroundPanel.tsx`
- user gateway routes under `apps/web/app/api/v1/user/gateways/`
- config-agent-related fields now present in `/api/v1/user/me`

Impact:

- Agents still have to fall back to repository-wide search for common admin tasks.
- The documented “where things live” guide is no longer enough for changes touching the admin console or user settings.

Recommended fix:

- Expand `AGENTS.md` to cover:
  - the admin tab system (`admin-tabs.tsx`, `admin-tab-registry.ts`, `admin-extensions.ts`)
  - gateway management routes and storage
  - invite flow
  - playground flow
  - config-agent settings

### 5. Large orchestration files concentrate too much implicit context

Two files in particular carry a lot of unrelated responsibility:

- `apps/web/src/lib/routing/router-service.ts` (~782 lines)
- `apps/web/src/lib/storage/repository.ts` (~352 lines)

`router-service.ts` currently owns:

- routing orchestration
- classifier timing
- attempt ordering
- thread-pin behavior
- phase-signal injection
- tool-call detection
- response rewriting
- upstream retry/fallback handling
- explanation persistence

Impact:

- Harder for agents to make local changes without unintended side effects.
- More likely that a narrowly scoped edit misses a coupled behavior elsewhere in the same file.
- Review becomes slower because “find the right seam” is not obvious.

Recommended fix:

- Split `router-service.ts` into focused modules, for example:
  - `router-attempts.ts`
  - `router-phase-signal.ts`
  - `router-response-rewrite.ts`
  - `router-upstream-execution.ts`
- Keep `routeAndProxy()` as the top-level orchestrator only.

### 6. Release process is documented, but not automated

The release docs say to run:

- `npm run test`
- `npm run typecheck`
- `npm run build`

There is currently no repo-local CI workflow enforcing that path, and one of those commands already fails today.

Impact:

- “Seamless deploy” depends on humans remembering the checklist.
- Drift between docs and reality can survive until a deploy attempt.

Recommended fix:

- Add CI for test/typecheck/build.
- Add a preview/deploy smoke step for the web worker if feasible.
- Fail releases when migrations changed without docs or changelog updates.

### 7. Local/generated artifacts reduce search quality

The workspace currently contains local/generated noise alongside source:

- `apps/web/.next/`
- `apps/web/.open-next/`
- `apps/web/.env.local`
- `scripts/verify-*.png`
- `scripts/verify-admin-failure.html`

Impact:

- Broad file scans become noisy.
- Agents may accidentally inspect generated output instead of source.
- Review context is less clean because screenshots and failure dumps linger in-tree.

Recommended fix:

- Keep these out of the working tree when possible.
- Add a short “safe search targets” note to `AGENTS.md`:
  - prefer `apps/web/app`, `apps/web/src`, `packages/*/src`, `docs`, `infra`
  - ignore `.next`, `.open-next`, `.wrangler`, screenshot dumps

## What Is Easy To Find

- Request routing path from API entrypoint to router engine
- Runtime binding lookup
- Constants and defaults
- Core routing types
- D1 schema location

## What Is Still Confusing

- Canonical app name and deployment slug
- Whether the public deployment path is fully working today without repo-specific cleanup
- Which route auth pattern is the real standard versus historical leftovers
- Whether ingest worker behavior is still central, optional, or partially deprecated
- Whether admin tabs are meant to be extensible or just locally configurable

## Highest-Value Next Steps

1. Fix the failing admin tab tests so the repo returns to a green baseline.
2. Standardize naming across package metadata, docs, wrangler config, and deployment commands.
3. Enforce one route-helper pattern across all API handlers.
4. Expand `AGENTS.md` to match the current admin/gateway/invite/config-agent surface.
5. Add CI so release docs describe an enforced path instead of a best-effort checklist.
