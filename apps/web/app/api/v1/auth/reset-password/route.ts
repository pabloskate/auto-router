import { AUTH } from "@/src/lib/constants";
import {
  buildSessionCookie,
  consumeRateLimit,
  getClientIp,
  parseJsonBody,
  resetPasswordWithToken,
  shouldUseSecureCookies,
  withDb,
} from "@/src/lib/auth";
import { json } from "@/src/lib/infra";
import { resetPasswordSchema } from "@/src/lib/schemas";

export async function POST(request: Request): Promise<Response> {
  return withDb(async (bindings) => {
    const ip = getClientIp(request);

    const ipLimit = await consumeRateLimit({
      db: bindings.ROUTER_DB,
      bucket: "auth:reset-password:ip",
      identifier: ip,
      maxRequests: AUTH.PASSWORD_RESET_CONFIRM_IP_MAX,
      windowSeconds: AUTH.PASSWORD_RESET_CONFIRM_WINDOW_SECONDS,
    });

    if (!ipLimit.allowed) {
      return json(
        { error: "Too many password reset attempts. Try again later." },
        429,
        { "retry-after": String(ipLimit.retryAfterSeconds) }
      );
    }

    const parsed = await parseJsonBody(request, resetPasswordSchema, {
      invalidPayloadMessage: `A reset token and a password with at least ${AUTH.PASSWORD_MIN_LENGTH} characters are required.`,
    });

    if (parsed.response) {
      return parsed.response;
    }

    const result = await resetPasswordWithToken({
      db: bindings.ROUTER_DB,
      token: parsed.data.token,
      password: parsed.data.password,
    });

    if (!result.ok) {
      return json(
        {
          error:
            result.reason === "expired"
              ? "This reset link has expired. Request a new one."
              : "This reset link is invalid. Request a new one.",
        },
        400
      );
    }

    const secureCookie = shouldUseSecureCookies(bindings.SESSION_COOKIE_SECURE);
    const sessionCookie = buildSessionCookie(result.sessionToken, { secure: secureCookie });

    return json(
      {
        ok: true,
        user: result.user,
      },
      200,
      { "set-cookie": sessionCookie }
    );
  });
}
