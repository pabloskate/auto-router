# Security Best Practices Report

## Executive Summary

The project has multiple high-impact security gaps on internet-facing routes. The most severe issues are unauthenticated privileged endpoints and an outdated vulnerable `next` runtime (`15.1.4`) with known critical advisories. Combined, these issues can allow unauthorized configuration changes, service abuse/cost amplification, and framework-level exploitation risk.

I found **9 findings** total:
- Critical: 3
- High: 3
- Medium: 2
- Low: 1

---

## Critical Findings

### AR-SEC-001
- Rule ID: `NEXT-AUTH-001`
- Severity: Critical
- Location:
  - `apps/web/app/api/v1/router/config/route.ts:12`
  - `apps/web/app/api/v1/router/catalog/route.ts:11`
  - `apps/web/app/api/v1/router/catalog/[modelId]/route.ts:4`
  - `apps/web/app/api/v1/router/recompute/route.ts:10`
- Evidence:
  - `apps/web/app/api/v1/router/config/route.ts:33` calls `repository.setConfig(parsed.data)` with no auth check.
  - `apps/web/app/api/v1/router/catalog/route.ts:36` calls `repository.setCatalog(...)` with no auth check.
  - `apps/web/app/api/v1/router/catalog/[modelId]/route.ts:19` calls `repository.setCatalog(...)` with no auth check.
  - `apps/web/app/api/v1/router/recompute/route.ts:24` triggers ingestion and writes catalog with no auth check.
- Impact: **Any unauthenticated caller can modify global routing behavior and catalog state for all users.**
- Fix:
  - Require server-side authz for all `/api/v1/router/*` mutating endpoints.
  - Enforce role checks (admin-only) before `setConfig`, `setCatalog`, and recompute actions.
  - Return `401/403` on missing or insufficient privilege.
- Mitigation:
  - Temporarily restrict these routes at Cloudflare (WAF/Access/IP allowlist) until code-level auth is implemented.
- False positive notes:
  - If these routes are intentionally private behind an external access gateway, verify that protection is mandatory in all environments.

### AR-SEC-002
- Rule ID: `NEXT-SUPPLY-001`
- Severity: Critical
- Location:
  - `apps/web/package.json:16`
- Evidence:
  - `next` is pinned to `15.1.4`.
  - `npm audit --omit=dev --json` reports critical advisories affecting this version, including:
    - GHSA-9qr9-h5gf-34mp (RCE in React flight protocol)
    - GHSA-f82v-jwr5-mffw (authorization bypass in middleware)
  - Audit indicates fix available at `15.5.12`.
- Impact: **Known critical vulnerabilities in framework runtime can permit remote compromise or auth bypass.**
- Fix:
  - Upgrade `next` to `>=15.5.12` (or latest supported patched minor).
  - Re-run integration tests and deploy with patched runtime.
- Mitigation:
  - If upgrade cannot be immediate, isolate exposure with strict edge ACLs and reduce public route surface.
- False positive notes:
  - Verify final lockfile actually resolves the patched version across workspaces.

### AR-SEC-003
- Rule ID: `NEXT-AUTH-001`
- Severity: Critical
- Location:
  - `apps/ingest-worker/src/index.ts:140`
- Evidence:
  - `POST /run` executes ingestion (`executeIngestion`) without any authn/authz guard.
- Impact: **Any caller can repeatedly trigger costly ingestion jobs, causing financial abuse and availability degradation.**
- Fix:
  - Require a signed secret (HMAC) or Cloudflare Access/JWT validation for `/run`.
  - Reject unauthorized requests before job execution.
- Mitigation:
  - Disable public routing to `/run` or restrict by IP until authentication is added.
- False positive notes:
  - If the worker is bound only to private/internal routes, verify it is not publicly reachable.

---

## High Findings

### AR-SEC-004
- Rule ID: `NEXT-SESS-002`
- Severity: High
- Location:
  - `apps/web/src/lib/auth.ts:170`
  - `apps/web/src/lib/auth.ts:181`
  - `apps/web/src/lib/auth.ts:194`
  - `apps/web/src/lib/auth.ts:205`
- Evidence:
  - Session token is generated and stored directly in DB as `user_sessions.id`.
  - Session auth uses raw bearer token lookup (`WHERE s.id = ?1`).
- Impact:
  - A DB read leak immediately enables session replay/account takeover until expiry.
- Fix:
  - Store only a hash of session tokens (same pattern as API keys).
  - Compare hashed token on request; rotate tokens on login.
- Mitigation:
  - Shorten session lifetime and implement server-side revocation endpoint.
