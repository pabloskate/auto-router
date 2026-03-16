# Local Dev Troubleshooting

This guide covers the most common "it works in prod but local is broken" issues for `apps/web`.

## Fast Recovery (Use This First)

If local UI/auth is flaky, unstyled, or buttons stop responding:

```bash
# One-command stable localhost reset + start
npm run local:stable

# Required proof step before saying "localhost works"
BASE_URL=http://localhost:3010 npm run verify:admin
```

Then open `http://localhost:3010/admin`.

## Why This Happens

The most disruptive local failure mode is a **build artifact mismatch**:

- `next start` is running from an older build
- later, a new `next build` replaces `.next` files
- the running server references stale chunk IDs
- browser receives missing/invalid chunks (often `400` or `404`)
- hydration fails, so tabs/buttons appear unresponsive

You may also see errors like:

- `Cannot find module './<id>.js'` from `.next/server/webpack-runtime.js`
- `/_next/static/chunks/...` returning non-200 status

## Known Symptoms and Meaning

- **Sign-in button stays disabled even after typing**
  - Usually hydration failed due to chunk mismatch or blocked scripts.
- **Page appears unstyled**
  - CSS asset under `/_next/static/css/...` is not being served correctly.
- **"Server misconfigured" on login/signup**
  - `ROUTER_DB` binding missing locally; run `npm run db:seed`.
- **Registration closed locally**
  - Local DB already has users and mode is closed by default.

## Stable Local Workflow

Use one mode at a time:

1. **Iterating on code quickly:** `next dev`
2. **Validating behavior reliably:** `next build` + `next start`

Do not keep old `next start` running while rebuilding.

Recommended loop for reliable auth/UI checks:

```bash
npm run local:stable
BASE_URL=http://localhost:3010 npm run verify:admin
```

`verify:admin` validates real UI login and fails if the login button remains disabled (hydration/CSP failure mode).

## Port Confusion Checklist

If `3000` is occupied, Next picks another port automatically.

- Check terminal output for actual local URL.
- Use that exact URL (`3010`, `3003`, etc.), not a previously used one.
- Avoid running multiple app instances unless intentionally testing that.

## Quick Verification Commands

```bash
# Admin page responds
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3010/admin

# Registration status responds
curl -sS http://localhost:3010/api/v1/auth/registration-status

# Auth with cookie round-trip (replace credentials)
COOKIE_JAR=$(mktemp)
curl -sS -c "$COOKIE_JAR" -H "content-type: application/json" \
  -d '{"email":"local.debug@example.com","password":"LocalPass123!"}' \
  http://localhost:3010/api/v1/auth/login
curl -sS -b "$COOKIE_JAR" http://localhost:3010/api/v1/user/me

# Full UI login proof (preferred)
BASE_URL=http://localhost:3010 npm run verify:admin
```

## Dev Mode Note

Some environments/extensions can interfere with `next dev` script execution behavior. If local dev UI becomes inconsistent, use the production-mode local flow above as the source of truth for functional verification.
