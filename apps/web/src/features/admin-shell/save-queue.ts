"use client";

export const SETTINGS_REFRESHED_MESSAGE = "Latest settings loaded. Reapply your last change if needed.";

export function createSequentialTaskQueue() {
  let tail: Promise<void> = Promise.resolve();

  return {
    run<T>(task: () => Promise<T>): Promise<T> {
      const next = tail.catch(() => undefined).then(task);
      tail = next.then(() => undefined, () => undefined);
      return next;
    },
  };
}
