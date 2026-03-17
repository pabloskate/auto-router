-- Migration 007: password reset tokens and adaptive pin metadata
--
-- Safe to run once on existing deployments upgraded from older schemas.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  consumed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

ALTER TABLE thread_pins ADD COLUMN family_id TEXT;
ALTER TABLE thread_pins ADD COLUMN reasoning_effort TEXT;
ALTER TABLE thread_pins ADD COLUMN step_mode TEXT;
