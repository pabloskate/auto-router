import { json } from "@/src/lib/http";
import { authenticateSession } from "@/src/lib/auth";
import { getRuntimeBindings } from "@/src/lib/runtime";
import { isSameOriginRequest } from "@/src/lib/csrf";

export async function GET(request: Request): Promise<Response> {
    const bindings = getRuntimeBindings();
    if (!bindings.ROUTER_DB) {
        return json({ error: "Server misconfigured." }, 500);
    }

    const auth = await authenticateSession(request, bindings.ROUTER_DB);
    if (!auth) {
        return json({ error: "Unauthorized." }, 401);
    }

    return json({
        user: {
            id: auth.userId,
            name: auth.userName,
            preferredModels: auth.preferredModels,
            defaultModel: auth.defaultModel,
            classifierModel: auth.classifierModel,
            routingInstructions: auth.routingInstructions,
            blocklist: auth.blocklist,
            customCatalog: auth.customCatalog
        }
    });
}

export async function PUT(request: Request): Promise<Response> {
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

    let body: Record<string, unknown>;
    try {
        body = (await request.json()) as Record<string, unknown>;
    } catch {
        return json({ error: "Invalid JSON body." }, 400);
    }

    const preferredModels = Array.isArray(body.preferred_models) ? body.preferred_models : [];
    const blocklist = Array.isArray(body.blocklist) ? body.blocklist : [];
    const defaultModel = typeof body.default_model === "string" ? body.default_model : null;
    const classifierModel = typeof body.classifier_model === "string" ? body.classifier_model : null;
    const routingInstructions = typeof body.routing_instructions === "string" ? body.routing_instructions : null;
    const customCatalog = Array.isArray(body.custom_catalog) ? body.custom_catalog : null;

    const now = new Date().toISOString();
    await bindings.ROUTER_DB
        .prepare(
            `UPDATE users 
             SET preferred_models = ?1, 
                 blocklist = ?2, 
                 default_model = ?3, 
                 classifier_model = ?4, 
                 routing_instructions = ?5, 
                 custom_catalog = ?6,
                 updated_at = ?7 
             WHERE id = ?8`
        )
        .bind(
            preferredModels.length > 0 ? JSON.stringify(preferredModels) : null,
            blocklist.length > 0 ? JSON.stringify(blocklist) : null,
            defaultModel,
            classifierModel,
            routingInstructions,
            customCatalog ? JSON.stringify(customCatalog) : null,
            now,
            auth.userId
        )
        .run();

    return json({ ok: true }, 200);
}
