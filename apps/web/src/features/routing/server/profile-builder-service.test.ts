import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthResult } from "@/src/lib/auth";
import type { BuilderCandidate } from "./profile-builder-service";
import {
  handleApplyProfileBuilderRun,
  handleCreateProfileBuilderRun,
  handleGetProfileBuilderRun,
  maybeLiveVerifyOpenRouter,
  selectProfileBuilderExecutor,
} from "./profile-builder-service";
import { getProfileBuilderRun, insertProfileBuilderRun } from "./profile-builder-store";
import { gatewayRowToPublic, loadGatewaysWithMigration } from "@/src/lib/storage";
import { validateModelId } from "@/src/lib/upstream/openrouter-models";

vi.mock("@/src/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/src/lib/storage")>("@/src/lib/storage");
  return {
    ...actual,
    gatewayRowToPublic: vi.fn(),
    loadGatewaysWithMigration: vi.fn(),
  };
});

vi.mock("./profile-builder-store", async () => {
  const actual = await vi.importActual<typeof import("./profile-builder-store")>("./profile-builder-store");
  return {
    ...actual,
    getProfileBuilderRun: vi.fn(),
    insertProfileBuilderRun: vi.fn(),
    completeProfileBuilderRun: vi.fn(),
    failProfileBuilderRun: vi.fn(),
  };
});

vi.mock("@/src/lib/upstream/openrouter-models", async () => {
  const actual = await vi.importActual<typeof import("@/src/lib/upstream/openrouter-models")>("@/src/lib/upstream/openrouter-models");
  return {
    ...actual,
    validateModelId: vi.fn(),
  };
});

function createAuth(overrides: Partial<AuthResult> = {}): AuthResult {
  return {
    userId: "user_1",
    userName: "Test User",
    preferredModels: [],
    defaultModel: null,
    classifierModel: null,
    routingInstructions: null,
    blocklist: null,
    customCatalog: null,
    profiles: [],
    routeTriggerKeywords: null,
    routingFrequency: null,
    routingConfigRequiresReset: false,
    upstreamBaseUrl: null,
    upstreamApiKeyEnc: null,
    classifierBaseUrl: null,
    classifierApiKeyEnc: null,
    ...overrides,
  };
}

function createBindings() {
  const runMock = vi.fn(async () => ({ meta: { changes: 1 } }));
  const bindMock = vi.fn((_args: unknown[]) => ({ run: runMock }));
  const prepareMock = vi.fn((_sql: string) => ({ bind: (...args: unknown[]) => bindMock(args) }));
  return {
    ROUTER_DB: {
      prepare: prepareMock,
    } as any,
    BYOK_ENCRYPTION_SECRET: "1234567890abcdef",
    __bindMock: bindMock,
    __prepareMock: prepareMock,
    __runMock: runMock,
  };
}

function createCandidate(overrides: Partial<BuilderCandidate> & Pick<BuilderCandidate, "model" | "knowledge">): BuilderCandidate {
  return {
    gatewayId: "gw_openrouter",
    gatewayName: "OpenRouter",
    gatewayPresetId: "openrouter",
    score: 10,
    liveVerified: false,
    ...overrides,
  };
}

