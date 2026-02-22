"use client";

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

export function ChatTester() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("auto");
  const [streaming, setStreaming] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStream, setCurrentStream] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
        headers: { "content-type": "application/json" },
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
      handleSubmit();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    setCurrentStream("");
  };

  return (
    <section className="stack">
      <div className="panel stack">
        <div className="chat-header">
          <h2>Chat Completion Tester</h2>
          <button className="alt" onClick={clearChat}>
            Clear
          </button>
        </div>
        <p className="hint">
          Test the router with <code className="inline-code">model=auto</code> or specify a model.
          Streaming shows routed model in real-time.
        </p>

        <div className="config-row">
          <label>
            <span className="label-text">Model</span>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="auto, router/auto, or specific model"
              className="model-input"
            />
          </label>
          <label className="stream-toggle">
            <input
              type="checkbox"
              checked={streaming}
              onChange={(e) => setStreaming(e.target.checked)}
            />
            <span>Stream</span>
          </label>
        </div>
      </div>

      <div className="chat-container panel">
        <div className="messages">
          {messages.length === 0 && !currentStream && (
            <div className="empty-state">
              <p>Send a message to test the router</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message-header">
                <span className="role-badge">{msg.role}</span>
                {msg.routedModel && (
                  <span className="model-badge" title="Routed model">
                    {msg.routedModel}
                  </span>
                )}
                {msg.requestTime && (
                  <span className="time-badge">{msg.requestTime}ms</span>
                )}
              </div>
              <div className="message-content">{msg.content}</div>
            </div>
          ))}
          {currentStream && (
            <div className="message assistant streaming">
              <div className="message-header">
                <span className="role-badge">assistant</span>
                <span className="stream-indicator">streaming...</span>
              </div>
              <div className="message-content">{currentStream}</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="error-banner">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="input-area">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
            rows={2}
            disabled={loading}
          />
          <button onClick={handleSubmit} disabled={loading || !input.trim()}>
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>

      <div className="panel">
        <h3>Request Preview</h3>
        <pre className="code-block">
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
    </section>
  );
}