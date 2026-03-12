// ─────────────────────────────────────────────────────────────────────────────
// registration-gate.ts
//
// Determines whether a signup attempt is allowed based on the
// REGISTRATION_MODE env var. The first user is always allowed regardless
// of mode so that initial instance setup works.
// ─────────────────────────────────────────────────────────────────────────────

import type { D1Database } from "../infra/cloudflare-types";
import { REGISTRATION, type RegistrationMode } from "../constants";

export function resolveRegistrationMode(envValue?: string): RegistrationMode {
  if (envValue && (REGISTRATION.MODES as readonly string[]).includes(envValue)) {
    return envValue as RegistrationMode;
  }
  return REGISTRATION.DEFAULT_MODE;
}

export async function isFirstUser(db: D1Database): Promise<boolean> {
  const row = await db
    .prepare("SELECT COUNT(*) as cnt FROM users")
    .first<{ cnt: number }>();
  return (row?.cnt ?? 0) === 0;
}

export interface RegistrationCheck {
  allowed: boolean;
  reason?: string;
  requiresInviteCode: boolean;
}

export async function checkRegistration(args: {
  db: D1Database;
  mode: RegistrationMode;
  inviteCode?: string;
}): Promise<RegistrationCheck> {
  // First-user bypass: always allow when no users exist
  if (await isFirstUser(args.db)) {
    return { allowed: true, requiresInviteCode: false };
  }

  switch (args.mode) {
    case "open":
      return { allowed: true, requiresInviteCode: false };

    case "closed":
      return {
        allowed: false,
        reason: "Registration is closed.",
        requiresInviteCode: false,
      };

    case "invite":
      if (!args.inviteCode) {
        return {
          allowed: false,
          reason: "An invite code is required to sign up.",
          requiresInviteCode: true,
        };
      }
      // Actual invite code validation is deferred to the caller (signup route)
      // so that consumption happens atomically with user creation.
      return { allowed: true, requiresInviteCode: true };
  }
}
