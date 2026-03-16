import { describe, expect, it } from "vitest";

import {
  createProfileFromPreset,
  getQuickSetupPresets,
  getProfileIdValidationError,
  normalizeProfileIdInput,
  normalizeProfilesForEditor,
} from "./profiles-editor-utils";
import { ROUTING_PRESETS } from "@/src/lib/routing-presets";

describe("normalizeProfilesForEditor", () => {
  it("preserves raw routing instruction whitespace while editing", () => {
    const profiles = normalizeProfilesForEditor(
      [
        {
          id: "planning-backend",
          name: "Planning Backend",
          routingInstructions: "Line one\n\n  indented line  ",
          models: [],
        },
      ],
      [],
    );

    expect(profiles[0]?.routingInstructions).toBe("Line one\n\n  indented line  ");
  });

  it("normalizes new profile ids into slug format", () => {
    expect(normalizeProfileIdInput(" Profile 2SFVdsfv jks od ow ")).toBe("profile-2sfvdsfv-jks-od-ow");
    expect(getProfileIdValidationError("profile-2sfvdsfv-jks-od-ow")).toBeNull();
    expect(getProfileIdValidationError("profile with spaces")).toBe("Profile IDs can only use lowercase letters, numbers, and hyphens.");
    expect(getProfileIdValidationError("auto")).toBeNull();
  });

  it("auto-binds suffixed OpenRouter variants to a unique synced base model", () => {
    const profiles = normalizeProfilesForEditor(
      [
        {
          id: "speed-first",
          name: "Speed First",
          models: [
            {
              modelId: "google/gemini-3.1-flash-lite-preview:nitro",
              name: "Gemini 3.1 Flash Lite (Nitro)",
            },
          ],
        },
      ],
      [
        {
          id: "gw_openrouter",
          name: "OpenRouter",
          baseUrl: "https://openrouter.ai/api/v1",
          createdAt: "2026-03-16T00:00:00.000Z",
          updatedAt: "2026-03-16T00:00:00.000Z",
          models: [
            {
              id: "google/gemini-3.1-flash-lite-preview",
              name: "Google: Gemini 3.1 Flash Lite Preview",
              modality: "text,image->text",
            },
          ],
        },
      ],
    );

    expect(profiles[0]?.models?.[0]).toMatchObject({
      gatewayId: "gw_openrouter",
      modelId: "google/gemini-3.1-flash-lite-preview:nitro",
      modality: "text,image->text",
    });
  });

  it("filters quick setup presets to the configured compatible gateways", () => {
    const presets = getQuickSetupPresets([
      {
        id: "gw_vercel",
        name: "Vercel AI Gateway",
        baseUrl: "https://ai-gateway.vercel.sh/v1",
        createdAt: "2026-03-16T00:00:00.000Z",
        updatedAt: "2026-03-16T00:00:00.000Z",
        models: [],
      },
      {
        id: "gw_custom",
        name: "Custom Gateway",
        baseUrl: "https://gateway.example.com/v1",
        createdAt: "2026-03-16T00:00:00.000Z",
        updatedAt: "2026-03-16T00:00:00.000Z",
        models: [],
      },
    ]);

    expect(presets.every((preset) => preset.gatewayPresetId === "vercel")).toBe(true);
    expect(presets.some((preset) => preset.id === "vercel-balanced")).toBe(true);
    expect(presets.some((preset) => preset.id === "general-balanced")).toBe(false);
  });
});

