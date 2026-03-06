-- Migration 001: per-user gateway registry
--
-- Each user can register multiple named gateways (name, base_url, encrypted_api_key).
-- Each gateway stores its own model catalog in models_json (JSON: CatalogItem[]).
-- Models use the gateway's native model IDs (e.g., "gpt-4o" for OpenAI direct).
--
-- The existing user_upstream_credentials table is retained for classifier credentials
-- only. The upstream_base_url and upstream_api_key_enc fields are cleared after
-- lazy migration to gateways.

CREATE TABLE IF NOT EXISTS user_gateways (
  id          TEXT NOT NULL,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  base_url    TEXT NOT NULL,
  api_key_enc TEXT NOT NULL,
  models_json TEXT NOT NULL DEFAULT '[]',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_gateways_user ON user_gateways(user_id);
