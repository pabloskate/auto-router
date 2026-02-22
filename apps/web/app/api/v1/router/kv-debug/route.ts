import { json } from "@/src/lib/http";
import { getRuntimeBindings } from "@/src/lib/runtime";
import { verifyAdminSecret } from "@/src/lib/auth";

export async function GET(request: Request): Promise<Response> {
    const bindings = getRuntimeBindings();

    if (!bindings.ADMIN_SECRET) {
        return json({ error: "Server misconfigured." }, 500);
    }

    if (!verifyAdminSecret(request, bindings.ADMIN_SECRET)) {
        return json({ error: "Unauthorized." }, 401);
    }

    if (!bindings.ROUTER_KV) {
        return json({ error: "Missing ROUTER_KV binding" }, 500);
    }

    try {
        const metaRaw = await bindings.ROUTER_KV.get("router:active:meta", { type: "text" });
        return json({ meta: metaRaw }, 200);
    } catch (error) {
        return json({ error: String(error) }, 500);
    }
}
