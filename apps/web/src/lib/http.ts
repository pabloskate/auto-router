export function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      ...(headers ?? {})
    }
  });
}

export function attachRouterHeaders(
  response: Response,
  metadata: {
    model: string;
    catalogVersion: string;
    requestId: string;
    degraded: boolean;
  }
): Response {
  const nextHeaders = new Headers(response.headers);
  nextHeaders.set("x-router-model-selected", metadata.model);
  nextHeaders.set("x-router-score-version", metadata.catalogVersion);
  nextHeaders.set("x-router-request-id", metadata.requestId);

  if (metadata.degraded) {
    nextHeaders.set("x-router-degraded", "true");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: nextHeaders
  });
}
