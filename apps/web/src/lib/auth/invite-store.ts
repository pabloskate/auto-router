// ─────────────────────────────────────────────────────────────────────────────
// invite-store.ts
//
// CRUD operations for invite codes. Follows the same lazy-DDL pattern as
// user-upstream-store.ts: the table is created on first access so existing
// deployments pick it up without a manual migration.
// ─────────────────────────────────────────────────────────────────────────────

import type { D1Database } from "../infra/cloudflare-types";
import { REGISTRATION } from "../constants";

export interface InviteCode {
  id: string;
  code: string;
  createdBy: string;
  usesRemaining: number;
  expiresAt: string;
  createdAt: string;
}

// ── Lazy table creation ─────────────────────────────────────────────────────

const ENSURE_SQL = `
CREATE TABLE IF NOT EXISTS invite_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  uses_remaining INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

const ENSURE_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
`;

let ensurePromise: Promise<void> | null = null;

export function ensureInviteCodesTable(db: D1Database): Promise<void> {
  if (ensurePromise) return ensurePromise;
  ensurePromise = db
    .prepare(ENSURE_SQL)
    .run()
    .then(() => db.prepare(ENSURE_INDEX_SQL).run())
    .then(() => undefined)
    .catch((err) => {
      ensurePromise = null;
      throw err;
    });
  return ensurePromise;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateInviteCode(): string {
  const bytes = new Uint8Array(REGISTRATION.INVITE_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── CRUD ────────────────────────────────────────────────────────────────────

export async function createInviteCode(
  db: D1Database,
  args: { createdBy: string; uses?: number; expiresInMs?: number }
): Promise<InviteCode> {
  await ensureInviteCodesTable(db);

  const id = crypto.randomUUID();
  const code = generateInviteCode();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + (args.expiresInMs ?? REGISTRATION.DEFAULT_EXPIRES_MS)
  );

  const invite: InviteCode = {
    id,
    code,
    createdBy: args.createdBy,
    usesRemaining: args.uses ?? REGISTRATION.DEFAULT_USES,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
  };

  await db
    .prepare(
      `INSERT INTO invite_codes (id, code, created_by, uses_remaining, expires_at, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
    )
    .bind(invite.id, invite.code, invite.createdBy, invite.usesRemaining, invite.expiresAt, invite.createdAt)
    .run();

  return invite;
}

export async function validateAndConsumeInviteCode(
  db: D1Database,
  code: string
): Promise<{ valid: true } | { valid: false; reason: string }> {
  await ensureInviteCodesTable(db);

  const now = new Date().toISOString();
  const row = await db
    .prepare("SELECT id, uses_remaining, expires_at FROM invite_codes WHERE code = ?1 LIMIT 1")
    .bind(code)
    .first<{ id: string; uses_remaining: number; expires_at: string }>();

  if (!row) return { valid: false, reason: "Invalid invite code." };
  if (row.expires_at < now) return { valid: false, reason: "Invite code has expired." };
  if (row.uses_remaining <= 0) return { valid: false, reason: "Invite code has no remaining uses." };

  // Decrement uses (delete if it reaches 0)
  if (row.uses_remaining === 1) {
    await db.prepare("DELETE FROM invite_codes WHERE id = ?1").bind(row.id).run();
  } else {
    await db
      .prepare("UPDATE invite_codes SET uses_remaining = uses_remaining - 1 WHERE id = ?1")
      .bind(row.id)
      .run();
  }

  return { valid: true };
}

export async function listInviteCodes(
  db: D1Database,
  userId: string
): Promise<InviteCode[]> {
  await ensureInviteCodesTable(db);

  const { results } = await db
    .prepare(
      `SELECT id, code, created_by, uses_remaining, expires_at, created_at
       FROM invite_codes WHERE created_by = ?1 ORDER BY created_at DESC`
    )
    .bind(userId)
    .all<{
      id: string;
      code: string;
      created_by: string;
      uses_remaining: number;
      expires_at: string;
      created_at: string;
    }>();

  return results.map((r) => ({
    id: r.id,
    code: r.code,
    createdBy: r.created_by,
    usesRemaining: r.uses_remaining,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
  }));
}

export async function revokeInviteCode(
  db: D1Database,
  codeId: string,
  userId: string
): Promise<boolean> {
  await ensureInviteCodesTable(db);

  const result = await db
    .prepare("DELETE FROM invite_codes WHERE id = ?1 AND created_by = ?2")
    .bind(codeId, userId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}
