import { describe, expect, it } from "vitest";
import { buildPromptWindow } from "../src/llm-router";
import type { ChatMessage } from "../src/types";

describe("buildPromptWindow", () => {
  it("prefers recent user messages instead of stale early history", () => {
    const messages: ChatMessage[] = [
      { role: "system", content: "System instruction" },
      { role: "user", content: "u1" },
      { role: "user", content: "u2" },
      { role: "user", content: "u3" },
      { role: "user", content: "u4" },
      { role: "user", content: "u5" },
      { role: "user", content: "u6" },
      { role: "user", content: "u7_latest" },
    ];

    const prompt = buildPromptWindow({ messages });

    expect(prompt).toContain("u7_latest");
    expect(prompt).not.toContain("u1");
  });

  it("extracts prompt text from responses input string", () => {
    const prompt = buildPromptWindow({ input: "Route this by latest user intent." });

    expect(prompt).toBe("Route this by latest user intent.");
  });

  it("extracts responses array items (message + input_text)", () => {
    const prompt = buildPromptWindow({
      input: [
        {
          type: "message",
          role: "system",
          content: [{ type: "input_text", text: "sys context" }],
        },
        {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "latest user request" }],
        },
        { type: "input_text", text: "extra user text" },
      ],
    });

    expect(prompt).toContain("sys context");
    expect(prompt).toContain("latest user request");
    expect(prompt).toContain("extra user text");
  });
});
