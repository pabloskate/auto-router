# packages/core Agent Guide

`packages/core` is the framework-agnostic routing engine. It must not depend on Next.js, Cloudflare, D1, KV, HTTP, or app-local feature modules.

## Public Surface

- `src/types.ts`: shared routing types and contracts.
- `src/router-engine.ts`: top-level `RouterEngine.decide()` entrypoint.
- `src/router-engine/*`: focused decision helpers.
- `src/threading.ts`: thread fingerprinting and pin-key behavior.
- `src/routing-policy.ts`: shared routing policy helpers.
- `src/pin-store.ts`: pin store interface and in-memory implementation.

## Rules

- Keep inputs plain and serializable.
- Keep side effects behind injected interfaces such as `PinStore` and classifier functions.
- Add tests under `test/` for any routing, pinning, fallback, or reasoning-policy change.
- Do not import from `apps/web`.

## Verification

```bash
npm run test -w @custom-router/core
npm run typecheck -w @custom-router/core
```
