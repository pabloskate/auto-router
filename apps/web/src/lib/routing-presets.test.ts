import { describe, expect, it } from "vitest";

import { getGatewayPresetId } from "./routing-presets";

describe("getGatewayPresetId", () => {
  it("recognizes the Vercel AI Gateway base URL", () => {
    expect(getGatewayPresetId("https://ai-gateway.vercel.sh/v1")).toBe("vercel");
    expect(getGatewayPresetId("https://ai-gateway.vercel.sh/v1/")).toBe("vercel");
  });

  it("returns undefined for unrecognized gateways", () => {
    expect(getGatewayPresetId("https://gateway.example.com/v1")).toBeUndefined();
  });
});
