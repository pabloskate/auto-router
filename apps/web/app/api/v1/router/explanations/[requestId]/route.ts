import { verifyAdminSecret } from "@/src/lib/auth";
import { json, getRuntimeBindings } from "@/src/lib/infra";
import { getRouterRepository } from "@/src/lib/storage";

export async function GET(
  request: Request,
  context: { params: Promise<{ requestId: string }> }
): Promise<Response> {
  const bindings = getRuntimeBindings();
  if (!bindings.ADMIN_SECRET) {
    return json({ error: "Server misconfigured." }, 500);
  }

  if (!verifyAdminSecret(request, bindings.ADMIN_SECRET)) {
    return json({ error: "Unauthorized." }, 401);
  }

  const { requestId } = await context.params;
  const repository = getRouterRepository();
  const explanation = await repository.getExplanation(requestId);

  if (!explanation) {
    return json({ error: "Explanation not found.", request_id: requestId }, 404);
  }

  return json(explanation, 200);
}
