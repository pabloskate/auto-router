import { json } from "@/src/lib/http";
import { getRouterRepository } from "@/src/lib/storage";
import { authenticateRequest } from "@/src/lib/auth";
import { getRuntimeBindings } from "@/src/lib/runtime";

/**
 * GET /api/v1/models
 *
 * OpenAI-compatible models listing endpoint.
 * Returns the active catalog in the standard { data: [...] } format
 * so clients like Cursor, Continue, etc. can discover available models.
 *
 * When called with a valid API key the response also includes the user's
 * named routing profiles (e.g. "auto-cheap", "auto-coding") as synthetic
 * model entries so clients can select them from a model picker.
 */
export async function GET(request: Request): Promise<Response> {
    const repository = getRouterRepository();
    const catalog = await repository.getCatalog();

    const models = catalog.map((item) => ({
        id: item.id,
        object: "model" as const,
        created: 0,
        owned_by: item.id.split("/")[0] ?? "auto-router",
    }));

    // Always include the "auto" meta-model so clients can route automatically
    models.unshift({
        id: "auto",
        object: "model",
        created: 0,
        owned_by: "auto-router",
    });

    // If the caller has a valid API key, prepend their named profiles so
    // clients like Cursor can discover and select them from the model list.
    const bindings = getRuntimeBindings();
    if (bindings.ROUTER_DB) {
        const auth = await authenticateRequest(request, bindings.ROUTER_DB);
        if (auth?.profiles && auth.profiles.length > 0) {
            const profileModels = [...auth.profiles]
                .sort((a, b) => String(a.id).localeCompare(String(b.id)))
                .map((profile) => ({
                    id: String(profile.id),
                    object: "model" as const,
                    created: 0,
                    owned_by: "auto-router",
                }));
            // Insert profiles between "auto" and the rest of the catalog
            models.splice(1, 0, ...profileModels);
        }
    }

    return json({
        object: "list",
        data: models,
    });
}
