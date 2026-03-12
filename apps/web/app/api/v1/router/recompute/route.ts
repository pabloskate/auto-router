import { fetchAndBuildIngestionArtifacts } from "@auto-router/data";
import { verifyAdminSecret } from "@/src/lib/auth";
import { json, getRuntimeBindings } from "@/src/lib/infra";
import { getRouterRepository } from "@/src/lib/storage";

function runId(): string {
  return `ingest_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

export async function POST(request: Request): Promise<Response> {
  const { OPENROUTER_API_KEY, ADMIN_SECRET } = getRuntimeBindings();

  if (!ADMIN_SECRET) {
    return json({ error: "Server misconfigured." }, 500);
  }

  if (!verifyAdminSecret(request, ADMIN_SECRET)) {
    return json({ error: "Unauthorized." }, 401);
  }

  if (!OPENROUTER_API_KEY) {
    return json({ error: "OPENROUTER_API_KEY is not configured." }, 500);
  }

  const repository = getRouterRepository();
  const id = runId();
  const startedAt = new Date().toISOString();

  await repository.putRun({ id, status: "running", startedAt });

  try {
    const result = await fetchAndBuildIngestionArtifacts({
      openRouterApiKey: OPENROUTER_API_KEY
    });

    await repository.setCatalog(result.version, result.catalog);
    await repository.putRun({
      id,
      status: "ok",
      startedAt,
      finishedAt: new Date().toISOString(),
      artifactVersion: result.version
    });

    return json({ ok: true, runId: id, artifactVersion: result.version, modelCount: result.catalog.length }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingestion error";

    await repository.putRun({
      id,
      status: "error",
      startedAt,
      finishedAt: new Date().toISOString(),
      error: message
    });

    return json({ error: message }, 500);
  }
}
