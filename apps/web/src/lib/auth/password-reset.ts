import { AUTH } from "../constants";
import type { D1Database } from "../infra/cloudflare-types";
import type { RouterRuntimeBindings } from "../infra/runtime-bindings";
import { createSession, hashKey, hashPassword } from "./auth";

interface PasswordResetUserRow {
  id: string;
  name: string;
  email: string | null;
}

interface PasswordResetTokenRow {
  user_id: string;
  name: string;
  email: string | null;
  expires_at: string;
}

export interface PasswordResetRequestResult {
  resetUrl?: string;
  resetToken?: string;
}

export type ResetPasswordWithTokenResult =
  | {
      ok: true;
      sessionToken: string;
      user: {
        id: string;
        name: string;
        email: string | null;
      };
    }
  | {
      ok: false;
      reason: "invalid" | "expired";
    };

function generateOpaqueToken(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function shouldReturnPreviewLink(): boolean {
  return process.env.NODE_ENV !== "production";
}

function resolveTrustedPasswordResetBaseUrl(bindings: RouterRuntimeBindings): string | null {
  const configuredBaseUrl = bindings.PASSWORD_RESET_BASE_URL?.trim();
  if (!configuredBaseUrl) {
    return null;
  }

  try {
    const parsed = new URL(configuredBaseUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function buildPasswordResetUrl(baseUrl: string, token: string): string {
  const url = new URL("/", baseUrl);
  url.searchParams.set("reset_token", token);
  return url.toString();
}

async function sendPasswordResetEmail(args: {
  bindings: RouterRuntimeBindings;
  email: string;
  name: string;
  resetUrl: string;
  expiresAt: string;
}): Promise<boolean> {
  const resendApiKey = args.bindings.RESEND_API_KEY;
  const fromEmail = args.bindings.PASSWORD_RESET_FROM_EMAIL;

  if (!resendApiKey || !fromEmail) {
    return false;
  }

  const expiryTime = new Date(args.expiresAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const text = [
    `Hi ${args.name || "there"},`,
    "",
    "We received a request to reset your CustomRouter password.",
    `Reset it here: ${args.resetUrl}`,
    "",
    `This link expires on ${expiryTime}.`,
    "If you did not request a password reset, you can ignore this email.",
  ].join("\n");

  const html = [
    `<p>Hi ${args.name || "there"},</p>`,
    "<p>We received a request to reset your CustomRouter password.</p>",
    `<p><a href="${args.resetUrl}">Reset your password</a></p>`,
    `<p>This link expires on ${expiryTime}.</p>`,
    "<p>If you did not request a password reset, you can ignore this email.</p>",
  ].join("");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [args.email],
        subject: "Reset your CustomRouter password",
        text,
        html,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function requestPasswordReset(args: {
  db: D1Database;
  bindings: RouterRuntimeBindings;
  request: Request;
  email: string;
}): Promise<PasswordResetRequestResult> {
  const user = await args.db
    .prepare("SELECT id, name, email FROM users WHERE email = ?1 LIMIT 1")
    .bind(args.email)
    .first<PasswordResetUserRow>();

  if (!user?.email) {
    return {};
  }

  const token = generateOpaqueToken(AUTH.PASSWORD_RESET_TOKEN_BYTES);
  const tokenHash = await hashKey(token);
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + AUTH.PASSWORD_RESET_TTL_MS).toISOString();

  await args.db
    .prepare("DELETE FROM password_reset_tokens WHERE user_id = ?1")
    .bind(user.id)
    .run();

  await args.db
    .prepare(
      "INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, created_at, consumed_at) VALUES (?1, ?2, ?3, ?4, NULL)"
    )
    .bind(tokenHash, user.id, expiresAt, createdAt)
    .run();

  const trustedBaseUrl = resolveTrustedPasswordResetBaseUrl(args.bindings);
  const resetUrl = trustedBaseUrl ? buildPasswordResetUrl(trustedBaseUrl, token) : null;
  const delivered = resetUrl
    ? await sendPasswordResetEmail({
        bindings: args.bindings,
        email: user.email,
        name: user.name,
        resetUrl,
        expiresAt,
      })
    : false;

  if (delivered || !shouldReturnPreviewLink()) {
    return {};
  }

  const previewResetUrl = resetUrl ?? buildPasswordResetUrl(args.request.url, token);

  return {
    resetUrl: previewResetUrl,
    resetToken: token,
  };
}

export async function resetPasswordWithToken(args: {
  db: D1Database;
  token: string;
  password: string;
}): Promise<ResetPasswordWithTokenResult> {
  const tokenHash = await hashKey(args.token);
  const now = new Date().toISOString();

  const resetToken = await args.db
    .prepare(
      `SELECT pr.user_id, pr.expires_at, u.name, u.email
       FROM password_reset_tokens pr
       JOIN users u ON u.id = pr.user_id
       WHERE pr.token_hash = ?1 AND pr.consumed_at IS NULL
       LIMIT 1`
    )
    .bind(tokenHash)
    .first<PasswordResetTokenRow>();

  if (!resetToken) {
    return { ok: false, reason: "invalid" };
  }

  if (resetToken.expires_at <= now) {
    await args.db
      .prepare("DELETE FROM password_reset_tokens WHERE token_hash = ?1")
      .bind(tokenHash)
      .run();
    return { ok: false, reason: "expired" };
  }

  const consumeResult = await args.db
    .prepare(
      "UPDATE password_reset_tokens SET consumed_at = ?2 WHERE token_hash = ?1 AND consumed_at IS NULL"
    )
    .bind(tokenHash, now)
    .run();

  if ((consumeResult.meta?.changes ?? 0) !== 1) {
    return { ok: false, reason: "invalid" };
  }

  const { hash, salt } = await hashPassword(args.password);
  const storedPassword = `${salt}:${hash}`;

  await args.db
    .prepare("UPDATE users SET password_hash = ?1, updated_at = ?2 WHERE id = ?3")
    .bind(storedPassword, now, resetToken.user_id)
    .run();

  await args.db
    .prepare("DELETE FROM user_sessions WHERE user_id = ?1")
    .bind(resetToken.user_id)
    .run();

  await args.db
    .prepare("DELETE FROM password_reset_tokens WHERE user_id = ?1")
    .bind(resetToken.user_id)
    .run();

  const sessionToken = await createSession(resetToken.user_id, args.db);

  return {
    ok: true,
    sessionToken,
    user: {
      id: resetToken.user_id,
      name: resetToken.name,
      email: resetToken.email,
    },
  };
}
