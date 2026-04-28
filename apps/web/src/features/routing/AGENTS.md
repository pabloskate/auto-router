# Routing Feature Agent Guide

This feature owns runtime routing seams, profile editing, setup recommendations, and routed endpoint contracts.

## Runtime Path

Use this order when debugging a routed request:

1. `server/create-routed-endpoint.ts`
2. `../../lib/routing/router-service.ts`
3. `server/router-context.ts`
4. `server/router-classifier-context.ts`
5. `server/router-decision.ts`
6. `packages/core/src/router-engine.ts`
7. `server/router-attempts.ts`
8. `server/router-upstream-execution.ts`
9. `server/router-persistence.ts`

## Ownership Rules

- `router-service.ts` should orchestrate only. Put new routing mechanics in `server/*`.
- Runtime routing must use saved profiles plus live gateway inventory.
- Model registry and profile-builder knowledge are setup aids, not execution truth.
- Profile UI state belongs in `components/useRoutingProfilesEditor.ts`; shared pure helpers belong in `profiles-editor-utils.ts`.

## Required Tests

Run the closest test first, then the web suite:

```bash
npm run test -w @custom-router/web -- src/lib/routing/router-service.test.ts
npm run test -w @custom-router/web -- src/features/routing/server
npm run test -w @custom-router/web
```
