"use client";

import { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// GatewayPanel.tsx
//
// Unified gateway + model management UI. Each gateway owns its base URL,
// API key, and a list of models (using that gateway's native model IDs).
//
// Sections per gateway card:
//   - Gateway header: name, URL, key status, edit/delete actions
//   - Model list: native model IDs with display name + whenToUse
//   - "Fetch from gateway" button to auto-discover models via /models API
//   - "Add model manually" inline form
// ─────────────────────────────────────────────────────────────────────────────

export interface GatewayModel {
  id: string;
  name: string;
  whenToUse?: string;
  description?: string;
  modality?: string;
  thinking?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
}

export interface GatewayInfo {
  id: string;
  name: string;
  baseUrl: string;
  models: GatewayModel[];
  createdAt: string;
  updatedAt: string;
}

interface Props {
  onStatus?: (msg: string) => void;
  onError?: (msg?: string) => void;
}

// ─── Icons ───────────────────────────────────────────────────────────────────
function IconPlus({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconEdit({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconDownload({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconKey({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" /><path d="M21 2l-9.6 9.6" /><path d="M15.5 9.5l3 3L22 7l-3-3-3.5 3.5" />
    </svg>
  );
}

function IconGlobe({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

// ─── Gateway form ─────────────────────────────────────────────────────────────

interface GatewayFormProps {
  initial?: { name: string; baseUrl: string };
  isEdit?: boolean;
  saving?: boolean;
  onSave: (data: { name: string; baseUrl: string; apiKey: string }) => Promise<void>;
  onCancel: () => void;
}

function GatewayForm({ initial, isEdit, saving, onSave, onCancel }: GatewayFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? "");
  const [apiKey, setApiKey] = useState("");
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setErr("Name is required.");
    if (!baseUrl.trim()) return setErr("Base URL is required.");
    if (!isEdit && !apiKey.trim()) return setErr("API key is required.");
    setErr("");
    await onSave({ name: name.trim(), baseUrl: baseUrl.trim(), apiKey: apiKey.trim() });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {err && (
        <div style={{ padding: "var(--space-3) var(--space-4)", background: "var(--danger-dim)", border: "1px solid var(--danger)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", color: "var(--danger)" }}>
          {err}
        </div>
      )}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Name</label>
          <input className="input" placeholder="e.g. OpenAI Direct" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Base URL</label>
          <input className="input input--mono" placeholder="https://api.openai.com/v1" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">API Key</label>
        <input
          className="input input--mono"
          type="password"
          placeholder={isEdit ? "Leave blank to keep existing key" : "sk-..."}
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          autoComplete="new-password"
        />
        <span className="form-hint">Stored encrypted. Used only for requests routed to this gateway.</span>
      </div>
      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        <button type="submit" className="btn btn--sm" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Add gateway"}
        </button>
        <button type="button" className="btn btn--secondary btn--sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

// ─── Model form ───────────────────────────────────────────────────────────────

interface ModelFormProps {
  initial?: GatewayModel;
  saving?: boolean;
  onSave: (m: GatewayModel) => Promise<void>;
  onCancel: () => void;
}

function ModelForm({ initial, saving, onSave, onCancel }: ModelFormProps) {
  const [id, setId] = useState(initial?.id ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [whenToUse, setWhenToUse] = useState(initial?.whenToUse ?? "");
  const [err, setErr] = useState("");
  const isEdit = !!initial;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id.trim()) return setErr("Model ID is required.");
    if (!name.trim()) return setErr("Display name is required.");
    setErr("");
    await onSave({ id: id.trim(), name: name.trim(), whenToUse: whenToUse.trim() || undefined });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", padding: "var(--space-4)", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)" }}>
      {err && (
        <div style={{ fontSize: "0.8125rem", color: "var(--danger)" }}>{err}</div>
      )}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Model ID</label>
          <input
            className="input input--mono btn--sm"
            style={{ padding: "var(--space-2) var(--space-3)", fontSize: "0.8125rem" }}
            placeholder="e.g. gpt-4o"
            value={id}
            onChange={e => setId(e.target.value)}
            disabled={isEdit}
            readOnly={isEdit}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Display name</label>
          <input
            className="input btn--sm"
            style={{ padding: "var(--space-2) var(--space-3)", fontSize: "0.8125rem" }}
            placeholder="e.g. GPT-4o"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">When to use (routing hint)</label>
        <input
          className="input btn--sm"
          style={{ padding: "var(--space-2) var(--space-3)", fontSize: "0.8125rem" }}
          placeholder="e.g. Complex reasoning and analysis tasks"
          value={whenToUse}
          onChange={e => setWhenToUse(e.target.value)}
        />
      </div>
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button type="submit" className="btn btn--sm" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save" : "Add model"}
        </button>
        <button type="button" className="btn btn--secondary btn--sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

// ─── Fetch-models picker ──────────────────────────────────────────────────────

interface FetchedModel { id: string; name: string }

interface FetchPickerProps {
  models: FetchedModel[];
  existing: GatewayModel[];
  onImport: (selected: FetchedModel[]) => Promise<void>;
  onClose: () => void;
}

function FetchPicker({ models, existing, onImport, onClose }: FetchPickerProps) {
  const existingIds = new Set(existing.map(m => m.id));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setSelected(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleImport() {
    const toImport = models.filter(m => selected.has(m.id));
    setSaving(true);
    await onImport(toImport);
    setSaving(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", padding: "var(--space-4)", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
          {models.length} models found
        </span>
        <button className="btn btn--ghost btn--sm" onClick={onClose}>Close</button>
      </div>
      <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
        {models.map(m => {
          const alreadyAdded = existingIds.has(m.id);
          return (
            <label
              key={m.id}
              style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-sm)", background: selected.has(m.id) ? "var(--accent-dim)" : "transparent", cursor: alreadyAdded ? "default" : "pointer", opacity: alreadyAdded ? 0.5 : 1 }}
            >
              <input
                type="checkbox"
                checked={alreadyAdded || selected.has(m.id)}
                disabled={alreadyAdded}
                onChange={() => !alreadyAdded && toggle(m.id)}
                style={{ accentColor: "var(--accent)", flexShrink: 0 }}
              />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-primary)" }}>{m.id}</span>
              {alreadyAdded && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>already added</span>}
            </label>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button
          className="btn btn--sm"
          disabled={selected.size === 0 || saving}
          onClick={handleImport}
        >
          {saving ? "Importing…" : `Import ${selected.size > 0 ? selected.size : ""} selected`}
        </button>
        <button className="btn btn--secondary btn--sm" onClick={() => setSelected(new Set(models.filter(m => !existingIds.has(m.id)).map(m => m.id)))}>
          Select all new
        </button>
      </div>
    </div>
  );
}

// ─── Gateway card ─────────────────────────────────────────────────────────────

interface GatewayCardProps {
  gateway: GatewayInfo;
  onRefresh: () => void;
  onStatus?: (msg: string) => void;
  onError?: (msg?: string) => void;
}

function GatewayCard({ gateway, onRefresh, onStatus, onError }: GatewayCardProps) {
  const [editingGateway, setEditingGateway] = useState(false);
  const [deletingGateway, setDeletingGateway] = useState(false);
  const [savingGateway, setSavingGateway] = useState(false);

  const [addingModel, setAddingModel] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [removingModelId, setRemovingModelId] = useState<string | null>(null);
  const [savingModel, setSavingModel] = useState(false);

  const [fetchedModels, setFetchedModels] = useState<FetchedModel[] | null>(null);
  const [fetching, setFetching] = useState(false);

  async function saveGateway(data: { name: string; baseUrl: string; apiKey: string }) {
    setSavingGateway(true);
    try {
      const body: Record<string, string> = { name: data.name, baseUrl: data.baseUrl };
      if (data.apiKey) body.apiKey = data.apiKey;
      const res = await fetch(`/api/v1/user/gateways/${gateway.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
        onError?.(e.error ?? "Failed to save gateway.");
        return;
      }
      onStatus?.("Gateway saved.");
      setEditingGateway(false);
      onRefresh();
    } finally {
      setSavingGateway(false);
    }
  }

  async function deleteGateway() {
    if (!deletingGateway) { setDeletingGateway(true); return; }
    const res = await fetch(`/api/v1/user/gateways/${gateway.id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) {
      onError?.("Failed to delete gateway.");
      setDeletingGateway(false);
      return;
    }
    onStatus?.("Gateway deleted.");
    onRefresh();
  }

  async function saveModels(models: GatewayModel[]) {
    const res = await fetch(`/api/v1/user/gateways/${gateway.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ models }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
      onError?.(e.error ?? "Failed to save models.");
      return false;
    }
    onRefresh();
    return true;
  }

  async function addModel(m: GatewayModel) {
    setSavingModel(true);
    try {
      const models = [...gateway.models.filter(x => x.id !== m.id), m];
      if (await saveModels(models)) {
        setAddingModel(false);
        onStatus?.("Model added.");
      }
    } finally {
      setSavingModel(false);
    }
  }

  async function editModel(m: GatewayModel) {
    setSavingModel(true);
    try {
      const models = gateway.models.map(x => x.id === m.id ? m : x);
      if (await saveModels(models)) {
        setEditingModelId(null);
        onStatus?.("Model updated.");
      }
    } finally {
      setSavingModel(false);
    }
  }

  async function removeModel(id: string) {
    if (removingModelId !== id) { setRemovingModelId(id); return; }
    const models = gateway.models.filter(m => m.id !== id);
    if (await saveModels(models)) {
      setRemovingModelId(null);
      onStatus?.("Model removed.");
    } else {
      setRemovingModelId(null);
    }
  }

  async function fetchModels() {
    setFetching(true);
    try {
      const res = await fetch(`/api/v1/user/gateways/${gateway.id}/fetch-models`);
      const data = await res.json() as { models?: FetchedModel[]; error?: string };
      if (!res.ok || !data.models) {
        onError?.(data.error ?? "Failed to fetch models from gateway.");
        return;
      }
      setFetchedModels(data.models);
    } finally {
      setFetching(false);
    }
  }

  async function importModels(selected: FetchedModel[]) {
    const existing = new Set(gateway.models.map(m => m.id));
    const newModels = selected.filter(m => !existing.has(m.id)).map(m => ({ id: m.id, name: m.id }));
    const models = [...gateway.models, ...newModels];
    if (await saveModels(models)) {
      setFetchedModels(null);
      onStatus?.(`Imported ${newModels.length} model${newModels.length !== 1 ? "s" : ""}.`);
    }
  }

  return (
    <div className="card" style={{ overflow: "visible" }}>
      {/* Gateway header */}
      <div className="card-header">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", minWidth: 0 }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>{gateway.name}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              <IconGlobe /> {gateway.baseUrl}
            </span>
            <span className="badge badge--success" style={{ fontSize: "0.7rem" }}>
              <IconKey /> Key configured
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
          <button className="btn btn--secondary btn--sm" onClick={() => { setEditingGateway(v => !v); setDeletingGateway(false); }}>
            <IconEdit /> Edit
          </button>
          <button
            className={`btn btn--sm ${deletingGateway ? "btn--danger" : "btn--ghost"}`}
            onClick={deleteGateway}
          >
            <IconTrash /> {deletingGateway ? "Confirm?" : "Delete"}
          </button>
        </div>
      </div>

      {/* Edit gateway form */}
      {editingGateway && (
        <div className="card-body" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <GatewayForm
            initial={{ name: gateway.name, baseUrl: gateway.baseUrl }}
            isEdit
            saving={savingGateway}
            onSave={saveGateway}
            onCancel={() => { setEditingGateway(false); setDeletingGateway(false); }}
          />
        </div>
      )}

      {/* Models section */}
      <div style={{ padding: "var(--space-5) var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            Models
            {gateway.models.length > 0 && (
              <span className="badge badge--info" style={{ marginLeft: "var(--space-2)", fontSize: "0.7rem" }}>
                {gateway.models.length}
              </span>
            )}
          </span>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button
              className="btn btn--ghost btn--sm"
              onClick={fetchModels}
              disabled={fetching}
            >
              <IconDownload /> {fetching ? "Fetching…" : "Fetch from gateway"}
            </button>
            <button className="btn btn--secondary btn--sm" onClick={() => setAddingModel(v => !v)}>
              <IconPlus /> Add model
            </button>
          </div>
        </div>

        {/* Fetch picker */}
        {fetchedModels && (
          <FetchPicker
            models={fetchedModels}
            existing={gateway.models}
            onImport={importModels}
            onClose={() => setFetchedModels(null)}
          />
        )}

        {/* Add model form */}
        {addingModel && (
          <ModelForm
            saving={savingModel}
            onSave={addModel}
            onCancel={() => setAddingModel(false)}
          />
        )}

        {/* Model list */}
        {gateway.models.length === 0 && !addingModel ? (
          <div style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px dashed var(--border-subtle)" }}>
            No models yet. Add models manually or fetch from the gateway.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {gateway.models.map(model => (
              <div key={model.id} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {editingModelId === model.id ? (
                  <ModelForm
                    initial={model}
                    saving={savingModel}
                    onSave={editModel}
                    onCancel={() => setEditingModelId(null)}
                  />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-3) var(--space-4)", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-primary)", wordBreak: "break-all" }}>
                        {model.id}
                      </span>
                      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{model.name}</span>
                        {model.whenToUse && (
                          <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>{model.whenToUse}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "var(--space-1)", flexShrink: 0 }}>
                      <button
                        className="btn btn--ghost btn--sm btn--icon"
                        title="Edit model"
                        onClick={() => { setEditingModelId(model.id); setRemovingModelId(null); }}
                      >
                        <IconEdit />
                      </button>
                      <button
                        className={`btn btn--sm btn--icon ${removingModelId === model.id ? "btn--danger" : "btn--ghost"}`}
                        title={removingModelId === model.id ? "Click again to confirm removal" : "Remove model"}
                        onClick={() => removeModel(model.id)}
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function GatewayPanel({ onStatus, onError }: Props) {
  const [gateways, setGateways] = useState<GatewayInfo[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingNew, setSavingNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/user/gateways", { cache: "no-store" });
      const data = await res.json() as { gateways?: GatewayInfo[]; error?: string };
      if (!res.ok) { onError?.(data.error ?? "Failed to load gateways."); return; }
      setGateways(data.gateways ?? []);
    } catch {
      onError?.("Network error loading gateways.");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => { load(); }, [load]);

  async function createGateway(data: { name: string; baseUrl: string; apiKey: string }) {
    setSavingNew(true);
    try {
      const res = await fetch("/api/v1/user/gateways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json() as { error?: string };
      if (!res.ok) { onError?.(body.error ?? "Failed to create gateway."); return; }
      onStatus?.("Gateway created.");
      setShowAddForm(false);
      await load();
    } finally {
      setSavingNew(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
        <div style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
          Loading gateways…
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn--sm" style={{ flexShrink: 0 }} onClick={() => setShowAddForm(v => !v)}>
          <IconPlus /> Add gateway
        </button>
      </div>

      {/* Add gateway form */}
      {showAddForm && (
        <div className="card">
          <div className="card-header">
            <h3>New gateway</h3>
          </div>
          <div className="card-body">
            <GatewayForm
              saving={savingNew}
              onSave={createGateway}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        </div>
      )}

      {/* Empty state */}
      {gateways?.length === 0 && !showAddForm && (
        <div style={{ padding: "var(--space-12)", textAlign: "center", background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", border: "1px dashed var(--border-default)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "var(--space-4)" }}>🔌</div>
          <p style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "var(--space-2)" }}>No gateways configured</p>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "var(--space-6)", maxWidth: 360, margin: "0 auto var(--space-6)" }}>
            Add a gateway to connect an upstream API provider and assign models to it.
          </p>
          <button className="btn" onClick={() => setShowAddForm(true)}>
            <IconPlus /> Add your first gateway
          </button>
        </div>
      )}

      {/* Gateway cards */}
      {gateways?.map(gw => (
        <GatewayCard
          key={gw.id}
          gateway={gw}
          onRefresh={load}
          onStatus={onStatus}
          onError={onError}
        />
      ))}
    </div>
  );
}
