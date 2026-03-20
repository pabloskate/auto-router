import type { D1Database } from "@/src/lib/infra/cloudflare-types";
import type {
  ProfileBuilderExecutor,
  ProfileBuilderRequest,
  ProfileBuilderRun,
  ProfileBuilderRunStatus,
} from "@/src/features/routing/profile-builder-contracts";

interface ProfileBuilderRunRow {
  id: string;
  user_id: string;
  status: ProfileBuilderRunStatus;
  request_json: string;
  result_json: string | null;
  executor_gateway_id: string;
  executor_model_id: string;
  executor_json: string;
  error: string | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
}

const ENSURE_SQL = `
CREATE TABLE IF NOT EXISTS profile_builder_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  request_json TEXT NOT NULL,
  result_json TEXT,
  executor_gateway_id TEXT NOT NULL,
  executor_model_id TEXT NOT NULL,
  executor_json TEXT NOT NULL,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  finished_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_profile_builder_runs_user_created
  ON profile_builder_runs(user_id, created_at DESC);
`;

let ensurePromise: Promise<void> | null = null;

function parseJson<T>(value: string | null | undefined): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function ensureProfileBuilderRunsTable(db: D1Database): Promise<void> {
  if (ensurePromise) {
    return ensurePromise;
  }

  ensurePromise = db.prepare(ENSURE_SQL).run().then(() => undefined).catch((error) => {
    ensurePromise = null;
    throw error;
  });

  return ensurePromise;
}

function rowToRun(row: ProfileBuilderRunRow): ProfileBuilderRun | null {
  const request = parseJson<ProfileBuilderRequest>(row.request_json);
  const executor = parseJson<ProfileBuilderExecutor>(row.executor_json);
  const result = parseJson<Partial<ProfileBuilderRun>>(row.result_json);
  if (!request || !executor) {
    return null;
  }

  return {
    id: row.id,
    status: row.status,
    request,
    executor,
    draftProfile: result?.draftProfile,
    recommendations: result?.recommendations ?? [],
    rejections: result?.rejections ?? [],
    sources: result?.sources ?? [],
    researchMode: result?.researchMode,
    summary: result?.summary,
    error: row.error ?? result?.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    finishedAt: row.finished_at ?? undefined,
  };
}

export async function insertProfileBuilderRun(args: {
  db: D1Database;
  id: string;
  userId: string;
  request: ProfileBuilderRequest;
  executor: ProfileBuilderExecutor;
}): Promise<ProfileBuilderRun> {
  await ensureProfileBuilderRunsTable(args.db);

  const now = new Date().toISOString();
  await args.db
    .prepare(
      `INSERT INTO profile_builder_runs (
         id, user_id, status, request_json, result_json,
         executor_gateway_id, executor_model_id, executor_json,
         error, created_at, updated_at, finished_at
       ) VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?7, NULL, ?8, ?9, NULL)`
    )
    .bind(
      args.id,
      args.userId,
      "running",
      JSON.stringify(args.request),
      args.executor.gatewayId,
      args.executor.modelId,
      JSON.stringify(args.executor),
      now,
      now,
    )
    .run();

  return {
    id: args.id,
    status: "running",
    request: args.request,
    executor: args.executor,
    recommendations: [],
    rejections: [],
    sources: [],
    createdAt: now,
    updatedAt: now,
  };
}

export async function getProfileBuilderRun(args: {
  db: D1Database;
  userId: string;
  runId: string;
}): Promise<ProfileBuilderRun | null> {
  await ensureProfileBuilderRunsTable(args.db);
  const row = await args.db
    .prepare(
      `SELECT id, user_id, status, request_json, result_json, executor_gateway_id, executor_model_id,
              executor_json, error, created_at, updated_at, finished_at
       FROM profile_builder_runs
       WHERE id = ?1 AND user_id = ?2
       LIMIT 1`
    )
    .bind(args.runId, args.userId)
    .first<ProfileBuilderRunRow>();

  return row ? rowToRun(row) : null;
}

export async function completeProfileBuilderRun(args: {
  db: D1Database;
  userId: string;
  runId: string;
  result: Omit<ProfileBuilderRun, "id" | "status" | "request" | "executor" | "createdAt" | "updatedAt" | "finishedAt">;
}): Promise<void> {
  await ensureProfileBuilderRunsTable(args.db);
  const now = new Date().toISOString();
  await args.db
    .prepare(
      `UPDATE profile_builder_runs
       SET status = ?1,
           result_json = ?2,
           error = NULL,
           updated_at = ?3,
           finished_at = ?4
       WHERE id = ?5 AND user_id = ?6`
    )
    .bind("completed", JSON.stringify(args.result), now, now, args.runId, args.userId)
    .run();
}

export async function failProfileBuilderRun(args: {
  db: D1Database;
  userId: string;
  runId: string;
  error: string;
}): Promise<void> {
  await ensureProfileBuilderRunsTable(args.db);
  const now = new Date().toISOString();
  await args.db
    .prepare(
      `UPDATE profile_builder_runs
       SET status = ?1,
           error = ?2,
           updated_at = ?3,
           finished_at = ?4
       WHERE id = ?5 AND user_id = ?6`
    )
    .bind("error", args.error, now, now, args.runId, args.userId)
    .run();
}
