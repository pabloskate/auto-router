import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  getTopModelIntelligenceForLens,
  listModelIntelligenceForLens,
  MODEL_INTELLIGENCE,
  MODEL_INTELLIGENCE_LENS_IDS,
} from "./model-intelligence";

describe("model-intelligence", () => {
  it("uses unique deployable ids and required top-level metadata", () => {
    const seen = new Set<string>();

    for (const model of MODEL_INTELLIGENCE) {
      expect(model.id).toContain("/");
      expect(seen.has(model.id)).toBe(false);
      seen.add(model.id);

      expect(model.supportedGateways.length).toBeGreaterThan(0);
      expect(model.lenses.length).toBeGreaterThan(0);
      expect(model.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("seeds every recommendation lens at least once", () => {
    for (const lens of MODEL_INTELLIGENCE_LENS_IDS) {
      expect(listModelIntelligenceForLens({ lens }).length).toBeGreaterThan(0);
    }
  });

  it("requires source-backed numeric facts without estimated values", () => {
    const approximatePattern = /\b(estimate|estimated|approx|approximately|~)\b/i;

    for (const model of MODEL_INTELLIGENCE) {
      for (const metric of model.metrics) {
        if (typeof metric.value !== "number") {
          continue;
        }

        expect(Number.isFinite(metric.value)).toBe(true);
        expect(metric.source.label.length).toBeGreaterThan(0);
        expect(metric.source.url).toMatch(/^https?:\/\//);
        expect(metric.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(metric.label).not.toMatch(approximatePattern);
        expect(metric.note ?? "").not.toMatch(approximatePattern);
      }
    }
  });

  it("returns the intended best-in-category seeded winners", () => {
    expect(getTopModelIntelligenceForLens({ lens: "throughput" })?.id).toBe("inception/mercury-2");
    expect(getTopModelIntelligenceForLens({ lens: "coding_value" })?.id).toBe("minimax/minimax-m2.7");
    expect(getTopModelIntelligenceForLens({ lens: "open_source" })?.id).toBe("qwen/qwen3-coder");
  });

  it("does not require TTFT or throughput facts for lens ranking helpers", () => {
    const winner = getTopModelIntelligenceForLens({ lens: "open_source" });

    expect(winner?.id).toBe("qwen/qwen3-coder");
    expect(winner?.metrics.map((metric) => metric.metricId)).not.toContain("artificial_analysis_output_tps");
    expect(winner?.metrics.map((metric) => metric.metricId)).not.toContain("artificial_analysis_ttft_seconds");
    expect(listModelIntelligenceForLens({ lens: "open_source" }).map((model) => model.id)).toContain("qwen/qwen3-coder");
  });

  it("keeps runtime defaults and presets disconnected from model intelligence", () => {
    const defaultsSource = readFileSync(
      fileURLToPath(new URL("../../../lib/storage/defaults.ts", import.meta.url)),
      "utf8",
    );
    const presetsSource = readFileSync(
      fileURLToPath(new URL("../../../lib/routing-presets.ts", import.meta.url)),
      "utf8",
    );

    expect(defaultsSource).not.toMatch(/model-intelligence|profile-builder-knowledge/);
    expect(presetsSource).not.toMatch(/model-intelligence|profile-builder-knowledge/);
  });
});
