# CustomRouter Naming Migration Plan

Date: 2026-03-12

## Goal

Standardize naming so humans, agents, and deployment tooling all answer the same questions consistently:

- What is the product called?
- What is the canonical repo/package slug?
- What are the Cloudflare worker/database naming conventions?
- Which identifiers are safe to rename without breaking existing deployments?

## Decision

Use:

- Product name: `CustomRouter`
- slug/package/import/resource name: `custom-router`

This repo now standardizes on:

- npm/workspace scope: `@custom-router/*`
- root package name: `custom-router`

## Current Drift

The repo previously mixed product copy, package names, and Cloudflare resource names. That created ambiguity around whether a string was:

- a marketing/product name
- a repository slug
- a Cloudflare resource name
- a package/import identifier

## Recommended Phases

### Phase 1: Standardize product and deployment docs

Target: low risk, should happen first.

Update docs to define:

- product name: `CustomRouter`
- repo slug: `custom-router`
- Cloudflare naming convention:
  - worker names
  - D1 database names
  - KV namespace labels
  - env examples

Files to update first:

- `README.md`
- `AGENTS.md`
- `docs/quickstart.md`
- `docs/deployment-cloudflare.md`
- `.env.example`

Outcome:

- Agents and operators have one written source of truth before code/config renames start.

### Phase 2: Standardize Cloudflare config names

Target: medium risk, operationally important.

Decide a production-safe convention such as:

- web worker: `custom-router-web`
- ingest worker: `custom-router-ingest-worker`
- local/test D1: `custom-router-test`

Then update:

- `apps/web/wrangler.toml`
- `apps/ingest-worker/wrangler.toml`
- root scripts that call `wrangler d1 execute`
- deployment docs and migration commands

Guardrail:

- Do not silently rename existing production resources.
- Treat this as a config migration with a rollout note.

### Phase 3: Decide whether npm/package slugs should change

Target: higher risk, optional.

If package identifiers ever need another cleanup pass, rename in one coordinated change:

- root package name
- workspace package names
- TS path aliases
- internal imports
- lockfile references
- any external docs/examples that import packages directly

Guardrail:

- Only do this in one coordinated pass.
- Expect churn across many files and downstream breakage if anything imports these packages.

Recommendation:

- Treat package/import renames as an atomic operation whenever they occur.

### Phase 4: GitHub project/repo rename

Target: organizational, moderate risk.

If the GitHub repo should match the product slug, rename the project/repository to `custom-router` once docs and deployment references are ready.

Before doing that:

- inventory hardcoded GitHub URLs
- update `OSS` links in `apps/web/src/lib/constants.ts`
- update security/contact links
- verify badges, release URLs, and docs links

## Proposed Naming Policy

Use the following rule everywhere:

- Title case product references: `CustomRouter`
- URL/config/resource slug references: `custom-router`
- Package scope/import identifiers should remain `@custom-router/*`

## Suggested Execution Order

1. Merge CI and restore green tests.
2. Standardize docs and deployment naming policy.
3. Rename local/test Cloudflare resource names and scripts.
4. Decide whether package/import renames are worth the churn.
5. Rename the GitHub project only after URLs and docs are ready.

## Open Questions

- Do you want the repo slug itself to become `custom-router`, or only the product/deployment naming?
- Do any external systems depend on the old package names and need a migration note?
- Are there existing Cloudflare production resources whose names must remain unchanged?