- False positive notes:
  - If DB is fully isolated and encrypted, residual risk still exists from accidental query/log exposure.

### AR-SEC-005
- Rule ID: `NEXT-DOS-001`
- Severity: High
- Location:
  - `apps/web/app/api/v1/auth/login/route.ts:5`
  - `apps/web/app/api/v1/auth/signup/route.ts:5`
  - `apps/web/app/api/v1/admin/verify/route.ts:4`
- Evidence:
  - No request throttling, lockout, or abuse controls on auth/admin verification endpoints.
- Impact:
  - Enables brute-force and credential-stuffing attempts; increases resource exhaustion risk.
- Fix:
  - Add per-IP and per-identifier rate limiting with exponential backoff.
  - Add lockout/cooldown policies and monitoring alerts.
- Mitigation:
  - Enforce Cloudflare rate-limiting rules immediately.
- False positive notes:
  - If an upstream gateway already rate-limits these routes, validate exact thresholds and coverage.

### AR-SEC-006
- Rule ID: `NEXT-SESS-002`
- Severity: High
- Location:
  - `apps/web/src/components/admin-console.tsx:97`
  - `apps/web/src/components/admin-console.tsx:106`
  - `apps/web/src/components/admin-console.tsx:75`
- Evidence:
  - Session token persisted in `sessionStorage` and read by client JS for Authorization headers.
- Impact:
  - Any successful XSS in origin context can exfiltrate active session tokens.
- Fix:
  - Move session handling to `HttpOnly` + `Secure` + `SameSite` cookies.
  - Keep session tokens inaccessible to browser JS.
- Mitigation:
  - Harden CSP and eliminate inline/eval script vectors while migrating auth transport.
- False positive notes:
  - If app is guaranteed non-browser and no script execution risk exists, impact is reduced (rare for web app deployments).

---

## Medium Findings

### AR-SEC-007
- Rule ID: `NEXT-HEADERS-001`, `NEXT-CSP-001`
- Severity: Medium
- Location:
  - `apps/web/next.config.mjs:2`
- Evidence:
  - No configured security headers/CSP in Next config; no header-setting middleware found.
- Impact:
  - Increases exploitability of XSS/clickjacking and weakens browser-side protections.
- Fix:
  - Add baseline headers (`Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options` or `frame-ancestors`, `Referrer-Policy`).
  - Prefer nonce/hash-based CSP in production.
- Mitigation:
  - Set equivalent headers at Cloudflare edge if app-level changes are delayed.
- False positive notes:
  - If all headers are injected by edge config, verify policy is present and tested in production responses.

### AR-SEC-008
- Rule ID: `NEXT-AUTH-001`
- Severity: Medium
- Location:
  - `apps/web/app/api/v1/router/kv-debug/route.ts:4`
  - `apps/web/app/api/v1/router/runs/route.ts:4`
  - `apps/web/app/api/v1/router/explanations/[requestId]/route.ts:4`
- Evidence:
  - Read-oriented internal/debug endpoints are accessible without authentication.
- Impact:
  - Leaks operational metadata helpful for reconnaissance and abuse tuning.
- Fix:
  - Require authentication/authorization for internal operational endpoints.
  - Disable debug endpoints outside development.
- Mitigation:
  - Restrict route exposure at edge until access control is added.
- False positive notes:
  - If these endpoints are intentionally public, ensure returned data is strictly non-sensitive.

---

## Low Findings

### AR-SEC-009
- Rule ID: `NEXT-AUTH-001`
- Severity: Low
- Location:
  - `apps/web/src/lib/auth.ts:114`
  - `apps/web/src/lib/auth.ts:165`
  - `apps/web/app/api/v1/admin/verify/route.ts:19`
- Evidence:
  - Secret/hash comparisons use direct string equality.
- Impact:
  - Potential timing side-channel exposure (generally low risk over network noise but avoidable).
- Fix:
  - Use constant-time comparison for secret/token/hash checks.
- Mitigation:
  - Keep strong rate limits to reduce practical exploitability.
- False positive notes:
  - For remote-only attackers this is usually lower impact than authz and dependency issues above.

---

## Additional Notes

- `.env.local` contains non-empty API key values in this workspace (`OPENROUTER_API_KEY`, `AA_API_KEY`). I could not verify VCS tracking/history because the directory is not currently a git repository.
- `npm audit --json` reports additional dev-tool advisories (eslint/wrangler/vitest chains). These are lower runtime risk than the production `next` vulnerabilities but should be scheduled for dependency hygiene.

