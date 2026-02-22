import type { PinStore, ThreadPin } from "./types";

export class InMemoryPinStore implements PinStore {
  private readonly pins = new Map<string, ThreadPin>();

  async get(threadKey: string): Promise<ThreadPin | null> {
    const pin = this.pins.get(threadKey);
    if (!pin) {
      return null;
    }

    if (Date.parse(pin.expiresAt) <= Date.now()) {
      await this.clear(threadKey);
      return null;
    }

    return pin;
  }

  async set(pin: ThreadPin): Promise<void> {
    this.pins.set(pin.threadKey, pin);
  }

  async clear(threadKey: string): Promise<void> {
    this.pins.delete(threadKey);
  }
}
