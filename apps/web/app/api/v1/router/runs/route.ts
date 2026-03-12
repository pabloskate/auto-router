import { verifyAdminSecret } from "@/src/lib/auth";
import { json, getRuntimeBindings } from "@/src/lib/infra";
import { getRouterRepository } from "@/src/lib/storage";

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
