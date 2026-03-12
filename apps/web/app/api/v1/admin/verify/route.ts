import { constantTimeEqual, consumeRateLimit, getClientIp } from "@/src/lib/auth";
import { json, getRuntimeBindings } from "@/src/lib/infra";

export async function POST(request: Request): Promise<Response> {
    const bindings = getRuntimeBindings();
    if (!bindings.ADMIN_SECRET) {
        return json({ error: "Server misconfigured." }, 500);
    }

    if (bindings.ROUTER_DB) {
        const adminLimit = await consumeRateLimit({
            db: bindings.ROUTER_DB,
            bucket: "auth:admin_verify:ip",
            identifier: getClientIp(request),
            maxRequests: 10,
            windowSeconds: 15 * 60
        });
        if (!adminLimit.allowed) {
            return json(
                { error: "Too many attempts. Try again later." },
                429,
                { "retry-after": String(adminLimit.retryAfterSeconds) }
            );
        }
    }

    let body: Record<string, unknown>;
    try {
        body = (await request.json()) as Record<string, unknown>;
    } catch {
        return json({ error: "Invalid JSON body." }, 400);
    }

    const password = typeof body.password === "string" ? body.password : "";

    if (constantTimeEqual(password, bindings.ADMIN_SECRET)) {
        return json({ ok: true }, 200);
    }

    return json({ error: "Invalid password." }, 401);
}
