"use client";

import { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// RouterConfigPanel.tsx
//
// Redesigned router configuration with clear section grouping:
//
// Sections:
//   1. Connection — Base URLs and API keys
//   2. Routing Logic — Default/classifier models, instructions, blocklist
//
// Each section has its own visual grouping with clear hierarchy.
// ─────────────────────────────────────────────────────────────────────────────

interface RouterConfigFields {
  defaultModel: string | null;
  classifierModel: string | null;
  routingInstructions: string | null;
  blocklist: string[] | null;
  upstreamBaseUrl: string | null;
  classifierBaseUrl: string | null;
  upstreamApiKeyConfigured: boolean;
  classifierApiKeyConfigured: boolean;
  upstreamApiKeyInput: string;
  classifierApiKeyInput: string;
  clearUpstreamApiKey: boolean;
  clearClassifierApiKey: boolean;
}

interface Props {
  config: RouterConfigFields;
  onChange: (updated: RouterConfigFields) => void;
  onSave: (updates: Partial<RouterConfigFields>) => Promise<boolean>;
}

// ─── Icons ───────────────────────────────────────────────────────────────────
function IconLink({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  );
}

function IconKey({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 9.5l3 3L22 7l-3-3-3.5 3.5"/>
    </svg>
  );
}

function IconBrain({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
    </svg>
  );
}

function IconRoute({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M12 19l4-7-7-4"/>
    </svg>
  );
}

function IconBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    </svg>
  );
}

