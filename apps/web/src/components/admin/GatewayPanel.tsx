"use client";

import { useEffect, useState } from "react";

import { CUSTOM_PRESET_ID, GATEWAY_PRESETS } from "../../lib/gateway-presets";
import type { GatewayInfo, GatewayModel } from "@/src/features/gateways/contracts";

export type { GatewayInfo, GatewayModel } from "@/src/features/gateways/contracts";

const INVENTORY_PREVIEW_LIMIT = 10;

interface Props {
  onStatus?: (msg: string) => void;
  onError?: (msg?: string) => void;
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconDownload({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconEdit({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

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
  const [selectedPreset, setSelectedPreset] = useState("");
  const [error, setError] = useState("");

  const isPresetSelected = selectedPreset !== "" && selectedPreset !== CUSTOM_PRESET_ID;

  function handlePresetChange(presetId: string) {
    setSelectedPreset(presetId);
    if (presetId === "" || presetId === CUSTOM_PRESET_ID) {
      setName("");
      setBaseUrl("");
      return;
    }

    const preset = GATEWAY_PRESETS.find((entry) => entry.id === presetId);
    if (preset) {
      setName(preset.name);
      setBaseUrl(preset.baseUrl);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError("Name is required.");
    if (!baseUrl.trim()) return setError("Base URL is required.");
    if (!isEdit && !apiKey.trim()) return setError("API key is required.");
    setError("");
    await onSave({ name: name.trim(), baseUrl: baseUrl.trim(), apiKey: apiKey.trim() });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {error && (
        <div style={{ padding: "var(--space-3) var(--space-4)", background: "var(--danger-dim)", border: "1px solid var(--danger)", borderRadius: "var(--radius-md)", color: "var(--danger)" }}>
          {error}
        </div>
      )}
      {!isEdit && (
        <div className="form-group">
          <label className="form-label">Provider</label>
          <select className="input" value={selectedPreset} onChange={(event) => handlePresetChange(event.target.value)}>
            <option value="">Select a provider…</option>
            {GATEWAY_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.name}</option>
            ))}
            <option value={CUSTOM_PRESET_ID}>Other / Custom</option>
          </select>
        </div>
      )}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Name</label>
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} readOnly={isPresetSelected} />
        </div>
        <div className="form-group">
          <label className="form-label">Base URL</label>
          <input className="input input--mono" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} readOnly={isPresetSelected} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">API Key</label>
        <input
          className="input input--mono"
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder={isEdit ? "Leave blank to keep existing key" : "sk-..."}
          autoComplete="new-password"
        />
        <span className="form-hint">Stored encrypted. Used only for requests routed to this gateway.</span>
      </div>
      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Add gateway"}
        </button>
        <button type="button" className="btn btn--secondary btn--sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function mergeFetchedModels(existing: GatewayModel[], fetched: Array<Pick<GatewayModel, "id" | "name">>): GatewayModel[] {
  const existingById = new Map(existing.map((model) => [model.id, model] as const));
  for (const fetchedModel of fetched) {
    if (!existingById.has(fetchedModel.id)) {
      existingById.set(fetchedModel.id, { id: fetchedModel.id, name: fetchedModel.name });
    }
  }
  return Array.from(existingById.values()).sort((left, right) => left.id.localeCompare(right.id));
}

function GatewayInventoryPreview({ models }: { models: GatewayModel[] }) {
  const [showInventory, setShowInventory] = useState(false);
  const [query, setQuery] = useState("");

  if (models.length === 0) {
    return (
      <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: 0 }}>
        No models synced yet. Use <strong>Sync inventory</strong> so routing profiles can select models from this gateway.
      </p>
    );
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filteredModels = normalizedQuery
    ? models.filter((model) => model.id.toLowerCase().includes(normalizedQuery) || model.name?.toLowerCase().includes(normalizedQuery))
    : models;
  const previewModels = models.slice(0, INVENTORY_PREVIEW_LIMIT);
  const hiddenCount = Math.max(models.length - previewModels.length, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-3)",
          flexWrap: "wrap",
        }}
      >
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: 0 }}>
          Synced inventory is used by routing profile pickers. Keep it collapsed here and choose models from the Routing tab.
        </p>
        <button className="btn btn--ghost btn--sm" type="button" onClick={() => setShowInventory((current) => !current)}>
          {showInventory ? "Hide inventory" : `View inventory (${models.length})`}
        </button>
      </div>

      {!showInventory ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
          {previewModels.map((model) => (
            <span key={model.id} className="badge badge--info" title={model.name}>
              {model.id}
            </span>
          ))}
          {hiddenCount > 0 && <span className="badge badge--default">+{hiddenCount} more</span>}
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
            padding: "var(--space-4)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-surface)",
          }}
        >
          <input
            className="input input--mono"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter synced model IDs"
          />
          {filteredModels.length === 0 ? (
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: 0 }}>
              No synced models match this filter.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-2)",
                maxHeight: 240,
                overflowY: "auto",
                paddingRight: "var(--space-1)",
              }}
            >
              {filteredModels.map((model) => (
                <span key={model.id} className="badge badge--info" title={model.name}>
                  {model.id}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GatewayCard({
  gateway,
  onRefresh,
  onStatus,
  onError,
}: {
  gateway: GatewayInfo;
  onRefresh: () => Promise<void>;
  onStatus?: (msg: string) => void;
  onError?: (msg?: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function saveGateway(data: { name: string; baseUrl: string; apiKey: string }) {
    setSaving(true);
    try {
      const body: Record<string, string> = { name: data.name, baseUrl: data.baseUrl };
      if (data.apiKey) {
        body.apiKey = data.apiKey;
      }

      const response = await fetch(`/api/v1/user/gateways/${gateway.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Failed to save gateway." })) as { error?: string };
        onError?.(payload.error ?? "Failed to save gateway.");
        return;
      }

      onStatus?.("Gateway saved.");
      setEditing(false);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function deleteGateway() {
    if (!deleting) {
      setDeleting(true);
      return;
    }

    const response = await fetch(`/api/v1/user/gateways/${gateway.id}`, { method: "DELETE" });
    if (!response.ok && response.status !== 204) {
      onError?.("Failed to delete gateway.");
      setDeleting(false);
      return;
    }

    onStatus?.("Gateway deleted.");
    await onRefresh();
  }

  async function syncModels() {
    setSyncing(true);
    try {
      const response = await fetch(`/api/v1/user/gateways/${gateway.id}/fetch-models`);
      const payload = await response.json().catch(() => ({ error: "Failed to fetch gateway models." })) as {
        models?: Array<Pick<GatewayModel, "id" | "name">>;
        error?: string;
      };

      if (!response.ok) {
        onError?.(payload.error ?? "Failed to fetch gateway models.");
        return;
      }

      const models = mergeFetchedModels(gateway.models, payload.models ?? []);
      const saveResponse = await fetch(`/api/v1/user/gateways/${gateway.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ models }),
      });

      if (!saveResponse.ok) {
        const savePayload = await saveResponse.json().catch(() => ({ error: "Failed to save synced models." })) as { error?: string };
        onError?.(savePayload.error ?? "Failed to save synced models.");
        return;
      }

      onStatus?.("Gateway inventory synced.");
      await onRefresh();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3>{gateway.name}</h3>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "var(--space-1)", marginBottom: 0 }}>
            <code className="code">{gateway.baseUrl}</code>
          </p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
          <span className="badge badge--info">{gateway.models.length} synced models</span>
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => void syncModels()} disabled={syncing}>
            <IconDownload />
            {syncing ? "Syncing…" : "Sync inventory"}
          </button>
          <button className="btn btn--ghost btn--sm" type="button" onClick={() => setEditing((current) => !current)}>
            <IconEdit />
            {editing ? "Close" : "Edit"}
          </button>
          <button className="btn btn--danger btn--sm" type="button" onClick={() => void deleteGateway()}>
            <IconTrash />
            {deleting ? "Confirm delete" : "Delete"}
          </button>
        </div>
      </div>
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {editing && (
          <GatewayForm
            initial={{ name: gateway.name, baseUrl: gateway.baseUrl }}
            isEdit
            saving={saving}
            onSave={saveGateway}
            onCancel={() => setEditing(false)}
          />
        )}

        <div>
          <div style={{ fontWeight: 600, marginBottom: "var(--space-2)" }}>Synced inventory</div>
          <GatewayInventoryPreview models={gateway.models} />
        </div>
      </div>
    </div>
  );
}

export function GatewayPanel({ onStatus, onError }: Props) {
  const [gateways, setGateways] = useState<GatewayInfo[] | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetch("/api/v1/user/gateways", { cache: "no-store" });
    const payload = await response.json().catch(() => ({ gateways: [] })) as { gateways?: GatewayInfo[]; error?: string };
    if (!response.ok) {
      onError?.(payload.error ?? "Failed to load gateways.");
      setGateways([]);
      return;
    }
    setGateways(payload.gateways ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createGateway(data: { name: string; baseUrl: string; apiKey: string }) {
    setSaving(true);
    try {
      const response = await fetch("/api/v1/user/gateways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const payload = await response.json().catch(() => ({ error: "Failed to create gateway." })) as { error?: string };
      if (!response.ok) {
        onError?.(payload.error ?? "Failed to create gateway.");
        return;
      }
      onStatus?.("Gateway added.");
      setShowAddForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (!gateways) {
    return (
      <div className="card">
        <div className="card-body">Loading gateways…</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Gateway credentials</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "var(--space-1)", marginBottom: 0 }}>
              Gateways now manage credentials and synced inventory only. Routed model pools are assembled in Routing Profiles.
            </p>
          </div>
          <button className="btn btn--primary btn--sm" type="button" onClick={() => setShowAddForm((current) => !current)}>
            <IconPlus />
            {showAddForm ? "Close" : "Add gateway"}
          </button>
        </div>
        {showAddForm && (
          <div className="card-body">
            <GatewayForm saving={saving} onSave={createGateway} onCancel={() => setShowAddForm(false)} />
          </div>
        )}
      </div>

      {gateways.length === 0 && !showAddForm ? (
        <div className="empty-state" style={{ padding: "var(--space-10) var(--space-6)" }}>
          <div className="empty-state-title">No gateways configured</div>
          <p className="empty-state-desc">Add a gateway so routing profiles can bind models from a synced inventory.</p>
          <button className="btn btn--primary" type="button" onClick={() => setShowAddForm(true)}>
            <IconPlus />
            Add your first gateway
          </button>
        </div>
      ) : (
        gateways.map((gateway) => (
          <GatewayCard
            key={gateway.id}
            gateway={gateway}
            onRefresh={load}
            onStatus={onStatus}
            onError={onError}
          />
        ))
      )}
    </div>
  );
}
