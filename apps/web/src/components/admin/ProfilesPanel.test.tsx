import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProfilesPanel } from "./ProfilesPanel";

const GATEWAYS = [
  {
    id: "gw_openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      { id: "model/a", name: "Model A" },
      { id: "model/b", name: "Model B" },
    ],
    createdAt: "2026-03-16T00:00:00.000Z",
    updatedAt: "2026-03-16T00:00:00.000Z",
  },
];

describe("ProfilesPanel", () => {
  it("renders quick setup and the required auto profile", () => {
    const markup = renderToStaticMarkup(
      createElement(ProfilesPanel, {
        profiles: [{ id: "auto", name: "Auto", models: [] }],
        gateways: GATEWAYS,
        onChange: () => undefined,
        saveState: "dirty",
        onSave: async () => true,
      }),
    );

    expect(markup).toContain("Quick Setup");
    expect(markup).toContain("Required");
    expect(markup).toContain("Save profiles");
    expect(markup).toContain("Add profile");
  });

  it("renders the reset notice when legacy routing config is detected", () => {
    const markup = renderToStaticMarkup(
      createElement(ProfilesPanel, {
        profiles: null,
        gateways: GATEWAYS,
        onChange: () => undefined,
        saveState: "pristine",
        onSave: async () => true,
        routingConfigRequiresReset: true,
        routingConfigResetMessage: "Legacy routing settings were detected.",
      }),
    );

    expect(markup).toContain("Routing profiles need to be rebuilt");
    expect(markup).toContain("Reset routing profiles");
  });
});