function IconSave({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
    </svg>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  description: string;
}) {
  return (
    <div style={{ marginBottom: "var(--space-6)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "var(--radius-md)",
            background: "var(--accent-dim)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Icon style={{ width: 16, height: 16, color: "var(--accent)" }} />
        </div>
        <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>{title}</h4>
      </div>
      <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", paddingLeft: 44 }}>{description}</p>
    </div>
  );
}

// ─── Connection Section ───────────────────────────────────────────────────────
function ConnectionSection({ config, onChange }: { config: RouterConfigFields; onChange: (c: RouterConfigFields) => void }) {
  return (
    <div style={{ marginBottom: "var(--space-8)" }}>
      <SectionHeader
        icon={IconLink}
        title="Connection Settings"
        description="Configure how the Auto Router connects to your upstream LLM providers"
      />

      <div className="form-row" style={{ marginBottom: "var(--space-5)" }}>
        <div className="form-group">
          <label className="form-label">OpenAI-Compatible Base URL</label>
          <input
            className="input"
            type="text"
            value={config.upstreamBaseUrl || ""}
            onChange={(e) => onChange({ ...config, upstreamBaseUrl: e.target.value })}
            placeholder="https://openrouter.ai/api/v1"
          />
          <span className="form-hint">Default: OpenRouter. Used for all routed inference calls.</span>
        </div>

        <div className="form-group">
          <label className="form-label">Classifier Base URL</label>
          <input
            className="input"
            type="text"
            value={config.classifierBaseUrl || ""}
            onChange={(e) => onChange({ ...config, classifierBaseUrl: e.target.value })}
            placeholder="https://openrouter.ai/api/v1"
          />
          <span className="form-hint">Optional. Falls back to main upstream URL if not set.</span>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <IconKey style={{ width: 14, height: 14 } as any} />
              Upstream API Key
            </div>
          </label>
          <input
            className="input"
            type="password"
            value={config.upstreamApiKeyInput}
            onChange={(e) =>
              onChange({
                ...config,
                upstreamApiKeyInput: e.target.value,
                clearUpstreamApiKey: false,
              })
            }
            placeholder={config.upstreamApiKeyConfigured ? "•••••••• (configured)" : "Paste API key..."}
            autoComplete="new-password"
          />
          <span className="form-hint">Stored encrypted. Used for all inference requests.</span>
          {config.upstreamApiKeyConfigured && (
            <label className="checkbox-wrapper" style={{ marginTop: "var(--space-2)" }}>
              <input
                type="checkbox"
                checked={config.clearUpstreamApiKey}
                onChange={(e) =>
                  onChange({
                    ...config,
                    clearUpstreamApiKey: e.target.checked,
                    upstreamApiKeyInput: e.target.checked ? "" : config.upstreamApiKeyInput,
                  })
                }
              />
              <span className="checkbox-label">Clear saved key</span>
            </label>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <IconKey style={{ width: 14, height: 14 } as any} />
              Classifier API Key
            </div>
          </label>
          <input
            className="input"
            type="password"
            value={config.classifierApiKeyInput}
            onChange={(e) =>
              onChange({
                ...config,
                classifierApiKeyInput: e.target.value,
                clearClassifierApiKey: false,
              })
            }
            placeholder={config.classifierApiKeyConfigured ? "•••••••• (configured)" : "Optional separate key..."}
            autoComplete="new-password"
          />
          <span className="form-hint">Optional. Falls back to upstream key if not set.</span>
          {config.classifierApiKeyConfigured && (
            <label className="checkbox-wrapper" style={{ marginTop: "var(--space-2)" }}>
              <input
                type="checkbox"
                checked={config.clearClassifierApiKey}
                onChange={(e) =>
                  onChange({
                    ...config,
                    clearClassifierApiKey: e.target.checked,
                    classifierApiKeyInput: e.target.checked ? "" : config.classifierApiKeyInput,
                  })
                }
              />
              <span className="checkbox-label">Clear saved key</span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Routing Logic Section ────────────────────────────────────────────────────
function RoutingLogicSection({ config, onChange }: { config: RouterConfigFields; onChange: (c: RouterConfigFields) => void }) {
  return (
    <div>
      <SectionHeader
        icon={IconBrain}
        title="Routing Logic"
        description="Configure how the Auto Router selects models for each request"
      />

      <div className="form-row" style={{ marginBottom: "var(--space-5)" }}>
        <div className="form-group">
          <label className="form-label">
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <IconRoute style={{ width: 14, height: 14 } as any} />
              Fallback Model
            </div>
          </label>
          <input
            className="input input--mono"
            type="text"
            value={config.defaultModel || ""}
            onChange={(e) => onChange({ ...config, defaultModel: e.target.value })}
            placeholder="openai/gpt-4o"
          />
          <span className="form-hint">Used when the classifier fails to decide. e.g., openai/gpt-4o</span>
        </div>

        <div className="form-group">
          <label className="form-label">
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <IconBrain style={{ width: 14, height: 14 } as any} />
              Classifier Model
            </div>
          </label>
          <input
            className="input input--mono"
            type="text"
            value={config.classifierModel || ""}
            onChange={(e) => onChange({ ...config, classifierModel: e.target.value })}
            placeholder="meta-llama/llama-3.1-8b-instruct"
          />
          <span className="form-hint">Cheap, fast model that makes routing decisions. e.g., llama-3.1-8b</span>
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: "var(--space-5)" }}>
        <label className="form-label">Routing Instructions</label>
        <textarea
          className="textarea"
          value={config.routingInstructions || ""}
          onChange={(e) => onChange({ ...config, routingInstructions: e.target.value })}
          placeholder="e.g., Use Claude for coding tasks, GPT-4o for creative writing, and Gemini for general chat..."
          rows={4}
        />
        <span className="form-hint">
          Plain-text instructions for the classifier. Be specific about when to use each model type.
        </span>
      </div>

      <div className="form-group">
        <label className="form-label">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <IconBlock style={{ width: 14, height: 14 } as any} />
            Global Blocklist
          </div>
        </label>
        <input
          className="input input--mono"
          type="text"
          value={config.blocklist?.join(", ") || ""}
          onChange={(e) => {
            const ids = e.target.value
              .split(",")
              .map((v) => v.trim())
              .filter((v) => v.length > 0);
            onChange({ ...config, blocklist: ids });
          }}
          placeholder="model/id-1, model/id-2, ..."
        />
        <span className="form-hint">Comma-separated model IDs that the router will never use. These models are excluded from all routing decisions.</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function RouterConfigPanel({ config, onChange, onSave }: Props) {
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(config);
    setSaving(false);
  }

  return (
    <div>
      {/* Connection Settings */}
      <ConnectionSection config={config} onChange={onChange} />

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border-subtle)", margin: "var(--space-8) 0" }} />

      {/* Routing Logic */}
      <RoutingLogicSection config={config} onChange={onChange} />

      {/* Save Button */}
      <div style={{ marginTop: "var(--space-8)", paddingTop: "var(--space-6)", borderTop: "1px solid var(--border-subtle)" }}>
        <button className="btn" onClick={handleSave} disabled={saving}>
          <IconSave />
          {saving ? "Saving..." : "Save Configuration"}
        </button>
      </div>
    </div>
  );
}
