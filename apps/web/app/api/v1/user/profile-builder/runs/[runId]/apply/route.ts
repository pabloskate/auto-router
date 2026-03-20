import { withCsrf, withSessionAuth } from "@/src/lib/auth";
import { handleApplyProfileBuilderRun } from "@/src/features/routing/server/profile-builder-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
): Promise<Response> {
  return withSessionAuth(request, async (auth, bindings) => {
    return withCsrf(request, async () => {
      const { runId } = await params;
      return handleApplyProfileBuilderRun({
        request,
        auth,
        bindings,
        runId,
      });
    });
  });
}
