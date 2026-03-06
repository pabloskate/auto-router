import { authenticateRequest, authenticateSession } from "@/src/lib/auth";
import { loadGatewaysWithMigration, gatewayRowToPublic } from "@/src/lib/gateway-store";
import { routeAndProxy } from "@/src/lib/router-service";
import { completionsSchema } from "@/src/lib/schemas";
import { json } from "@/src/lib/http";
import { getRuntimeBindings } from "@/src/lib/runtime";
import { isSameOriginRequest } from "@/src/lib/csrf";

export async function POST(request: Request): Promise<Response> {
    const bindings = getRuntimeBindings();

    if (!bindings.ROUTER_DB) {
        return json({ error: "Server misconfigured: missing database." }, 500);
    }

    let auth = await authenticateRequest(request, bindings.ROUTER_DB);

    // Browser tester fallback: allow authenticated same-origin session calls.
    if (!auth && isSameOriginRequest(request)) {
        auth = await authenticateSession(request, bindings.ROUTER_DB);
    }

    if (!auth) {
        return json({ error: "Unauthorized. Provide a valid API key via Authorization: Bearer <key>." }, 401);
    }

    let payload: unknown;

    try {
        payload = await request.json();
    } catch {
        return json({ error: "Invalid JSON body." }, 400);
    }

    const parsed = completionsSchema.safeParse(payload);
    if (!parsed.success) {
        return json(
            {
                error: "Invalid request payload.",
                issues: parsed.error.issues
            },
            400
        );
    }

    const gatewayRows = await loadGatewaysWithMigration({
        db: bindings.ROUTER_DB,
        userId: auth.userId,
        upstreamBaseUrl: auth.upstreamBaseUrl ?? null,
        upstreamApiKeyEnc: auth.upstreamApiKeyEnc ?? null,
        customCatalogJson: auth.customCatalog ? JSON.stringify(auth.customCatalog) : null,
    }).then((rows) => rows.map(gatewayRowToPublic)).catch(() => []);

    const result = await routeAndProxy({
        body: parsed.data,
        apiPath: "/completions",
        userConfig: {
            preferredModels: auth.preferredModels,
            customCatalog: auth.customCatalog,
            defaultModel: auth.defaultModel,
            classifierModel: auth.classifierModel,
            routingInstructions: auth.routingInstructions,
            blocklist: auth.blocklist,
            profiles: auth.profiles,
            gatewayRows,
            classifierBaseUrl: auth.classifierBaseUrl,
            classifierApiKeyEnc: auth.classifierApiKeyEnc,
            showModelInResponse: auth.showModelInResponse,
        },
    });

    return result.response;
}