describe("profile-builder-service", () => {
  const loadGatewaysMock = vi.mocked(loadGatewaysWithMigration);
  const gatewayRowToPublicMock = vi.mocked(gatewayRowToPublic);
  const getRunMock = vi.mocked(getProfileBuilderRun);
  const insertRunMock = vi.mocked(insertProfileBuilderRun);
  const validateModelIdMock = vi.mocked(validateModelId);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects create-run when no supported gateway with synced models is available", async () => {
    loadGatewaysMock.mockResolvedValue([
      {
        id: "gw_custom",
        user_id: "user_1",
        name: "Custom",
        base_url: "https://gateway.example.com/v1",
        api_key_enc: "enc:key",
        models_json: "[]",
        created_at: "2026-03-19T00:00:00.000Z",
        updated_at: "2026-03-19T00:00:00.000Z",
      },
    ] as any);
    gatewayRowToPublicMock.mockReturnValue({
      id: "gw_custom",
      baseUrl: "https://gateway.example.com/v1",
      apiKeyEnc: "enc:key",
      models: [],
    } as any);

    const response = await handleCreateProfileBuilderRun(
      new Request("http://localhost/api/v1/user/profile-builder/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profileId: "agent-profile",
          displayName: "Agent Profile",
          optimizeFor: "balanced",
          taskFamilies: ["general", "coding"],
          needsVision: false,
          needsLongContext: false,
          latencySensitivity: "medium",
          budgetPosture: "balanced",
          additionalContext: "Prefer exact structured outputs for internal automations.",
        }),
      }),
      createAuth(),
      createBindings() as any,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("supported gateway"),
    });
  });

  it("creates a running run with the preferred executor when supported models exist", async () => {
    loadGatewaysMock.mockResolvedValue([
      {
        id: "gw_openrouter",
        user_id: "user_1",
        name: "OpenRouter",
        base_url: "https://openrouter.ai/api/v1",
        api_key_enc: "enc:key",
        models_json: "[]",
        created_at: "2026-03-19T00:00:00.000Z",
        updated_at: "2026-03-19T00:00:00.000Z",
      },
    ] as any);
    gatewayRowToPublicMock.mockReturnValue({
      id: "gw_openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKeyEnc: "enc:key",
      models: [
        { id: "openai/gpt-5.4-mini", name: "GPT-5.4 mini", modality: "text,image->text" },
        { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", modality: "text,image->text" },
      ],
    } as any);
    insertRunMock.mockImplementation(async (args) => ({
      id: args.id,
      status: "running",
      request: args.request,
      executor: args.executor,
      recommendations: [],
      rejections: [],
      sources: [],
      createdAt: "2026-03-19T00:00:00.000Z",
      updatedAt: "2026-03-19T00:00:00.000Z",
    }));

    const response = await handleCreateProfileBuilderRun(
      new Request("http://localhost/api/v1/user/profile-builder/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profileId: "agent-profile",
          displayName: "Agent Profile",
          optimizeFor: "balanced",
          taskFamilies: ["general", "coding"],
          needsVision: false,
          needsLongContext: false,
          latencySensitivity: "medium",
          budgetPosture: "balanced",
          additionalContext: "Need low-noise outputs for downstream tooling.",
        }),
      }),
      createAuth(),
      createBindings() as any,
    );

    expect(response.status).toBe(202);
    const body = await response.json() as { run: { executor: { modelId: string }; request: { additionalContext?: string } } };
    expect(body.run.executor.modelId).toBe("openai/gpt-5.4-mini");
    expect(body.run.request.additionalContext).toBe("Need low-noise outputs for downstream tooling.");
  });

  it("returns running, completed, and error status payloads", async () => {
    const auth = createAuth();
    const bindings = createBindings();

    getRunMock.mockResolvedValueOnce({
      id: "run_1",
      status: "running",
      request: {
        profileId: "agent-profile",
        displayName: "Agent Profile",
        optimizeFor: "balanced",
        taskFamilies: ["general"],
        needsVision: false,
        needsLongContext: false,
        latencySensitivity: "medium",
        budgetPosture: "balanced",
      },
      executor: {
        gatewayId: "gw_openrouter",
        gatewayName: "OpenRouter",
        gatewayPresetId: "openrouter",
        modelId: "openai/gpt-5.4-mini",
        modelName: "GPT-5.4 mini",
      },
      recommendations: [],
      rejections: [],
      sources: [],
      createdAt: "2026-03-19T00:00:00.000Z",
      updatedAt: "2026-03-19T00:00:00.000Z",
    });
    let response = await handleGetProfileBuilderRun(auth, bindings as any, "run_1");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ run: { status: "running" } });

    getRunMock.mockResolvedValueOnce({
      id: "run_1",
      status: "completed",
      request: {
        profileId: "agent-profile",
        displayName: "Agent Profile",
        optimizeFor: "balanced",
        taskFamilies: ["general"],
        needsVision: false,
        needsLongContext: false,
        latencySensitivity: "medium",
        budgetPosture: "balanced",
      },
      executor: {
        gatewayId: "gw_openrouter",
        gatewayName: "OpenRouter",
        gatewayPresetId: "openrouter",
        modelId: "openai/gpt-5.4-mini",
        modelName: "GPT-5.4 mini",
      },
      draftProfile: { id: "agent-profile", name: "Agent Profile", models: [] },
      recommendations: [],
      rejections: [],
      sources: [],
      createdAt: "2026-03-19T00:00:00.000Z",
      updatedAt: "2026-03-19T00:00:00.000Z",
      finishedAt: "2026-03-19T00:00:02.000Z",
    });
    response = await handleGetProfileBuilderRun(auth, bindings as any, "run_1");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ run: { status: "completed" } });

    getRunMock.mockResolvedValueOnce({
      id: "run_1",
      status: "error",
      request: {
        profileId: "agent-profile",
        displayName: "Agent Profile",
        optimizeFor: "balanced",
        taskFamilies: ["general"],
        needsVision: false,
        needsLongContext: false,
        latencySensitivity: "medium",
        budgetPosture: "balanced",
      },
      executor: {
        gatewayId: "gw_openrouter",
        gatewayName: "OpenRouter",
        gatewayPresetId: "openrouter",
        modelId: "openai/gpt-5.4-mini",
        modelName: "GPT-5.4 mini",
      },
      recommendations: [],
      rejections: [],
      sources: [],
      error: "boom",
      createdAt: "2026-03-19T00:00:00.000Z",
      updatedAt: "2026-03-19T00:00:02.000Z",
      finishedAt: "2026-03-19T00:00:02.000Z",
    });
    response = await handleGetProfileBuilderRun(auth, bindings as any, "run_1");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ run: { status: "error", error: "boom" } });
  });

  it("applies a completed draft by writing exactly one new profile", async () => {
    const bindings = createBindings();
    getRunMock.mockResolvedValue({
      id: "run_1",
      status: "completed",
      request: {
        profileId: "agent-profile",
        displayName: "Agent Profile",
        optimizeFor: "balanced",
        taskFamilies: ["general"],
        needsVision: false,
        needsLongContext: false,
        latencySensitivity: "medium",
        budgetPosture: "balanced",
      },
      executor: {
        gatewayId: "gw_openrouter",
        gatewayName: "OpenRouter",
        gatewayPresetId: "openrouter",
        modelId: "openai/gpt-5.4-mini",
        modelName: "GPT-5.4 mini",
      },
      draftProfile: {
        id: "agent-profile",
        name: "Agent Profile",
        models: [
          {
            gatewayId: "gw_openrouter",
            modelId: "openai/gpt-5.4-mini",
            name: "GPT-5.4 mini",
          },
        ],
        defaultModel: "gw_openrouter::openai/gpt-5.4-mini",
        classifierModel: "gw_openrouter::openai/gpt-5.4-mini",
      },
      recommendations: [],
      rejections: [],
      sources: [],
      createdAt: "2026-03-19T00:00:00.000Z",
      updatedAt: "2026-03-19T00:00:02.000Z",
      finishedAt: "2026-03-19T00:00:02.000Z",
    });
    loadGatewaysMock.mockResolvedValue([
      {
        id: "gw_openrouter",
        user_id: "user_1",
        name: "OpenRouter",
        base_url: "https://openrouter.ai/api/v1",
        api_key_enc: "enc:key",
        models_json: "[]",
        created_at: "2026-03-19T00:00:00.000Z",
        updated_at: "2026-03-19T00:00:00.000Z",
      },
    ] as any);
    gatewayRowToPublicMock.mockReturnValue({
      id: "gw_openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKeyEnc: "enc:key",
      models: [{ id: "openai/gpt-5.4-mini", name: "GPT-5.4 mini" }],
    } as any);

    const response = await handleApplyProfileBuilderRun({
      request: new Request("http://localhost/api/v1/user/profile-builder/runs/run_1/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      auth: createAuth(),
      bindings: bindings as any,
      runId: "run_1",
    });

    expect(response.status).toBe(200);
    const updateSql = bindings.__prepareMock.mock.calls.find((entry: [string]) => entry[0].includes("UPDATE users"))?.[0] ?? "";
    expect(updateSql).toContain("profiles = ?1");
    const bindArgs = bindings.__bindMock.mock.calls.at(-1)?.[0] ?? [];
    expect(JSON.parse(String(bindArgs[0]))).toHaveLength(1);
  });

  it("rejects apply when the edited profile id already exists", async () => {
    const bindings = createBindings();
    getRunMock.mockResolvedValue({
      id: "run_1",
      status: "completed",
      request: {
        profileId: "agent-profile",
        displayName: "Agent Profile",
        optimizeFor: "balanced",
        taskFamilies: ["general"],
        needsVision: false,
        needsLongContext: false,
        latencySensitivity: "medium",
        budgetPosture: "balanced",
      },
      executor: {
        gatewayId: "gw_openrouter",
        gatewayName: "OpenRouter",
        gatewayPresetId: "openrouter",
        modelId: "openai/gpt-5.4-mini",
        modelName: "GPT-5.4 mini",
      },
      draftProfile: { id: "agent-profile", name: "Agent Profile", models: [] },
      recommendations: [],
      rejections: [],
      sources: [],
      createdAt: "2026-03-19T00:00:00.000Z",
      updatedAt: "2026-03-19T00:00:02.000Z",
      finishedAt: "2026-03-19T00:00:02.000Z",
    });

    const response = await handleApplyProfileBuilderRun({
      request: new Request("http://localhost/api/v1/user/profile-builder/runs/run_1/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profileId: "existing-profile" }),
      }),
      auth: createAuth({
        profiles: [{ id: "existing-profile", name: "Existing Profile", models: [] }],
      }),
      bindings: bindings as any,
      runId: "run_1",
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("already exists"),
    });
  });

  it("falls back from GPT-5.4 mini to Claude Haiku for executor selection", () => {
    const executor = selectProfileBuilderExecutor([
      createCandidate({
        model: { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5" },
        knowledge: {
          id: "anthropic/claude-haiku-4.5",
          name: "Claude Haiku 4.5",
          supportedGateways: ["openrouter"],
          contextBand: "long",
          costTier: "efficient",
          vision: true,
          structuredOutput: true,
          toolUse: true,
          quality: 2,
          speed: 3,
          cost: 2,
          reliability: 3,
          taskFamilies: ["general"],
          strengths: ["fast"],
          whenToUse: "fast",
          lastVerified: "2026-03-19",
          sources: [],
        },
      }),
      createCandidate({
        model: { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
        knowledge: {
          id: "google/gemini-2.5-flash",
          name: "Gemini 2.5 Flash",
          supportedGateways: ["openrouter"],
          contextBand: "ultra",
          costTier: "efficient",
          vision: true,
          structuredOutput: true,
          toolUse: true,
          quality: 2,
          speed: 3,
          cost: 2,
          reliability: 2,
          taskFamilies: ["general"],
          strengths: ["fast"],
          whenToUse: "fast",
          lastVerified: "2026-03-19",
          sources: [],
        },
      }),
    ]);

    expect(executor?.model.id).toBe("anthropic/claude-haiku-4.5");
  });

  it("live-verifies OpenRouter candidates without mutating the original input", async () => {
    validateModelIdMock.mockResolvedValue({
      id: "openai/gpt-5.4-mini",
      name: "GPT-5.4 mini",
      context_length: 400000,
      pricing: {
        prompt: "0.00000075",
        completion: "0.0000045",
      },
      architecture: { modality: "text+image->text" },
    });
    const candidate = createCandidate({
      model: { id: "openai/gpt-5.4-mini", name: "GPT-5.4 mini" },
      knowledge: {
        id: "openai/gpt-5.4-mini",
        name: "GPT-5.4 mini",
        supportedGateways: ["openrouter"],
        contextBand: "long",
        costTier: "mid",
        vision: true,
        structuredOutput: true,
        toolUse: true,
        quality: 3,
        speed: 3,
        cost: 2,
        reliability: 3,
        taskFamilies: ["general"],
        strengths: ["fast"],
        whenToUse: "fast",
        lastVerified: "2026-03-19",
        sources: [],
      },
    });

    const result = await maybeLiveVerifyOpenRouter([candidate]);
    expect(result.usedLiveVerification).toBe(true);
    expect(result.candidates[0]?.liveVerified).toBe(true);
    expect(result.candidates[0]?.contextSummary).toContain("400K");
    expect(candidate.liveVerified).toBe(false);
  });
});
