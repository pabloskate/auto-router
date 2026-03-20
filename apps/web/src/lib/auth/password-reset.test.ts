import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requestPasswordReset } from "./password-reset";

interface TestUserRow {
  id: string;
  name: string;
  email: string | null;
}

function createDbMock(user: TestUserRow = {
  id: "user_1",
  name: "Test User",
  email: "user@example.com",
}) {
  const statements: Array<{ sql: string; args: unknown[] }> = [];

  return {
    prepare: vi.fn((sql: string) => ({
      bind: (...args: unknown[]) => {
        statements.push({ sql, args });

        if (sql.includes("SELECT id, name, email FROM users")) {
          return {
            first: async () => user,
          };
        }

        return {
          run: async () => ({ meta: { changes: 1 } }),
        };
      },
    })),
    statements,
  };
}

describe("requestPasswordReset", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("builds emailed reset links from PASSWORD_RESET_BASE_URL instead of the request host", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const db = createDbMock();

    const result = await requestPasswordReset({
      db: db as any,
      bindings: {
        PASSWORD_RESET_BASE_URL: "https://custom-router.example.com",
        PASSWORD_RESET_FROM_EMAIL: "CustomRouter <noreply@example.com>",
        RESEND_API_KEY: "resend_test_key",
      },
      request: new Request("https://attacker.example/api/v1/auth/forgot-password", {
        method: "POST",
      }),
      email: "user@example.com",
    });

    expect(result).toEqual({});
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.text).toContain("https://custom-router.example.com/?reset_token=");
    expect(body.text).not.toContain("attacker.example");
    expect(body.html).toContain("https://custom-router.example.com/?reset_token=");
    expect(body.html).not.toContain("attacker.example");
  });

  it("returns a trusted preview link when email delivery is unavailable but a base URL is configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const db = createDbMock();

    const result = await requestPasswordReset({
      db: db as any,
      bindings: {
        PASSWORD_RESET_BASE_URL: "https://custom-router.example.com/app",
      },
      request: new Request("https://attacker.example/api/v1/auth/forgot-password", {
        method: "POST",
      }),
      email: "user@example.com",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.resetToken).toBeTruthy();
    expect(result.resetUrl).toContain("https://custom-router.example.com/?reset_token=");
    expect(result.resetUrl).not.toContain("attacker.example");
  });

  it("fails closed in production when PASSWORD_RESET_BASE_URL is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NODE_ENV", "production");

    const db = createDbMock();

    const result = await requestPasswordReset({
      db: db as any,
      bindings: {
        PASSWORD_RESET_FROM_EMAIL: "CustomRouter <noreply@example.com>",
        RESEND_API_KEY: "resend_test_key",
      },
      request: new Request("https://attacker.example/api/v1/auth/forgot-password", {
        method: "POST",
      }),
      email: "user@example.com",
    });

    expect(result).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps request-host preview links limited to non-production local preview mode", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const db = createDbMock();

    const result = await requestPasswordReset({
      db: db as any,
      bindings: {},
      request: new Request("https://preview.local/api/v1/auth/forgot-password", {
        method: "POST",
      }),
      email: "user@example.com",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.resetToken).toBeTruthy();
    expect(result.resetUrl).toContain("https://preview.local/?reset_token=");
  });
});
