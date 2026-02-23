import type { D1Database } from "./cloudflare-types";

export interface UserUpstreamRow {
  user_id: string;
  upstream_base_url: string | null;
  upstream_api_key_enc: string | null;
  classifier_base_url: string | null;
  classifier_api_key_enc: string | null;
  updated_at: string;
}

const ENSURE_SQL = `
CREATE TABLE IF NOT EXISTS user_upstream_credentials (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  upstream_base_url TEXT,
  upstream_api_key_enc TEXT,
  classifier_base_url TEXT,
  classifier_api_key_enc TEXT,
  updated_at TEXT NOT NULL
);
`;

let ensurePromise: Promise<void> | null = null;

export function ensureUserUpstreamCredentialsTable(db: D1Database): Promise<void> {
  if (ensurePromise) {
    return ensurePromise;
  }

  ensurePromise = db.prepare(ENSURE_SQL).run().then(() => undefined).catch((error) => {
    ensurePromise = null;
    throw error;
  });
  return ensurePromise;
}

export async function getUserUpstreamCredentials(
  db: D1Database,
  userId: string
): Promise<UserUpstreamRow | null> {
  await ensureUserUpstreamCredentialsTable(db);

  return db
    .prepare(
      `SELECT user_id, upstream_base_url, upstream_api_key_enc, classifier_base_url, classifier_api_key_enc, updated_at
       FROM user_upstream_credentials
       WHERE user_id = ?1
       LIMIT 1`
    )
    .bind(userId)
    .first<UserUpstreamRow>();
}

export async function upsertUserUpstreamCredentials(args: {
  db: D1Database;
  userId: string;
  upstreamBaseUrl: string | null;
  upstreamApiKeyEnc: string | null;
  classifierBaseUrl: string | null;
  classifierApiKeyEnc: string | null;
}): Promise<void> {
  await ensureUserUpstreamCredentialsTable(args.db);

  await args.db
    .prepare(
      `INSERT INTO user_upstream_credentials (
         user_id, upstream_base_url, upstream_api_key_enc, classifier_base_url, classifier_api_key_enc, updated_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT(user_id) DO UPDATE SET
         upstream_base_url = excluded.upstream_base_url,
         upstream_api_key_enc = excluded.upstream_api_key_enc,
         classifier_base_url = excluded.classifier_base_url,
         classifier_api_key_enc = excluded.classifier_api_key_enc,
         updated_at = excluded.updated_at`
    )
    .bind(
      args.userId,
      args.upstreamBaseUrl,
      args.upstreamApiKeyEnc,
      args.classifierBaseUrl,
      args.classifierApiKeyEnc,
      new Date().toISOString()
    )
    .run();
}
