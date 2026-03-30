import { describe, expect, it, vi } from "vitest";

import { createSequentialTaskQueue, SETTINGS_REFRESHED_MESSAGE } from "./save-queue";

describe("createSequentialTaskQueue", () => {
  it("runs tasks one at a time in submission order", async () => {
    const queue = createSequentialTaskQueue();
    const first = {
      resolve: null as ((value: string) => void) | null,
    };
    const order: string[] = [];

    const firstTask = queue.run(
      () =>
        new Promise<string>((resolve) => {
          order.push("first:start");
          first.resolve = resolve;
        }),
    );
    const secondTask = queue.run(async () => {
      order.push("second:start");
      return "second";
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(order).toEqual(["first:start"]);

    if (!first.resolve) {
      throw new Error("Expected first task to be pending.");
    }

    first.resolve("first");
    await expect(firstTask).resolves.toBe("first");
    await expect(secondTask).resolves.toBe("second");
    expect(order).toEqual(["first:start", "second:start"]);
  });

  it("continues after a rejected task", async () => {
    const queue = createSequentialTaskQueue();
    const failure = queue.run(async () => {
      throw new Error("boom");
    });
    const success = queue.run(async () => "ok");

    await expect(failure).rejects.toThrow("boom");
    await expect(success).resolves.toBe("ok");
  });
});

describe("SETTINGS_REFRESHED_MESSAGE", () => {
  it("uses calm, actionable wording", () => {
    expect(SETTINGS_REFRESHED_MESSAGE).toContain("Latest settings loaded");
    expect(SETTINGS_REFRESHED_MESSAGE.toLowerCase()).not.toContain("another tab");
  });
});