describe("createProfileFromPreset", () => {
  it("binds speed-first nitro models when only base OpenRouter ids are synced", () => {
    const speedFirst = ROUTING_PRESETS.find((preset) => preset.id === "speed-first");
    expect(speedFirst).toBeTruthy();

    const profile = createProfileFromPreset(speedFirst!, [
      {
        id: "gw_openrouter",
        name: "OpenRouter",
        baseUrl: "https://openrouter.ai/api/v1",
        createdAt: "2026-03-16T00:00:00.000Z",
        updatedAt: "2026-03-16T00:00:00.000Z",
        models: [
          { id: "inception/mercury-2", name: "Mercury 2" },
          { id: "bytedance-seed/seed-1.6-flash", name: "Seed 1.6 Flash" },
          { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast" },
          { id: "google/gemini-3.1-flash-lite-preview", name: "Google: Gemini 3.1 Flash Lite Preview" },
          { id: "meta-llama/llama-3.3-70b-instruct", name: "Meta: Llama 3.3 70B Instruct" },
        ],
      },
    ]);

    expect(profile.models).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          gatewayId: "gw_openrouter",
          modelId: "google/gemini-3.1-flash-lite-preview:nitro",
        }),
        expect.objectContaining({
          gatewayId: "gw_openrouter",
          modelId: "meta-llama/llama-3.3-70b-instruct:nitro",
        }),
      ]),
    );
  });

  it("binds the customer-support preset default and classifier to synced OpenRouter models", () => {
    const customerSupport = ROUTING_PRESETS.find((preset) => preset.id === "customer-support");
    expect(customerSupport).toBeTruthy();

    const profile = createProfileFromPreset(customerSupport!, [
      {
        id: "gw_openrouter",
        name: "OpenRouter",
        baseUrl: "https://openrouter.ai/api/v1",
        createdAt: "2026-03-16T00:00:00.000Z",
        updatedAt: "2026-03-16T00:00:00.000Z",
        models: [
          { id: "anthropic/claude-sonnet-4.6", name: "Anthropic: Claude Sonnet 4.6" },
          { id: "google/gemini-3.1-flash-lite-preview", name: "Google: Gemini 3.1 Flash Lite Preview" },
          { id: "google/gemini-3.1-pro-preview", name: "Google: Gemini 3.1 Pro Preview" },
          { id: "x-ai/grok-4.1-fast", name: "xAI: Grok 4.1 Fast" },
          { id: "bytedance-seed/seed-1.6-flash", name: "ByteDance Seed: Seed 1.6 Flash" },
          { id: "deepseek/deepseek-v3.2", name: "DeepSeek: DeepSeek V3.2" },
        ],
      },
    ]);

    expect(profile.defaultModel).toBe("gw_openrouter::anthropic/claude-sonnet-4.6");
    expect(profile.classifierModel).toBe("gw_openrouter::google/gemini-3.1-flash-lite-preview");
    expect(profile.models).toHaveLength(5);
    expect(profile.models).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          gatewayId: "gw_openrouter",
          modelId: "google/gemini-3.1-pro-preview",
        }),
        expect.objectContaining({
          gatewayId: "gw_openrouter",
          modelId: "x-ai/grok-4.1-fast",
        }),
      ]),
    );
  });

  it("binds the vercel customer-support preset to synced Vercel AI Gateway models", () => {
    const vercelSupport = ROUTING_PRESETS.find((preset) => preset.id === "vercel-customer-support");
    expect(vercelSupport).toBeTruthy();

    const profile = createProfileFromPreset(vercelSupport!, [
      {
        id: "gw_vercel",
        name: "Vercel AI Gateway",
        baseUrl: "https://ai-gateway.vercel.sh/v1",
        createdAt: "2026-03-16T00:00:00.000Z",
        updatedAt: "2026-03-16T00:00:00.000Z",
        models: [
          { id: "anthropic/claude-sonnet-4.6", name: "Claude Sonnet 4.6" },
          { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
          { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
          { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
          { id: "openai/gpt-5-mini", name: "GPT-5 mini" },
          { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2" },
        ],
      },
    ]);

    expect(profile.defaultModel).toBe("gw_vercel::anthropic/claude-sonnet-4.6");
    expect(profile.classifierModel).toBe("gw_vercel::google/gemini-2.5-flash-lite");
    expect(profile.models).toHaveLength(5);
    expect(profile.models).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          gatewayId: "gw_vercel",
          modelId: "google/gemini-2.5-pro",
        }),
        expect.objectContaining({
          gatewayId: "gw_vercel",
          modelId: "openai/gpt-5-mini",
        }),
      ]),
    );
  });

  it("binds the vercel premium coding preset to synced Vercel AI Gateway models", () => {
    const vercelPremiumCoding = ROUTING_PRESETS.find((preset) => preset.id === "vercel-coding-agentic-premium");
    expect(vercelPremiumCoding).toBeTruthy();

    const profile = createProfileFromPreset(vercelPremiumCoding!, [
      {
        id: "gw_vercel",
        name: "Vercel AI Gateway",
        baseUrl: "https://ai-gateway.vercel.sh/v1",
        createdAt: "2026-03-16T00:00:00.000Z",
        updatedAt: "2026-03-16T00:00:00.000Z",
        models: [
          { id: "anthropic/claude-sonnet-4.6", name: "Claude Sonnet 4.6" },
          { id: "anthropic/claude-opus-4.6", name: "Claude Opus 4.6" },
          { id: "openai/gpt-5.4", name: "GPT 5.4" },
          { id: "openai/gpt-5-codex", name: "GPT-5 Codex" },
          { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
          { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
        ],
      },
    ]);

    expect(profile.defaultModel).toBe("gw_vercel::anthropic/claude-sonnet-4.6");
    expect(profile.classifierModel).toBe("gw_vercel::google/gemini-2.5-flash-lite");
    expect(profile.models).toHaveLength(5);
    expect(profile.models).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          gatewayId: "gw_vercel",
          modelId: "anthropic/claude-opus-4.6",
        }),
        expect.objectContaining({
          gatewayId: "gw_vercel",
          modelId: "openai/gpt-5-codex",
        }),
      ]),
    );
  });
});
