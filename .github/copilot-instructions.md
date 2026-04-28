# CustomRouter Copilot Instructions

Start with `AGENTS.md`, then read the nearest nested `AGENTS.md` for the directory being edited.

Core rules:

- Keep `apps/web/app/api/v1/**/route.ts` files as thin adapters.
- Use shared auth/body helpers from `apps/web/src/lib/auth/route-helpers.ts`.
- Put feature behavior under `apps/web/src/features/<feature>`.
- Keep `packages/core` framework-agnostic and free of app/cloud dependencies.
- Run `npm run test`, `npm run typecheck`, and `npm run build` before release work.
- For auth, admin, gateway, or user-settings changes, verify the browser flow with `BASE_URL=http://localhost:3010 npm run verify:admin`.
