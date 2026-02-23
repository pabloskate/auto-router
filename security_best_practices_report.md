# Security Best Practices Report

Date: 2026-02-23

## Executive Summary

This audit focused on the Next.js/TypeScript web app and Cloudflare worker paths in `apps/web` and `apps/ingest-worker`, plus dependency posture.

I found **4 actionable findings**:
- High: 1
- Medium: 2
- Low: 1

No direct unauthenticated admin bypasses were found in current route handlers. Production dependency audit (`npm audit --omit=dev`) returned **0 known vulnerabilities**.

---

## High Findings

### AR-SEC-001
- Rule ID: `NEXT-AUTH-001`, `NEXT-DOS-001`
- Severity: High
- Location:
  - `apps/web/src/lib/auth.ts:251`
  - `apps/web/app/api/v1/router/config/route.ts:13`
  - `apps/web/app/api/v1/router/catalog/route.ts:13`
  - `apps/web/app/api/v1/router/catalog/[modelId]/route.ts:15`
  - `apps/web/app/api/v1/router/recompute/route.ts:18`
  - `apps/web/app/api/v1/router/runs/route.ts:12`
  - `apps/web/app/api/v1/router/explanations/[requestId]/route.ts:15`
  - `apps/web/app/api/v1/router/kv-debug/route.ts:12`
  - `.env.example:33`
- Evidence:
  - Admin authorization is a single static shared secret check (`verifyAdminSecret`) with no entropy/quality enforcement.
  - Most admin routes gate only on this secret and do not apply per-IP or per-secret attempt throttling.
  - The example env value is a well-known placeholder: `ADMIN_SECRET=change-me-in-production`.
- Impact: If `ADMIN_SECRET` is weak/default or leaked, an attacker gets full admin control (router config, catalog mutation, recompute, debug/operational data reads).
- Fix:
  - Enforce minimum secret quality at startup (length + entropy checks; reject known placeholders).
  - Add rate limiting to all admin-secret-protected routes, not just `/api/v1/admin/verify`.
  - Consider migrating admin auth from a shared static secret to managed identity (session role, Cloudflare Access, or signed JWT).
- Mitigation:
  - Restrict admin routes at edge (IP allowlist/Access policy) until app-level controls are added.
- False positive notes:
  - If every deployment always injects a long random admin secret and admin routes are edge-restricted, practical risk is reduced.

---

## Medium Findings

### AR-SEC-002
- Rule ID: `NEXT-CSRF-001`
- Severity: Medium
- Location:
  - `apps/web/src/lib/csrf.ts:3`
  - `apps/web/app/api/v1/user/me/route.ts:51`
  - `apps/web/app/api/v1/user/keys/route.ts:40`
  - `apps/web/app/api/v1/user/keys/route.ts:96`
  - `apps/web/app/api/v1/auth/logout/route.ts:16`
- Evidence:
  - CSRF helper returns success when `Origin` is missing: `if (!origin) return true;`.
  - State-changing session endpoints rely on this same-origin check.
- Impact: CSRF protection is fail-open for requests without `Origin` (some clients/proxies/privacy modes), weakening defense on session-authenticated mutations.
- Fix:
  - For unsafe methods (`POST/PUT/PATCH/DELETE`), fail closed when `Origin` is missing.
  - Add strict `Referer` fallback validation and/or explicit CSRF token validation.
- Mitigation:
  - Keep `SameSite=Lax` (already set) and add endpoint-specific anti-CSRF tokens for high-value mutations.
- False positive notes:
  - Modern browsers usually send `Origin` on cross-site unsafe requests, so exploitability varies by client behavior.

### AR-SEC-003
- Rule ID: `NEXT-DOS-001`
- Severity: Medium
- Location:
  - `apps/web/src/lib/rate-limit.ts:68`
  - `apps/web/app/api/v1/auth/login/route.ts:13`
  - `apps/web/app/api/v1/auth/signup/route.ts:13`
  - `apps/web/app/api/v1/admin/verify/route.ts:13`
- Evidence:
  - Rate limiter catches any DB/schema failure and returns `allowed: true` (fail-open).
- Impact: During DB migration/outage/error conditions, brute-force protection on auth-sensitive endpoints is silently disabled.
- Fix:
  - Use fail-closed mode for authentication/admin rate limits, or make fail-open behavior explicitly configurable per route.
  - Emit security logs/metrics on limiter failures.
- Mitigation:
  - Enforce backup edge rate limiting independent of app DB state.
- False positive notes:
  - If Cloudflare edge-level limits are strictly enforced, exposure is lower.

---

## Low Findings

### AR-SEC-004
- Rule ID: `NEXT-CSP-001`
- Severity: Low
- Location:
  - `apps/web/next.config.mjs:4`
- Evidence:
  - CSP currently allows inline scripts: `script-src 'self' 'unsafe-inline'`.
- Impact: Browser-side XSS containment is materially weaker than a nonce/hash-based CSP.
- Fix:
  - Move to nonce- or hash-based script policy and remove `'unsafe-inline'` for scripts.
- Mitigation:
  - Keep existing additional headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) while tightening CSP.
- False positive notes:
  - If no inline script execution exists today, this is mainly hardening rather than an active exploit path.

---

## Dependency Notes

- `npm audit --omit=dev --json` (runtime dependencies): **0 vulnerabilities**.
- `npm audit --json` (including dev tooling): 27 issues (mostly eslint/wrangler/vitest/open-next dependency chains). These are lower production risk but should be tracked for CI/build supply-chain hygiene.
