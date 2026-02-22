import { json } from "@/src/lib/http";
import { getRouterRepository } from "@/src/lib/storage";

export async function GET(): Promise<Response> {
    const repository = getRouterRepository();
    const catalog = await repository.getCatalog();
    return json(catalog || [], 200);
}
