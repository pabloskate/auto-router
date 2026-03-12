import {
    authenticateSession,
    isSameOriginRequest,
    createInviteCode,
    listInviteCodes,
    revokeInviteCode,
} from "@/src/lib/auth";
import { json, jsonNoStore, getRuntimeBindings } from "@/src/lib/infra";

export async function GET(request: Request): Promise<Response> {
    const bindings = getRuntimeBindings();
    if (!bindings.ROUTER_DB) {
        return json({ error: "Server misconfigured." }, 500);
    }

    const auth = await authenticateSession(request, bindings.ROUTER_DB);
    if (!auth) {
        return json({ error: "Unauthorized." }, 401);
    }

    const invites = await listInviteCodes(bindings.ROUTER_DB, auth.userId);

    return json({
        invites: invites.map((inv) => ({
            id: inv.id,
            code: inv.code,
            usesRemaining: inv.usesRemaining,
            expiresAt: inv.expiresAt,
            createdAt: inv.createdAt,
        })),
    });
}

export async function POST(request: Request): Promise<Response> {
    const bindings = getRuntimeBindings();
    if (!bindings.ROUTER_DB) {
        return jsonNoStore({ error: "Server misconfigured." }, 500);
    }

    if (!isSameOriginRequest(request)) {
        return jsonNoStore({ error: "Invalid origin." }, 403);
    }

    const auth = await authenticateSession(request, bindings.ROUTER_DB);
    if (!auth) {
        return jsonNoStore({ error: "Unauthorized." }, 401);
    }

    let body: Record<string, unknown> = {};
    try {
        body = (await request.json()) as Record<string, unknown>;
    } catch {
        // optional body
    }

    const uses = typeof body.uses === "number" && body.uses > 0 ? body.uses : undefined;
    const expiresInHours =
        typeof body.expires_in_hours === "number" && body.expires_in_hours > 0
            ? body.expires_in_hours
            : undefined;

    const invite = await createInviteCode(bindings.ROUTER_DB, {
        createdBy: auth.userId,
        uses,
        expiresInMs: expiresInHours ? expiresInHours * 60 * 60 * 1000 : undefined,
    });

    return jsonNoStore(
        {
            invite: {
                id: invite.id,
                code: invite.code,
                usesRemaining: invite.usesRemaining,
                expiresAt: invite.expiresAt,
                createdAt: invite.createdAt,
            },
        },
        201
    );
}

export async function DELETE(request: Request): Promise<Response> {
    const bindings = getRuntimeBindings();
    if (!bindings.ROUTER_DB) {
        return json({ error: "Server misconfigured." }, 500);
    }

    if (!isSameOriginRequest(request)) {
        return json({ error: "Invalid origin." }, 403);
    }

    const auth = await authenticateSession(request, bindings.ROUTER_DB);
    if (!auth) {
        return json({ error: "Unauthorized." }, 401);
    }

    const url = new URL(request.url);
    const codeId = url.searchParams.get("codeId");

    if (!codeId) {
        return json({ error: "codeId query parameter is required." }, 400);
    }

    await revokeInviteCode(bindings.ROUTER_DB, codeId, auth.userId);

    return json({ ok: true });
}
