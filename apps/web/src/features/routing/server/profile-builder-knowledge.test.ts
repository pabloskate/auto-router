import { describe, expect, it } from "vitest";

import {
  MODEL_INTELLIGENCE,
  MODEL_INTELLIGENCE_LAST_VERIFIED,
} from "./model-intelligence";
import {
  getProfileBuilderKnowledge,
  mergeProfileBuilderSources,
  PROFILE_BUILDER_KNOWLEDGE,
  PROFILE_BUILDER_LAST_VERIFIED,
  profileBuilderResearchModeFromVerification,
} from "./profile-builder-knowledge";

describe("profile-builder-knowledge", () => {
  it("derives one knowledge entry per model-intelligence entry", () => {
    expect(PROFILE_BUILDER_LAST_VERIFIED).toBe(MODEL_INTELLIGENCE_LAST_VERIFIED);
    expect(PROFILE_BUILDER_KNOWLEDGE).toHaveLength(MODEL_INTELLIGENCE.length);
  });

  it("maps coarse profile-builder fields from the canonical model dataset", () => {
    expect(getProfileBuilderKnowledge("openai/gpt-5.4-mini")).toMatchObject({
      id: "openai/gpt-5.4-mini",
      supportedGateways: ["openrouter", "vercel"],
      contextBand: "long",
      costTier: "mid",
      vision: true,
      structuredOutput: true,
      toolUse: true,
      quality: 3,
      speed: 3,
      cost: 2,
      reliability: 3,
      taskFamilies: ["general", "coding", "agentic_coding", "multimodal"],
    });
    expect(getProfileBuilderKnowledge("openai/gpt-5.4-mini")?.strengths).toEqual(
      expect.arrayContaining(["Fast frontier model", "Reliable tools and JSON"]),
    );

    expect(getProfileBuilderKnowledge("minimax/minimax-m2.7")).toMatchObject({
      costTier: "efficient",
      quality: 3,
      speed: 2,
      cost: 2,
      reliability: 2,
    });

    expect(getProfileBuilderKnowledge("inception/mercury-2")).toMatchObject({
      costTier: "budget",
      speed: 3,
      cost: 3,
    });
  });

  it("dedupes sources that come from raw metrics", () => {
    const knowledge = getProfileBuilderKnowledge("openai/gpt-5.4-mini");

    expect(knowledge?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "OpenRouter models API",
          url: "https://openrouter.ai/api/v1/models",
        }),
        expect.objectContaining({
          label: "Artificial Analysis - GPT-5.4 mini",
          url: "https://artificialanalysis.ai/models/gpt-5-4-mini",
        }),
      ]),
    );

    const merged = mergeProfileBuilderSources(knowledge?.sources ?? [], knowledge?.sources ?? []);
    expect(merged).toHaveLength(knowledge?.sources.length ?? 0);
  });

  it("preserves the research mode helper contract", () => {
    expect(profileBuilderResearchModeFromVerification(true)).toBe("live_verified");
    expect(profileBuilderResearchModeFromVerification(false)).toBe("catalog_only");
  });
});
