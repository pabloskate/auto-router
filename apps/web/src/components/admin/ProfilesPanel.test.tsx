import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  type RouterProfile,
  normalizeProfile,
  ProfilesPanel,
} from "./ProfilesPanel";

describe("ProfilesPanel", () => {
  it("renders Override global models toggle when profile is not auto", () => {
    const markup = renderToStaticMarkup(
      createElement(ProfilesPanel, {
        profiles: [
          { id: "auto", name: "Auto" },
          { id: "", name: "" },
        ],
        gatewayModelOptions: ["model/a", "model/b"],
        onChange: () => undefined,
        saveState: "dirty",
        onSave: async () => true,
      })
    );

    expect(markup).toContain("Override global models");
    expect(markup).toContain("Required");
    expect(markup).toContain("Unsaved changes");
    expect(markup).toContain("Save profiles");
  });

  it("shows auto profile as required and non-deletable", () => {
    const markup = renderToStaticMarkup(
      createElement(ProfilesPanel, {
        profiles: [{ id: "auto", name: "Auto" }],
        gatewayModelOptions: [],
        onChange: () => undefined,
        saveState: "saved",
        onSave: async () => true,
      })
    );

    expect(markup).toContain("auto");
    expect(markup).toContain("Required");
    expect(markup).toContain("All changes saved");
  });

  it("always shows at least auto profile when profiles is empty", () => {
    const markup = renderToStaticMarkup(
      createElement(ProfilesPanel, {
        profiles: [],
        gatewayModelOptions: [],
        onChange: () => undefined,
        saveState: "pristine",
        onSave: async () => true,
      })
    );

    expect(markup).toContain("auto");
    expect(markup).not.toContain("No Routing Profiles");
  });
});

describe("normalizeProfile", () => {
  it("leaves overrideModels unchanged when already set", () => {
    const p: RouterProfile = {
      id: "auto-cheap",
      name: "Cheap",
      overrideModels: true,
    };
    expect(normalizeProfile(p).overrideModels).toBe(true);
  });

  it("derives overrideModels=true when defaultModel or classifierModel is set", () => {
    expect(normalizeProfile({ id: "p", name: "P", defaultModel: "m1" }).overrideModels).toBe(true);
    expect(normalizeProfile({ id: "p", name: "P", classifierModel: "m2" }).overrideModels).toBe(true);
  });

  it("derives overrideModels=false when neither model is set", () => {
    expect(normalizeProfile({ id: "p", name: "P" }).overrideModels).toBe(false);
  });
});
