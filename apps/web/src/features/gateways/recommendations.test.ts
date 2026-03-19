import { describe, expect, it } from "vitest";

import {
  GATEWAY_RECOMMENDATIONS,
  GATEWAY_SPEND_GUIDANCE,
  getDirectProviderPresets,
  getGatewayFormHint,
  getRecommendedGatewayPresets,
  isQuickSetupGatewayPreset,
} from "@/src/features/gateways/recommendations";

describe("gateway recommendations", () => {
  it("keeps the recommended gateway order stable", () => {
    expect(GATEWAY_RECOMMENDATIONS.map((entry) => entry.id)).toEqual([
      "openrouter",
      "vercel",
      "cloudflare",
    ]);
  });

  it("limits quick setup presets to openrouter and vercel", () => {
    expect(getRecommendedGatewayPresets().map((preset) => preset.id)).toEqual(["openrouter", "vercel"]);
    expect(isQuickSetupGatewayPreset("openrouter")).toBe(true);
    expect(isQuickSetupGatewayPreset("vercel")).toBe(true);
    expect(isQuickSetupGatewayPreset("openai")).toBe(false);
  });

  it("keeps direct providers out of the recommended preset group", () => {
    expect(getDirectProviderPresets().some((preset) => preset.id === "openai")).toBe(true);
    expect(getDirectProviderPresets().some((preset) => preset.id === "openrouter")).toBe(false);
  });

  it("provides hints for default, custom, and direct provider setups", () => {
    expect(getGatewayFormHint()).toContain("OpenRouter");
    expect(getGatewayFormHint("__custom__")).toContain("Cloudflare AI Gateway");
    expect(getGatewayFormHint("openai")).toContain("Direct providers");
  });

  it("keeps spend guidance aligned with upstream billing expectations", () => {
    expect(GATEWAY_SPEND_GUIDANCE).toContain("CustomRouter routes requests");
    expect(GATEWAY_SPEND_GUIDANCE).toContain("spend caps");
  });
});
