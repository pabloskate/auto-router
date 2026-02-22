import { describe, expect, it, vi } from "vitest";
import { RouterEngine } from "../src/router-engine";
import { buildThreadFingerprint } from "../src/threading";
import type { PinStore, RouterConfig, RouterRequestLike, ThreadPin } from "../src/types";

// Mock PinStore
class MockPinStore implements PinStore {
    private pins = new Map<string, ThreadPin>();

    async get(threadKey: string): Promise<ThreadPin | null> {
        return this.pins.get(threadKey) ?? null;
    }

    async set(pin: ThreadPin): Promise<void> {
        this.pins.set(pin.threadKey, pin);
    }

    async clear(threadKey: string): Promise<void> {
        this.pins.delete(threadKey);
    }
}

describe("RouterEngine (LLM Router)", () => {
    const defaultConfig: RouterConfig = {
        version: "1",
        defaultModel: "openai/gpt-4o",
        globalBlocklist: [],
        routingInstructions: "Use claude-3-opus for math.",
        classifierModel: "openai/gpt-4o-mini"
    };

    const catalog = [
        { id: "openai/gpt-4o", name: "GPT-4o" },
        { id: "anthropic/claude-3-opus", name: "Claude 3 Opus" }
    ];

    it("should bypass routing if specific model requested", async () => {
        const engine = new RouterEngine();
        const request: RouterRequestLike = { model: "anthropic/claude-3-opus" };

        const decision = await engine.decide({
            requestId: "req-1",
            request,
            config: defaultConfig,
            catalog,
            catalogVersion: "v1",
            pinStore: new MockPinStore()
        });

        expect(decision.mode).toBe("passthrough");
        expect(decision.selectedModel).toBe("anthropic/claude-3-opus");
        expect(decision.explanation.decisionReason).toBe("passthrough");
    });

    it("should call llmRouter when model=auto and use the result", async () => {
        const mockLlmRouter = vi.fn().mockResolvedValue({
            selectedModel: "anthropic/claude-3-opus",
            confidence: 0.9,
            signals: ["math"]
        });

        const engine = new RouterEngine({ llmRouter: mockLlmRouter });
        const request: RouterRequestLike = {
            model: "auto",
            messages: [{ role: "user", content: "What is 2+2?" }]
        };

        const decision = await engine.decide({
            requestId: "req-2",
            request,
            config: defaultConfig,
            catalog,
            catalogVersion: "v1",
            pinStore: new MockPinStore()
        });

        expect(mockLlmRouter).toHaveBeenCalledOnce();
        const args = mockLlmRouter.mock.calls[0]?.[0] as any;

        expect(args.routingInstructions).toBe("Use claude-3-opus for math.");
        expect(args.classifierModel).toBe("openai/gpt-4o-mini");
        expect(args.catalog).toBe(catalog);

        expect(decision.mode).toBe("routed");
        expect(decision.selectedModel).toBe("anthropic/claude-3-opus");
        expect(decision.explanation.decisionReason).toBe("initial_route");
        expect(decision.explanation.classificationConfidence).toBe(0.9);
    });

    it("should fallback to default model if llmRouter returns invalid model", async () => {
        const mockLlmRouter = vi.fn().mockResolvedValue({
            selectedModel: "fake/model-that-does-not-exist",
            confidence: 0.9,
            signals: []
        });

        const engine = new RouterEngine({ llmRouter: mockLlmRouter });

        const decision = await engine.decide({
            requestId: "req-3",
            request: { model: "auto", messages: [] },
            config: defaultConfig,
            catalog,
            catalogVersion: "v1",
            pinStore: new MockPinStore()
        });

        expect(decision.selectedModel).toBe("openai/gpt-4o"); // fell back to default
        expect(decision.explanation.notes).toContain(
            "LLM router returned invalid model: fake/model-that-does-not-exist"
        );
    });

    it("should reuse pinned model for continuation requests", async () => {
        const engine = new RouterEngine();
        const pinStore = new MockPinStore();

        const request: RouterRequestLike = {
            model: "auto",
            messages: [
                { role: "user", content: "Hello" },
                { role: "assistant", content: "Hi" },
                { role: "user", content: "Continuation" }
            ]
        };

        const threadKey = buildThreadFingerprint({ messages: request.messages });

        await pinStore.set({
            threadKey,
            modelId: "anthropic/claude-3-opus",
            requestId: "old-req",
            pinnedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 10000).toISOString(),
            turnCount: 1
        });

        const decision = await engine.decide({
            requestId: "req-4",
            request,
            config: defaultConfig,
            catalog,
            catalogVersion: "v1",
            pinStore
        });

        expect(decision.pinUsed).toBe(true);
        expect(decision.selectedModel).toBe("anthropic/claude-3-opus");
        expect(decision.explanation.decisionReason).toBe("thread_pin");
    });

    it("should break cache lock if phase complete signal is detected", async () => {
        const mockLlmRouter = vi.fn().mockResolvedValue({
            selectedModel: "openai/gpt-4o",
            confidence: 0.95,
            signals: ["phase_change"]
        });

        const engine = new RouterEngine({ llmRouter: mockLlmRouter });
        const pinStore = new MockPinStore();

        const request: RouterRequestLike = {
            model: "auto",
            messages: [
                { role: "user", content: "Write a plan" },
                { role: "assistant", content: "Here is the plan. [PHASE_COMPLETE_SIGNAL]" },
                { role: "user", content: "Great, now write the code." }
            ]
        };

        const threadKey = buildThreadFingerprint({ messages: request.messages });
        await pinStore.set({
            threadKey,
            modelId: "anthropic/claude-3-haiku",
            requestId: "old-req",
            pinnedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 10000).toISOString(),
            turnCount: 2
        });

        const decision = await engine.decide({
            requestId: "req-phase-break",
            request,
            config: { ...defaultConfig, phaseCompleteSignal: "[PHASE_COMPLETE_SIGNAL]" },
            catalog,
            catalogVersion: "v1",
            pinStore
        });

        expect(mockLlmRouter).toHaveBeenCalledOnce();
        expect(decision.pinUsed).toBe(false);
        expect(decision.selectedModel).toBe("openai/gpt-4o");
        expect(decision.explanation.decisionReason).toBe("initial_route");
        expect(decision.explanation.notes).toContain("Phase complete signal detected. Breaking cache lock for routing.");
    });

    it("should force cache lock ignoring cooldowns during agent loops", async () => {
        const engine = new RouterEngine();
        const pinStore = new MockPinStore();

        const request: RouterRequestLike = {
            model: "auto",
            messages: [
                { role: "user", content: "Do some work" },
                { role: "assistant", tool_calls: [{ id: "call_123", type: "function", function: { name: "get_weather", arguments: "{}" } }] }
            ]
        };

        const threadKey = buildThreadFingerprint({ messages: request.messages });
        await pinStore.set({
            threadKey,
            modelId: "anthropic/claude-3-opus",
            requestId: "old-req",
            pinnedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 10000).toISOString(),
            turnCount: 10 // well past cooldown
        });

        const decision = await engine.decide({
            requestId: "req-agent-loop",
            request,
            config: { ...defaultConfig, cooldownTurns: 3 },
            catalog,
            catalogVersion: "v1",
            pinStore
        });

        // The agent loop logic should bypass llm router entirely, keep the pin, increment turnCount
        expect(decision.pinUsed).toBe(true);
        expect(decision.selectedModel).toBe("anthropic/claude-3-opus");
        expect(decision.explanation.decisionReason).toBe("thread_pin");
        expect(decision.pinTurnCount).toBe(11); // 10 + 1
    });
});
