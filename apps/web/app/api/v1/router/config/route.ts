import { json } from "@/src/lib/http";
import { routerConfigSchema } from "@/src/lib/schemas";
import { getRouterRepository } from "@/src/lib/storage";
import { verifyAdminSecret } from "@/src/lib/auth";
import { getRuntimeBindings } from "@/src/lib/runtime";

function requireAdmin(request: Request): Response | null {
  const bindings = getRuntimeBindings();
  if (!bindings.ADMIN_SECRET) {
    return json({ error: "Server misconfigured." }, 500);
  }

  if (!verifyAdminSecret(request, bindings.ADMIN_SECRET)) {
    return json({ error: "Unauthorized." }, 401);
  }

  return null;
}

export async function GET(request: Request): Promise<Response> {
  const unauthorized = requireAdmin(request);
  if (unauthorized) {
    return unauthorized;
  }

  const repository = getRouterRepository();
  const config = await repository.getConfig();

  return json(config, 200);
}

export async function PUT(request: Request): Promise<Response> {
  const unauthorized = requireAdmin(request);
  if (unauthorized) {
    return unauthorized;
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const parsed = routerConfigSchema.safeParse(payload);
  if (!parsed.success) {
    return json(
      {
        error: "Invalid router configuration.",
        issues: parsed.error.issues
      },
      400
    );
  }

  const repository = getRouterRepository();
  await repository.setConfig(parsed.data);

  return json({ ok: true, version: parsed.data.version }, 200);
}
