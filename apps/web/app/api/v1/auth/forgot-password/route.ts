import { AUTH } from "@/src/lib/constants";
import {
  consumeRateLimit,
  getClientIp,
  parseJsonBody,
  requestPasswordReset,
  withDb,
} from "@/src/lib/auth";
import { json } from "@/src/lib/infra";
import { forgotPasswordSchema } from "@/src/lib/schemas";

const GENERIC_SUCCESS_MESSAGE =
  "If an account with that email exists, password reset instructions have been sent.";

export async function POST(request: Request): Promise<Response> {
  return withDb(async (bindings) => {
    const ip = getClientIp(request);

    const ipLimit = await consumeRateLimit({
      db: bindings.ROUTER_DB,
      bucket: "auth:forgot-password:ip",
      identifier: ip,
      maxRequests: AUTH.PASSWORD_RESET_REQUEST_IP_MAX,
      windowSeconds: AUTH.PASSWORD_RESET_REQUEST_WINDOW_SECONDS,
    });

    if (!ipLimit.allowed) {
      return json(
        { error: "Too many reset requests. Try again later." },
        429,
        { "retry-after": String(ipLimit.retryAfterSeconds) }
      );
    }

    const parsed = await parseJsonBody(request, forgotPasswordSchema, {
      invalidPayloadMessage: "A valid email address is required.",
    });

    if (parsed.response) {
      return parsed.response;
    }

    const email = parsed.data.email.trim();

    const emailIpLimit = await consumeRateLimit({
      db: bindings.ROUTER_DB,
      bucket: "auth:forgot-password:email_ip",
      identifier: `${email.toLowerCase()}|${ip}`,
      maxRequests: AUTH.PASSWORD_RESET_EMAIL_IP_MAX,
      windowSeconds: AUTH.PASSWORD_RESET_EMAIL_IP_WINDOW_SECONDS,
    });

    if (!emailIpLimit.allowed) {
      return json(
        { error: "Too many reset requests. Try again later." },
        429,
        { "retry-after": String(emailIpLimit.retryAfterSeconds) }
      );
    }

    const result = await requestPasswordReset({
      db: bindings.ROUTER_DB,
      bindings,
      request,
      email,
    });

    return json({
      ok: true,
      message: GENERIC_SUCCESS_MESSAGE,
      ...(result.resetUrl ? { reset_url: result.resetUrl } : {}),
      ...(result.resetToken ? { reset_token: result.resetToken } : {}),
    });
  });
}
