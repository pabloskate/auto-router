# packages/data Agent Guide

`packages/data` adapts provider catalogs into `CatalogItem[]` values consumed by CustomRouter.

## Rules

- Keep provider API details here, not in `packages/core`.
- Use `@custom-router/core` types for normalized catalog output.
- Do not import from `apps/web`.
- Treat provider response shapes as untrusted input.

## Verification

```bash
npm run typecheck -w @custom-router/data
```
