import { withSessionAuth } from "@/src/lib/auth";
import { handleGetProfileBuilderRun } from "@/src/features/routing/server/profile-builder-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
): Promise<Response> {
  return withSessionAuth(request, async (auth, bindings) => {
    const { runId } = await params;
    return handleGetProfileBuilderRun(auth, bindings, runId);
  });
}
