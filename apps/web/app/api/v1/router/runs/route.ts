import { json } from "@/src/lib/http";
import { getRouterRepository } from "@/src/lib/storage";
import { verifyAdminSecret } from "@/src/lib/auth";
import { getRuntimeBindings } from "@/src/lib/runtime";

export async function GET(request: Request): Promise<Response> {
  const bindings = getRuntimeBindings();
  if (!bindings.ADMIN_SECRET) {
    return json({ error: "Server misconfigured." }, 500);
  }

  if (!verifyAdminSecret(request, bindings.ADMIN_SECRET)) {
    return json({ error: "Unauthorized." }, 401);
  }

  const repository = getRouterRepository();
  const runs = await repository.listRuns();

  return json({ runs }, 200);
}
