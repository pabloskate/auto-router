import { authenticateRequest, authenticateSession } from "@/src/lib/auth";
import { json } from "@/src/lib/http";
import { routeAndProxy } from "@/src/lib/router-service";
import { responsesSchema } from "@/src/lib/schemas";
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

  const parsed = responsesSchema.safeParse(payload);
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
    apiPath: "/responses",
    userConfig: {
      preferredModels: auth.preferredModels,
      customCatalog: auth.customCatalog,
      defaultModel: auth.defaultModel,
      classifierModel: auth.classifierModel,
      routingInstructions: auth.routingInstructions,
      blocklist: auth.blocklist,
      profiles: auth.profiles,
      upstreamBaseUrl: auth.upstreamBaseUrl,
      upstreamApiKeyEnc: auth.upstreamApiKeyEnc,
      classifierBaseUrl: auth.classifierBaseUrl,
      classifierApiKeyEnc: auth.classifierApiKeyEnc,
    },
  });

  return result.response;
}
