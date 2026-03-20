import { after } from "next/server";

import { withCsrf, withSessionAuth } from "@/src/lib/auth";
import {
  executeProfileBuilderRun,
  handleCreateProfileBuilderRun,
} from "@/src/features/routing/server/profile-builder-service";

export async function POST(request: Request): Promise<Response> {
  return withSessionAuth(request, async (auth, bindings) => {
    return withCsrf(request, async () => {
      const response = await handleCreateProfileBuilderRun(request, auth, bindings);
      if (!response.ok) {
        return response;
      }

      const payload = await response.clone().json() as { run?: unknown };
      if (!payload.run || typeof payload.run !== "object") {
        return response;
      }

      after(() => executeProfileBuilderRun({
        auth,
        bindings,
        run: payload.run as Parameters<typeof executeProfileBuilderRun>[0]["run"],
      }));

      return response;
    });
  });
}
