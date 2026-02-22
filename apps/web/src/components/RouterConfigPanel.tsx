"use client";

// ─────────────────────────────────────────────────────────────────────────────
// RouterConfigPanel.tsx
//
// Editable fields for per-user router configuration:
//   • Default / fallback model
//   • Classifier model (the cheap model that makes routing decisions)
//   • Routing instructions (freeform prompt for the classifier)
//   • Global blocklist (comma-separated model IDs to never route to)
//
// Does NOT handle the custom catalog — that's CatalogEditorPanel.tsx.
// Save is triggered by the parent via the shared "Save Configuration" button.
// ─────────────────────────────────────────────────────────────────────────────

interface RouterConfigFields {
  defaultModel: string | null;
  classifierModel: string | null;
  routingInstructions: string | null;
  blocklist: string[] | null;
}

interface Props {
  config: RouterConfigFields;
  onChange: (updated: RouterConfigFields) => void;
}

export function RouterConfigPanel({ config, onChange }: Props) {
  return (
    <article className="panel stack" style={{ gridColumn: "1 / -1" }}>
      <h3>Auto Router Configuration</h3>
      <p style={{ fontSize: "0.85rem", color: "var(--ink-soft)", marginBottom: 12 }}>
        Define how the Auto Router engine evaluates and routes your requests.
      </p>

      <div style={{ display: "grid", gap: 16 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Fallback / Default Model</span>
          <span style={{ fontSize: "0.75rem", color: "var(--ink-soft)" }}>
            Used if the classifier fails to make a solid decision. (e.g., openai/gpt-4o)
          </span>
          <input
            type="text"
            value={config.defaultModel || ""}
            onChange={(e) => onChange({ ...config, defaultModel: e.target.value })}
            placeholder="Leave blank for system default"
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Classifier Model</span>
          <span style={{ fontSize: "0.75rem", color: "var(--ink-soft)" }}>
            The cheap, fast model used to categorise requests. (e.g., meta-llama/llama-3-8b-instruct)
          </span>
          <input
            type="text"
            value={config.classifierModel || ""}
            onChange={(e) => onChange({ ...config, classifierModel: e.target.value })}
            placeholder="Leave blank for system default"
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Routing Instructions</span>
          <span style={{ fontSize: "0.75rem", color: "var(--ink-soft)" }}>
            Plain-text prompt giving instructions to the classifier. e.g. &quot;Use claude-3-5-sonnet for coding, gemini for general chat.&quot;
          </span>
          <textarea
            value={config.routingInstructions || ""}
            onChange={(e) => onChange({ ...config, routingInstructions: e.target.value })}
            placeholder="Write your custom routing logic here..."
            rows={4}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Global Blocklist</span>
          <span style={{ fontSize: "0.75rem", color: "var(--ink-soft)" }}>
            Comma-separated model IDs that should NEVER be routed to.
          </span>
          <input
            type="text"
            value={config.blocklist?.join(", ") || ""}
            onChange={(e) => {
              const ids = e.target.value.split(",").map((v) => v.trim()).filter((v) => v.length > 0);
              onChange({ ...config, blocklist: ids });
            }}
            placeholder="openai/gpt-3.5-turbo, meta-llama/llama-2-7b-chat"
          />
        </label>
      </div>
    </article>
  );
}
