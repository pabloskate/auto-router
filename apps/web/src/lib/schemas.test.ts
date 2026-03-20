import { describe, expect, it } from "vitest";

import { profileBuilderRequestSchema, routerProfileSchema, updateGatewaySchema } from "./schemas";

describe("updateGatewaySchema", () => {
  it("accepts gateway models with reasoningPreset", () => {
    const parsed = updateGatewaySchema.safeParse({
      models: [
        {
          id: "openai/gpt-5.2:high",
          name: "GPT-5.2 High",
          reasoningPreset: "high",
          thinking: "high",
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts provider_default for gateway model reasoning", () => {
    const parsed = updateGatewaySchema.safeParse({
      models: [
        {
          id: "google/gemini-2.5-pro",
          name: "Gemini 2.5 Pro",
          reasoningPreset: "provider_default",
          thinking: "provider_default",
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects duplicate gateway model ids", () => {
    const parsed = updateGatewaySchema.safeParse({
      models: [
        { id: "openai/gpt-5.2", name: "GPT-5.2" },
        { id: "openai/gpt-5.2", name: "GPT-5.2 Duplicate" },
      ],
    });

    expect(parsed.success).toBe(false);
  });
});

describe("routerProfileSchema", () => {
  it("accepts fixed_provider_default reasoning policy mode", () => {
    const parsed = routerProfileSchema.safeParse({
      id: "adaptive-gemini",
      name: "Adaptive Gemini",
      reasoningPolicy: {
        mode: "fixed_provider_default",
      },
      models: [
        {
          gatewayId: "gw_default",
          modelId: "google/gemini-2.5-pro",
          reasoningPreset: "provider_default",
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });
});

describe("profileBuilderRequestSchema", () => {
  it("accepts additionalContext as a freeform field", () => {
    const parsed = profileBuilderRequestSchema.safeParse({
      profileId: "agent-profile",
      displayName: "Agent Profile",
      optimizeFor: "balanced",
      taskFamilies: ["general", "coding"],
      needsVision: false,
      needsLongContext: false,
      latencySensitivity: "medium",
      budgetPosture: "balanced",
      additionalContext: "Prioritize stable model picks for internal ticket triage and include one stronger fallback for escalations.",
    });

    expect(parsed.success).toBe(true);
  });
});
