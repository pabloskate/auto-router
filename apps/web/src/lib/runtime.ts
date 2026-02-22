// ─────────────────────────────────────────────────────────────────────────────
// runtime.ts  (canonical name: runtime-bindings.ts re-exports this)
//
// Reads Cloudflare Worker environment bindings and normalises them into a
// typed RouterRuntimeBindings object.
//
// Priority order for each value:
//   1. Cloudflare context via getCloudflareContext() (OpenNext v3)
//   2. globalThis.cloudflare.env (some OpenNext versions)
//   3. process.env (local dev fallback)
//
// Call getRuntimeBindings() at the top of any route handler.
// Required / optional bindings are documented in .env.example.
// ─────────────────────────────────────────────────────────────────────────────

import type { D1Database, KVNamespace } from "./cloudflare-types";

export interface RouterRuntimeBindings {
  ROUTER_DB?: D1Database;
  ROUTER_KV?: KVNamespace;
  OPENROUTER_API_KEY?: string;
  AA_API_KEY?: string;
  ROUTER_CLASSIFIER_MODEL?: string;
  ADMIN_SECRET?: string;
  SESSION_COOKIE_SECURE?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var AUTO_ROUTER_BINDINGS: RouterRuntimeBindings | undefined;
}

export function getRuntimeBindings(): RouterRuntimeBindings {
  let fromGlobal: any = globalThis.AUTO_ROUTER_BINDINGS;

  // Next.js 15 / OpenNext v3 cloudflare context bindings
  try {
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    if (ctx && ctx.env) {
      fromGlobal = ctx.env;
    }
  } catch (e) {
    // try fallback
  }

  if (!fromGlobal?.ROUTER_KV) {
    // Fallback: sometimes injected to globalThis.cloudflare
    const cf = (globalThis as any).cloudflare;
    if (cf && cf.env) {
      fromGlobal = cf.env;
    }
  }

  return {
    ROUTER_DB: fromGlobal?.ROUTER_DB,
    ROUTER_KV: fromGlobal?.ROUTER_KV,
    OPENROUTER_API_KEY:
      fromGlobal?.OPENROUTER_API_KEY ?? process.env.OPENROUTER_API_KEY ?? process.env.OPENROUTER_KEY,
    AA_API_KEY: fromGlobal?.AA_API_KEY ?? process.env.AA_API_KEY,
    ROUTER_CLASSIFIER_MODEL:
      fromGlobal?.ROUTER_CLASSIFIER_MODEL ?? process.env.ROUTER_CLASSIFIER_MODEL,
    ADMIN_SECRET:
      fromGlobal?.ADMIN_SECRET ?? process.env.ADMIN_SECRET,
    SESSION_COOKIE_SECURE:
      fromGlobal?.SESSION_COOKIE_SECURE ?? process.env.SESSION_COOKIE_SECURE
  };
}
