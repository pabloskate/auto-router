"use client";

// ─────────────────────────────────────────────────────────────────────────────
// PlaygroundPanel.tsx
//
// Integrated chat playground for testing routing decisions.
// A compact, admin-optimized version of the chat tester with:
// - Quick model selection (auto, profiles, or specific model)
// - Message history with routing metadata
// - Streaming support with real-time indicators
// - Request preview for debugging
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from "react";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  routedModel?: string;
  requestTime?: number;
};

type StreamChunk = {
  choices?: Array<{
    delta?: { content?: string };
    finish_reason?: string;
  }>;
  model?: string;
};

// ─── Icons ───────────────────────────────────────────────────────────────────
function IconSend({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function IconClear({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconKey({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" /><path d="M21 2l-9.6 9.6" /><path d="M15.5 9.5l3 3L22 7l-3-3-3.5 3.5" />
    </svg>
  );
}

function IconBot({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" />
    </svg>
  );
}

function IconUser({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconModel({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function IconTime({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconSparkles({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /><path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
    </svg>
  );
}

// ─── Components ──────────────────────────────────────────────────────────────
function MessageBubble({
  message,
  isStreaming,
}: {
  message: Message;
  isStreaming?: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={`message-bubble message-bubble--${message.role}`}
      style={{
        maxWidth: isUser ? "85%" : "95%",
      }}
    >
      {/* Meta Header */}
      <div className="message-meta">
        <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          {isUser ? <IconUser /> : <IconBot />}
          <span className="message-role">{message.role}</span>
        </span>

        {message.routedModel && (
          <span className="message-model">
            <IconModel />
            {message.routedModel}
          </span>
        )}

        {message.requestTime && (
          <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-muted)" }}>
            <IconTime />
            {message.requestTime}ms
          </span>
        )}

        {isStreaming && (
          <span className="badge badge--info animate-pulse" style={{ fontSize: "0.625rem" }}>
            streaming...
          </span>
        )}
      </div>

      {/* Content */}
      <div className="message-content">{message.content}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state" style={{ padding: "var(--space-8) var(--space-6)" }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "var(--radius-xl)",
          background: "var(--accent-dim)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <IconSparkles style={{ width: 24, height: 24, color: "var(--accent)" } as any} />
      </div>
      <div className="empty-state-title">Test Your Router</div>
      <p className="empty-state-desc">
        Send a message to see which model the router selects. Try different prompts to test routing logic.
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function PlaygroundPanel({ profiles }: { profiles?: import("./ProfilesPanel").RouterProfile[] | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStream, setCurrentStream] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const streaming = true;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentStream]);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      requestTime: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);
    setCurrentStream("");

    const payload = {
      model,
      messages: [...messages, userMessage]
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content })),
      stream: streaming,
    };

    try {
      const startTime = Date.now();
      const response = await fetch("/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = (await response.json()) as { error?: string };
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      if (streaming && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";
        let routedModel: string | undefined;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((l) => l.trim());

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed: StreamChunk = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) fullContent += content;
                if (parsed.model && !routedModel) routedModel = parsed.model;
                setCurrentStream(fullContent);
              } catch {
                // Skip malformed chunks
              }
            }
          }
        }

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: fullContent,
          model,
          routedModel,
          requestTime: Date.now() - startTime,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setCurrentStream("");
      } else {
        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          model?: string;
        };
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.choices?.[0]?.message?.content || "",
          model,
          routedModel: data.model,
          requestTime: Date.now() - startTime,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [input, loading, model, messages, streaming]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Configuration Bar */}
      <div
        className="card"
        style={{
          marginBottom: "var(--space-4)",
        }}
      >
        <div className="card-body">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--space-4)",
              alignItems: "flex-end",
            }}
          >
            {/* Model */}
            <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
              <label className="form-label">Model</label>
              <select
                className="input"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="auto">auto</option>
                {profiles?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} {p.name ? `(${p.name})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div
        className="card"
        style={{
          minHeight: 400,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Messages */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {messages.length === 0 && !currentStream ? (
            <EmptyState />
          ) : (
            <div
              className="chat-messages"
              style={{
                maxHeight: 500,
              }}
            >
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {currentStream && (
                <MessageBubble
                  message={{
                    id: "streaming",
                    role: "assistant",
                    content: currentStream,
                  }}
                  isStreaming
                />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div
            className="alert alert--danger"
            style={{
              margin: "0 var(--space-5) var(--space-4)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* Input Area */}
        <div
          className="chat-input"
          style={{
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--bg-elevated)",
          }}
        >
          <textarea
            className="input"
            style={{
              flex: 1,
              minHeight: 44,
              maxHeight: 120,
              resize: "none",
              background: "var(--bg-surface)",
            }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            disabled={loading}
            rows={2}
          />
          <button
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            style={{ alignSelf: "flex-end" }}
          >
            {loading ? (
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <IconSend />
            )}
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>

      {/* Request Preview */}
      {messages.length > 0 && (
        <div className="card mt-4" style={{ minWidth: 0, maxWidth: "100%" }}>
          <div className="card-header">
            <h4 style={{ fontSize: "0.875rem", fontWeight: 600 }}>Last Request</h4>
          </div>
          <div className="card-body playground-request-preview" style={{ padding: 0, minWidth: 0, maxWidth: "100%" }}>
            <pre
              className="code-block playground-request-code"
              style={{
                margin: 0,
                borderRadius: 0,
                fontSize: "0.75rem",
                maxHeight: 200,
                maxWidth: "100%",
              }}
            >
              {JSON.stringify(
                {
                  model,
                  messages: messages
                    .filter((m) => m.role !== "system")
                    .map((m) => ({ role: m.role, content: m.content })),
                  stream: streaming,
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
