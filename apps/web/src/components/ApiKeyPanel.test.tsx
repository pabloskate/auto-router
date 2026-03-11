import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ApiKeyPanel } from "./ApiKeyPanel";

describe("ApiKeyPanel", () => {
  it("renders OpenAI-compatible quickstart guidance", () => {
    const markup = renderToStaticMarkup(
      createElement(ApiKeyPanel, {
        keys: [],
        onKeysChanged: () => undefined,
        onStatus: () => undefined,
        onError: () => undefined,
      })
    );

    expect(markup).toContain("Quickstart");
    expect(markup).toContain("OpenAI-compatible");
    expect(markup).toContain("/api/v1/chat/completions");
    expect(markup).toContain("/api/v1/responses");
    expect(markup).toContain('model: &quot;auto&quot;');
    expect(markup).toContain("baseURL: &quot;/api/v1&quot;");
    expect(markup).toContain("Authorization: Bearer YOUR_API_KEY");
    expect(markup).toContain("Copy base URL");
    expect(markup).toContain("Copy endpoints");
    expect(markup).toContain("Copy SDK");
    expect(markup).toContain("Copy curl");
  });
});
