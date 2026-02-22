import { json } from "@/src/lib/http";
import { getRouterRepository } from "@/src/lib/storage";

/**
 * GET /api/v1/models
 *
 * OpenAI-compatible models listing endpoint.
 * Returns the active catalog in the standard { data: [...] } format
 * so clients like Cursor, Continue, etc. can discover available models.
 */
export async function GET(): Promise<Response> {
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

    return json({
        object: "list",
        data: models,
    });
}
