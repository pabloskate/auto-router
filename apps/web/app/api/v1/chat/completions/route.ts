import { authenticateRequest } from "@/src/lib/auth";
import { routeAndProxy } from "@/src/lib/router-service";
import { chatCompletionSchema } from "@/src/lib/schemas";
import { json } from "@/src/lib/http";
import { getRuntimeBindings } from "@/src/lib/runtime";

export async function POST(request: Request): Promise<Response> {
  const bindings = getRuntimeBindings();

  if (!bindings.ROUTER_DB) {
    return json({ error: "Server misconfigured: missing database." }, 500);
  }

  const auth = await authenticateRequest(request, bindings.ROUTER_DB);
  if (!auth) {
    return json({ error: "Unauthorized. Provide a valid API key via Authorization: Bearer <key>." }, 401);
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const parsed = chatCompletionSchema.safeParse(payload);
  if (!parsed.success) {
    return json(
      {
        error: "Invalid request payload.",
        issues: parsed.error.issues
      },
      400
    );
  }

  const result = await routeAndProxy({
    body: parsed.data,
    apiPath: "/chat/completions",
    userConfig: {
      preferredModels: auth.preferredModels,
      customCatalog: auth.customCatalog,
      defaultModel: auth.defaultModel,
      classifierModel: auth.classifierModel,
      routingInstructions: auth.routingInstructions,
      blocklist: auth.blocklist
    }
  });

  return result.response;
}
