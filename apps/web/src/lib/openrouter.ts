const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export type OpenRouterCallResult =
  | {
      ok: true;
      status: number;
      response: Response;
    }
  | {
      ok: false;
      status: number;
      errorBody: string;
    };

export async function callOpenRouter(args: {
  apiPath: "/chat/completions" | "/responses";
  payload: unknown;
  apiKey: string;
  requestId: string;
  fetchImpl?: typeof fetch;
}): Promise<OpenRouterCallResult> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const response = await fetchImpl(`${OPENROUTER_BASE_URL}${args.apiPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "auto-router",
      "X-Router-Request-Id": args.requestId
    },
    body: JSON.stringify(args.payload)
  });

  if (response.ok) {
    return {
      ok: true,
      status: response.status,
      response
    };
  }

  return {
    ok: false,
    status: response.status,
    errorBody: await response.text()
  };
}
