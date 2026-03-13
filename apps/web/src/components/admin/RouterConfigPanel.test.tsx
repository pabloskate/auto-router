import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RouterConfigPanel } from "./RouterConfigPanel";

describe("RouterConfigPanel", () => {
  it("renders Fallback Model and Classifier Model labels and hints", () => {
    const markup = renderToStaticMarkup(
      createElement(RouterConfigPanel, {
        config: {
          defaultModel: null,
          classifierModel: null,
          routingInstructions: null,
          blocklist: null,
          showModelInResponse: false,
          configAgentEnabled: false,
          configAgentOrchestratorModel: null,
          configAgentSearchModel: null,
        },
        gatewayModelOptions: ["model/a", "model/b"],
        onChange: () => undefined,
        saveState: "pristine",
        onSave: async () => true,
      })
    );

    expect(markup).toContain("Fallback Model");
    expect(markup).toContain("Classifier Model");
    expect(markup).toContain("Used when the classifier fails to decide");
    expect(markup).toContain("Cheap, fast model for routing decisions");
  });

  it("renders the optional Config Agent card with command guidance when enabled", () => {
    const markup = renderToStaticMarkup(
      createElement(RouterConfigPanel, {
        config: {
          defaultModel: null,
          classifierModel: null,
          routingInstructions: null,
          blocklist: null,
          showModelInResponse: false,
          configAgentEnabled: true,
          configAgentOrchestratorModel: null,
          configAgentSearchModel: null,
        },
        gatewayModelOptions: ["model/orchestrator", "model/search"],
        onChange: () => undefined,
        saveState: "dirty",
        onSave: async () => true,
      })
    );

    expect(markup).toContain("Config Agent (Optional)");
    expect(markup).toContain("Only needed if you want to manage router settings via chat.");
    expect(markup).toContain("$$config");
    expect(markup).toContain("#endconfig");
    expect(markup).toContain("Recommend latest model for coding");
    expect(markup).toContain("Unsaved changes");
    expect(markup).toContain("Save configuration");
  });

  it("hides Config Agent details when disabled", () => {
    const markup = renderToStaticMarkup(
      createElement(RouterConfigPanel, {
        config: {
          defaultModel: null,
          classifierModel: null,
          routingInstructions: null,
          blocklist: null,
          showModelInResponse: false,
          configAgentEnabled: false,
          configAgentOrchestratorModel: null,
          configAgentSearchModel: null,
        },
        gatewayModelOptions: ["model/orchestrator", "model/search"],
        onChange: () => undefined,
        saveState: "saving",
        onSave: async () => true,
      })
    );

    expect(markup).toContain("Enable Config Agent");
    expect(markup).toContain("$$config");
    expect(markup).not.toContain("Config Agent (Optional)");
    expect(markup).not.toContain("Config Orchestrator Model");
    expect(markup).not.toContain("#endconfig");
    expect(markup).toContain("Saving changes...");
    expect(markup).toContain("Saving...");
  });
});
