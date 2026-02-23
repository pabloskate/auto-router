import { UPSTREAM } from "./constants";
import { callOpenAiCompatible, type UpstreamCallResult } from "./upstream";

export type OpenRouterCallResult = UpstreamCallResult;

export async function callOpenRouter(args: {
  apiPath: "/chat/completions" | "/responses";
  payload: unknown;
  apiKey: string;
  requestId: string;
  fetchImpl?: typeof fetch;
}): Promise<OpenRouterCallResult> {
  return callOpenAiCompatible({
    apiPath: args.apiPath,
    payload: args.payload,
    apiKey: args.apiKey,
    requestId: args.requestId,
    baseUrl: UPSTREAM.DEFAULT_BASE_URL,
    fetchImpl: args.fetchImpl,
  });
}
