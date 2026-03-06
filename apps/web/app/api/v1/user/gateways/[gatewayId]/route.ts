import { json } from "@/src/lib/http";
import { withSessionAuth, withCsrf } from "@/src/lib/route-helpers";
import { encryptByokSecret, resolveByokEncryptionSecret } from "@/src/lib/byok-crypto";
import { normalizeAndValidateUpstreamBaseUrl } from "@/src/lib/upstream";
import {
  getUserGateway,
  updateUserGateway,
  deleteUserGateway,
  gatewayRowToInfo,
} from "@/src/lib/gateway-store";
import { updateGatewaySchema } from "@/src/lib/schemas";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gatewayId: string }> }
): Promise<Response> {
  return withSessionAuth(request, async (auth, bindings) => {
    const { gatewayId } = await params;
    const row = await getUserGateway(bindings.ROUTER_DB!, auth.userId, gatewayId);
    if (!row) return json({ error: "Not found." }, 404);
    return json({ gateway: gatewayRowToInfo(row) });
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ gatewayId: string }> }
): Promise<Response> {
  return withSessionAuth(request, async (auth, bindings) => {
    return withCsrf(request, async () => {
      const { gatewayId } = await params;

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON body." }, 400);
      }

      const parsed = updateGatewaySchema.safeParse(body);
      if (!parsed.success) {
        return json({ error: "Invalid payload.", issues: parsed.error.issues }, 400);
      }

      const updateArgs: Parameters<typeof updateUserGateway>[0] = {
        db: bindings.ROUTER_DB!,
        id: gatewayId,
        userId: auth.userId,
      };

      if (parsed.data.name !== undefined) {
        updateArgs.name = parsed.data.name;
      }

      if (parsed.data.baseUrl !== undefined) {
        const normalizedUrl = normalizeAndValidateUpstreamBaseUrl(parsed.data.baseUrl);
        if (!normalizedUrl) {
          return json(
            { error: "Invalid baseUrl. Use an https URL without query/hash/embedded credentials." },
            400
          );
        }
        updateArgs.baseUrl = normalizedUrl;
      }

      if (parsed.data.apiKey !== undefined) {
        const byokSecret = resolveByokEncryptionSecret({
          byokSecret: bindings.BYOK_ENCRYPTION_SECRET ?? null,
          adminSecret: bindings.ADMIN_SECRET ?? null,
        });
        if (!byokSecret) {
          return json({ error: "Server misconfigured: missing BYOK encryption secret." }, 500);
        }
        updateArgs.apiKeyEnc = await encryptByokSecret({
          plaintext: parsed.data.apiKey,
          secret: byokSecret,
        });
      }

      if (parsed.data.models !== undefined) {
        updateArgs.models = parsed.data.models;
      }

      const result = await updateUserGateway(updateArgs);
      if (!result.found) return json({ error: "Not found." }, 404);

      const row = await getUserGateway(bindings.ROUTER_DB!, auth.userId, gatewayId);
      return json({ gateway: row ? gatewayRowToInfo(row) : { id: gatewayId } });
    });
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ gatewayId: string }> }
): Promise<Response> {
  return withSessionAuth(request, async (auth, bindings) => {
    return withCsrf(request, async () => {
      const { gatewayId } = await params;
      const result = await deleteUserGateway({
        db: bindings.ROUTER_DB!,
        id: gatewayId,
        userId: auth.userId,
      });
      if (!result.found) return json({ error: "Not found." }, 404);
      return new Response(null, { status: 204 });
    });
  });
}
