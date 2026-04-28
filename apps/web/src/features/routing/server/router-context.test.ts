import { describe, expect, it, vi } from "vitest";

import { resolveUserRoutingContext } from "./router-context";

vi.mock("@/src/lib/storage/repository", () => ({
  getRouterRepository: vi.fn(() => ({
    getConfig: vi.fn(async () => ({
      classifierModel: "system/classifier",
      defaultModel: "system/default",
      routingInstructions: "System instructions",
    })),
    getCatalog: vi.fn(async () => []),
  })),
}));

describe("resolveUserRoutingContext", () => {
  it("backfills OpenCode Go preset metadata for saved profiles before image-capability routing", async () => {
    const result = await resolveUserRoutingContext({
      body: {
        model: "opencode-go-coding",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "What is in this screenshot?" },
              { type: "image_url", image_url: { url: "data:image/png;base64,abc" } },
            ],
          },
        ],
      },
      userConfig: {
        gatewayRows: [
          {
            id: "gw_opencode_go",
            baseUrl: "https://opencode.ai/zen/go/v1",
            apiKeyEnc: "encrypted",
            models: [
              { id: "kimi-k2.6", name: "Kimi K2.6" },
              { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash" },
            ],
          },
        ],
        profiles: [
          {
            id: "opencode-go-coding",
            name: "OpenCode Go Coding",
            defaultModel: "gw_opencode_go::kimi-k2.6",
            classifierModel: "gw_opencode_go::deepseek-v4-flash",
            routingInstructions: "Route OpenCode Go coding work.",
            models: [
              {
                gatewayId: "gw_opencode_go",
                modelId: "kimi-k2.6",
                name: "Kimi K2.6",
              },
              {
                gatewayId: "gw_opencode_go",
                modelId: "deepseek-v4-flash",
                name: "DeepSeek V4 Flash",
              },
            ],
          },
        ],
      },
    });

    expect(result.runtimeConfig.defaultModel).toBe("kimi-k2.6");
    expect(result.runtimeConfig.classifierModel).toBe("deepseek-v4-flash");
    expect(result.catalog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "kimi-k2.6",
          modality: "text,image->text",
        }),
        expect.objectContaining({
          id: "deepseek-v4-flash",
          modality: "text->text",
        }),
      ]),
    );
  });
});
