import { describe, expect, it, vi } from "vitest";
import { routeWithFrontierModel } from "./frontier-router-classifier";

describe("routeWithFrontierModel", () => {
  const catalog = [
    { id: "openai/gpt-5.2", reasoningPreset: "none" },
    { id: "openai/gpt-5.2:high", reasoningPreset: "high" },
    { id: "openai/gpt-5.2:xhigh", reasoningPreset: "xhigh" },
  ];

  it("uses strict json_schema response format first", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ selectedModel: "openai/gpt-5.2" }) } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    await routeWithFrontierModel({
      apiKey: "test",
      baseUrl: "https://openrouter.ai/api/v1",
      input: "what was trumps latest tweet",
      catalog,
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const firstCall = fetchImpl.mock.calls[0];
    expect(firstCall).toBeDefined();
    const body = JSON.parse((firstCall?.[1] as RequestInit).body as string);
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.schema.properties.selectedModel.enum).toEqual(
      catalog.map((m) => m.id)
    );
    expect(body.messages[0].content).toContain("reasoning:xhigh");
  });

  it("falls back to json_object when schema mode is rejected", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 400, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify({ selectedModel: "openai/gpt-5.2:high" }) } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

    const result = await routeWithFrontierModel({
      apiKey: "test",
      baseUrl: "https://openrouter.ai/api/v1",
      input: "what was trumps latest tweet",
      catalog,
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const secondCall = fetchImpl.mock.calls[1];
    expect(secondCall).toBeDefined();
    const fallbackBody = JSON.parse((secondCall?.[1] as RequestInit).body as string);
    expect(fallbackBody.response_format).toEqual({ type: "json_object" });
    expect(result?.selectedModel).toBe("openai/gpt-5.2:high");
  });

  it("rejects parsed models not present in catalog", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ selectedModel: "openai/gpt-5.2:online" }) } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await routeWithFrontierModel({
      apiKey: "test",
      baseUrl: "https://openrouter.ai/api/v1",
      input: "what was trumps latest tweet",
      catalog,
      fetchImpl,
    });

    expect(result).toBeNull();
  });
});
