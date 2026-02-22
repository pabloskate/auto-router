import type { ChatMessage, RouterTool, ThreadFingerprintInput } from "./types";

export function hasImagePayload(messages: ChatMessage[] = []): boolean {
  for (const message of messages) {
    if (Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part && typeof part === "object") {
          const type = (part as { type?: unknown }).type;
          if (type === "image_url" || type === "image") {
            return true;
          }
        }
      }
    }
  }
  return false;
}

function contentToText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object" && "text" in item) {
          const text = (item as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }

        return "";
      })
      .join(" ");
  }

  if (content && typeof content === "object") {
    try {
      return JSON.stringify(content);
    } catch {
      return "";
    }
  }

  return "";
}

export function isAgentLoop(messages: ChatMessage[] = []): boolean {
  if (messages.length === 0) return false;

  const lastMessage = messages[messages.length - 1];

  if (lastMessage?.role === "tool") {
    return true;
  }

  if (lastMessage?.role === "assistant" && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls.length > 0) {
    return true;
  }

  return false;
}

export function hasPhaseCompleteSignal(messages: ChatMessage[] = [], signal?: string): boolean {
  if (!signal) return false;

  // Look for the last assistant message
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  if (!lastAssistant) return false;

  const text = contentToText(lastAssistant.content);
  return text.includes(signal);
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = (hash >>> 0) * 0x01000193;
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function stableToolSignature(tools: RouterTool[] = []): string {
  const signatures = tools
    .map((tool) => ({
      type: tool.type ?? "function",
      name: tool.function?.name ?? ""
    }))
    .sort((a, b) => `${a.type}:${a.name}`.localeCompare(`${b.type}:${b.name}`));

  return signatures.map((item) => `${item.type}:${item.name}`).join("|");
}

function extractEarlyContext(messages: ChatMessage[] = []): string {
  const system = messages.find((message) => message.role === "system");
  const users: ChatMessage[] = [];
  let hitAssistantOrTool = false;

  for (const message of messages) {
    if (message.role === "assistant" || message.role === "tool") {
      hitAssistantOrTool = true;
      break;
    }

    if (message.role === "user") {
      users.push(message);
    }

    if (users.length >= 2) {
      break;
    }
  }

  if (!hitAssistantOrTool && users.length === 0) {
    users.push(...messages.filter((message) => message.role === "user").slice(0, 1));
  }

  const parts: string[] = [];

  if (system) {
    parts.push(`system:${normalizeText(contentToText(system.content))}`);
  }

  for (const [index, message] of users.entries()) {
    parts.push(`user${index}:${normalizeText(contentToText(message.content))}`);
  }

  return parts.join("\n");
}

export function hasAssistantOrToolMessages(messages: ChatMessage[] = []): boolean {
  return messages.some((message) => message.role === "assistant" || message.role === "tool");
}

export function isContinuationRequest(input: ThreadFingerprintInput): boolean {
  if (input.previousResponseId) {
    return true;
  }

  return hasAssistantOrToolMessages(input.messages);
}

export function buildThreadFingerprint(input: ThreadFingerprintInput): string {
  const previousResponseId = input.previousResponseId?.trim();
  if (previousResponseId) {
    return `response:${previousResponseId}`;
  }

  const context = extractEarlyContext(input.messages);
  const tools = stableToolSignature(input.tools);
  const payload = `${context}\ntools:${tools}`;

  return `thread:${fnv1a32(payload)}`;
}

export function isNewConversation(input: ThreadFingerprintInput): boolean {
  return !isContinuationRequest(input);
}
