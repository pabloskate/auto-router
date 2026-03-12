import type { D1Database } from "../infra/cloudflare-types";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function getClientIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) {
    return cfIp;
  }

  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) {
    return "unknown";
  }

  const firstHop = forwarded.split(",")[0]?.trim();
  return firstHop || "unknown";
}

export async function consumeRateLimit(args: {
  db: D1Database;
  bucket: string;
  identifier: string;
  maxRequests: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(nowSeconds / args.windowSeconds) * args.windowSeconds;
  const updatedAt = new Date(nowSeconds * 1000).toISOString();

  try {
    await args.db
      .prepare(
        `INSERT INTO rate_limit_counters (bucket, identifier, window_start, count, updated_at)
         VALUES (?1, ?2, ?3, 1, ?4)
         ON CONFLICT(bucket, identifier, window_start) DO UPDATE SET
           count = count + 1,
           updated_at = excluded.updated_at`
      )
      .bind(args.bucket, args.identifier, windowStart, updatedAt)
      .run();

    const row = await args.db
      .prepare(
        `SELECT count
         FROM rate_limit_counters
         WHERE bucket = ?1 AND identifier = ?2 AND window_start = ?3
         LIMIT 1`
      )
      .bind(args.bucket, args.identifier, windowStart)
      .first<{ count: number }>();

    const count = Number(row?.count ?? 0);
    const allowed = count <= args.maxRequests;
    const retryAfterSeconds = allowed
      ? 0
      : Math.max(1, windowStart + args.windowSeconds - nowSeconds);

    return {
      allowed,
      remaining: Math.max(0, args.maxRequests - count),
      retryAfterSeconds
    };
  } catch {
    // Fail open if schema is not migrated yet.
    return {
      allowed: true,
      remaining: args.maxRequests,
      retryAfterSeconds: 0
    };
  }
}
