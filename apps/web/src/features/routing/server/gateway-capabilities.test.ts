import { describe, expect, it } from "vitest";

import { GATEWAY_CAPABILITY_PROFILES, getCapabilityForPreset, resolveGatewayCapabilityForBaseUrl } from "./gateway-capabilities";
import { GATEWAY_PRESETS } from "@/src/lib/gateway-presets";

describe("gateway capability registry", () => {
  it("covers every preset", () => {
    for (const preset of GATEWAY_PRESETS) {
      expect(GATEWAY_CAPABILITY_PROFILES[preset.id]).toBeDefined();
    }
  });

  it("normalizes base URLs when resolving", () => {
    const profile = resolveGatewayCapabilityForBaseUrl("https://openrouter.ai/api/v1/");
    expect(profile.tier).toBe("full");
    expect(profile.supportsReasoningEffort).toBe(true);
  });

  it("recognizes the OpenCode Go base URL", () => {
    const profile = resolveGatewayCapabilityForBaseUrl("https://opencode.ai/zen/go/v1/");
    expect(profile.tier).toBe("basic");
    expect(profile.supportsReasoningEffort).toBe(false);
  });

  it("falls back when base URL is unknown", () => {
    const profile = resolveGatewayCapabilityForBaseUrl("https://example.com/no-gateway");
    expect(profile.tier).toBe("basic");
    expect(profile.supportsReasoningEffort).toBe(false);
  });

  it("returns the default profile for unknown presets", () => {
    const profile = getCapabilityForPreset("unknown-preset");
    expect(profile.tier).toBe("basic");
    expect(profile.supportsAdaptiveInFamilyShift).toBe(false);
  });
});
