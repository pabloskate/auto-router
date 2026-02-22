import {
    type ChatMessage,
    type LlmRoutingResult,
    type RouterTool,
    type CatalogItem
} from "./types";

export type LlmRouterFunction = (args: {
    prompt: string;
    catalog: CatalogItem[];
    routingInstructions?: string;
    classifierModel?: string;
    currentModel?: string;
}) => Promise<LlmRoutingResult | null>;

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
        if ("text" in content) {
            const text = (content as { text?: unknown }).text;
            return typeof text === "string" ? text : "";
        }

        try {
            return JSON.stringify(content);
        } catch {
            return "";
        }
    }

    return "";
}

export function buildPromptWindow(messages: ChatMessage[] = []): string {
    const selected = messages
        .filter((message) => message.role === "user" || message.role === "system")
        .slice(0, 6);

    return selected
        .map((message) => contentToText(message.content))
        .join("\n")
        .trim()
        .slice(0, 12_000);
}
