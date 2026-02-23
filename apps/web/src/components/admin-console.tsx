"use client";

// ─────────────────────────────────────────────────────────────────────────────
// admin-console.tsx
//
// Redesigned with clear information architecture:
//
// Navigation Model:
//   Tab-based organization with 5 distinct contexts:
//   • Dashboard   — Overview, API keys, quick stats
//   • Playground  — Interactive chat testing
//   • Routing     — Core routing config + profiles
//   • Models      — Custom model catalog (constitution)
//   • Account     — Credentials, keys, settings
//
// Key IA Improvements:
//   - Progressive disclosure: each tab is a self-contained context
//   - Per-section saving: no more global "save all" confusion
//   - Visual hierarchy: clear section titles, better grouping
//   - Status indicators: real-time feedback on all actions
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { AuthGate } from "./AuthGate";
import { ApiKeyPanel } from "./ApiKeyPanel";
import { PlaygroundPanel } from "./PlaygroundPanel";
import { RouterConfigPanel } from "./RouterConfigPanel";
import { ProfilesPanel, type RouterProfile } from "./ProfilesPanel";
import { CatalogEditorPanel, type CatalogItem } from "./CatalogEditorPanel";

type TabId = "dashboard" | "playground" | "routing" | "models" | "account";

type ServerUserInfo = {
  id: string;
  name: string;
  email?: string;
  preferredModels: string[];
  defaultModel: string | null;
  classifierModel: string | null;
  routingInstructions: string | null;
  blocklist: string[] | null;
  customCatalog: CatalogItem[] | null;
  profiles: RouterProfile[] | null;
  upstreamBaseUrl: string | null;
  classifierBaseUrl: string | null;
  upstreamApiKeyConfigured: boolean;
  classifierApiKeyConfigured: boolean;
};

type UserInfo = ServerUserInfo & {
  upstreamApiKeyInput: string;
  classifierApiKeyInput: string;
  clearUpstreamApiKey: boolean;
  clearClassifierApiKey: boolean;
};

export type ApiKeyInfo = {
  id: string;
  prefix: string;
  label: string | null;
  revoked: boolean;
  createdAt: string;
};

function hydrateUser(user: ServerUserInfo): UserInfo {
  return {
    ...user,
    upstreamApiKeyInput: "",
    classifierApiKeyInput: "",
    clearUpstreamApiKey: false,
    clearClassifierApiKey: false,
  };
}

// ─── Icons ───────────────────────────────────────────────────────────────────
function IconDashboard({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
}

function IconPlayground({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function IconRouting({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  );
}

function IconModels({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
    </svg>
  );
}

function IconAccount({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function IconLogout({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

// ─── Tab Navigation ──────────────────────────────────────────────────────────
function TabNav({ activeTab, onTabChange }: { activeTab: TabId; onTabChange: (tab: TabId) => void }) {
  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "dashboard", label: "Dashboard", icon: IconDashboard },
    { id: "playground", label: "Playground", icon: IconPlayground },
    { id: "routing", label: "Routing", icon: IconRouting },
    { id: "models", label: "Models", icon: IconModels },
    { id: "account", label: "Account", icon: IconAccount },
  ];

  return (
    <div className="tabs" role="tablist">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          role="tab"
          aria-selected={activeTab === id}
          className={`tab ${activeTab === id ? "tab--active" : ""}`}
          onClick={() => onTabChange(id)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Status Indicator ──────────────────────────────────────────────────────────
function StatusBadge({ status, error }: { status: string; error?: string }) {
  if (error) {
    return (
      <div className="badge badge--danger">
        <span className="status-dot status-dot--danger" />
        {error}
      </div>
    );
  }
  if (status === "Saving..." || status === "Loading...") {
    return (
      <div className="badge badge--info animate-pulse">
        <span className="status-dot status-dot--info" />
        {status}
      </div>
    );
  }
  if (status.includes("saved") || status.includes("Success")) {
    return (
      <div className="badge badge--success">
        <span className="status-dot status-dot--success" />
        {status}
      </div>
    );
  }
  return (
    <div className="badge badge--info">
      <span className="status-dot status-dot--info" />
      {status || "Ready"}
    </div>
  );
}

// ─── Dashboard Tab ─────────────────────────────────────────────────────────────
function DashboardTab({
  user,
  keys,
  onKeysChanged,
  setStatus,
  setError,
}: {
  user: UserInfo | null;
  keys: ApiKeyInfo[];
  onKeysChanged: () => void;
  setStatus: (s: string) => void;
  setError: (e?: string) => void;
}) {
  const activeKeys = keys.filter((k) => !k.revoked).length;
  const revokedKeys = keys.filter((k) => k.revoked).length;

  return (
    <div className="animate-fade-in">
      {/* Quick Stats */}
      <div className="form-row mb-6">
        <div className="card">
          <div className="card-body" style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            <div style={{ width: 48, height: 48, borderRadius: "var(--radius-lg)", background: "var(--accent-dim)", display: "grid", placeItems: "center" }}>
              <IconRouting className="text-secondary" style={{ width: 24, height: 24, color: "var(--accent)" } as any} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>Active API Keys</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "var(--space-1)" }}>{activeKeys}</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            <div style={{ width: 48, height: 48, borderRadius: "var(--radius-lg)", background: "var(--success-dim)", display: "grid", placeItems: "center" }}>
              <IconModels className="text-secondary" style={{ width: 24, height: 24, color: "var(--success)" } as any} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>Custom Models</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "var(--space-1)" }}>{user?.customCatalog?.length || 0}</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            <div style={{ width: 48, height: 48, borderRadius: "var(--radius-lg)", background: "var(--warning-dim)", display: "grid", placeItems: "center" }}>
              <IconRouting className="text-secondary" style={{ width: 24, height: 24, color: "var(--warning)" } as any} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>Routing Profiles</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "var(--space-1)" }}>{user?.profiles?.length || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* API Keys Section */}
      <div className="card">
        <div className="card-header">
          <h3>API Keys</h3>
          <StatusBadge status={`${activeKeys} active, ${revokedKeys} revoked`} />
        </div>
        <div className="card-body">
          <ApiKeyPanel keys={keys} onKeysChanged={onKeysChanged} onStatus={setStatus} onError={setError} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function AdminConsole() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [status, setStatus] = useState("Loading...");
  const [error, setError] = useState<string | undefined>();

  async function loadData() {
    setStatus("Loading...");
    setError(undefined);

    const [userRes, keysRes] = await Promise.all([
      fetch("/api/v1/user/me", { cache: "no-store" }),
      fetch("/api/v1/user/keys", { cache: "no-store" }),
    ]);

    if (!userRes.ok) {
      setIsAuthenticated(false);
      setUser(null);
      setKeys([]);
      setStatus("Please log in");
      return;
    }

    if (!keysRes.ok) {
      setError("Failed to load API keys");
      setStatus("Error");
      return;
    }

    const userData = await userRes.json() as { user: ServerUserInfo };
    const keysData = await keysRes.json() as { keys: ApiKeyInfo[] };

    setUser(hydrateUser(userData.user));
    setKeys(keysData.keys);
    setIsAuthenticated(true);
    setStatus("Ready");
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleLogout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    setIsAuthenticated(false);
    setUser(null);
    setKeys([]);
    setStatus("Logged out");
    setActiveTab("dashboard");
  }

  async function saveUserData(updates: Partial<UserInfo>) {
    if (!user) return false;
    setStatus("Saving...");
    setError(undefined);

    const updatedUser = { ...user, ...updates };

    const payload: Record<string, unknown> = {
      preferred_models: updatedUser.preferredModels,
      default_model: updatedUser.defaultModel,
      classifier_model: updatedUser.classifierModel,
      routing_instructions: updatedUser.routingInstructions,
      blocklist: updatedUser.blocklist,
      custom_catalog: updatedUser.customCatalog,
      profiles: updatedUser.profiles,
      upstream_base_url: updatedUser.upstreamBaseUrl,
      classifier_base_url: updatedUser.classifierBaseUrl,
      clear_upstream_api_key: updatedUser.clearUpstreamApiKey,
      clear_classifier_api_key: updatedUser.clearClassifierApiKey,
    };

    if (updatedUser.upstreamApiKeyInput.trim().length > 0) {
      payload.upstream_api_key = updatedUser.upstreamApiKeyInput.trim();
    }
    if (updatedUser.classifierApiKeyInput.trim().length > 0) {
      payload.classifier_api_key = updatedUser.classifierApiKeyInput.trim();
    }

    const res = await fetch("/api/v1/user/me", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      await loadData();
      setStatus("Saved successfully");
      return true;
    }

    setError("Failed to save changes");
    setStatus("Error");
    return false;
  }

  if (!isAuthenticated) {
    return <AuthGate onAuthenticated={() => void loadData()} />;
  }

  return (
    <div className="animate-fade-in">
      {/* Header Bar */}
      <div className="admin-header">
        <div>
          <h1>Admin Console</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
            Manage your Auto Router configuration and API keys
          </p>
        </div>
        <div className="admin-header-meta">
          <StatusBadge status={status} error={error} />
          <div className="user-pill">
            <span style={{ color: "var(--text-secondary)" }}>{user?.name}</span>
            <button className="btn btn--sm btn--ghost" onClick={() => void handleLogout()}>
              <IconLogout />
              <span className="sr-only">Log out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Tab Content */}
      {activeTab === "dashboard" && (
        <DashboardTab
          user={user}
          keys={keys}
          onKeysChanged={() => void loadData()}
          setStatus={setStatus}
          setError={setError}
        />
      )}

      {activeTab === "playground" && (
        <div className="animate-fade-in">
          <PlaygroundPanel />
        </div>
      )}

      {activeTab === "routing" && (
        <div className="animate-fade-in">
          <div className="card">
            <div className="card-header">
              <h3>Router Configuration</h3>
              <StatusBadge status={status} error={error} />
            </div>
            <div className="card-body">
              <RouterConfigPanel
                config={{
                  defaultModel: user?.defaultModel ?? null,
                  classifierModel: user?.classifierModel ?? null,
                  routingInstructions: user?.routingInstructions ?? null,
                  blocklist: user?.blocklist ?? null,
                  upstreamBaseUrl: user?.upstreamBaseUrl ?? null,
                  classifierBaseUrl: user?.classifierBaseUrl ?? null,
                  upstreamApiKeyConfigured: user?.upstreamApiKeyConfigured ?? false,
                  classifierApiKeyConfigured: user?.classifierApiKeyConfigured ?? false,
                  upstreamApiKeyInput: user?.upstreamApiKeyInput ?? "",
                  classifierApiKeyInput: user?.classifierApiKeyInput ?? "",
                  clearUpstreamApiKey: user?.clearUpstreamApiKey ?? false,
                  clearClassifierApiKey: user?.clearClassifierApiKey ?? false,
                }}
                onChange={(updated) => user && setUser({ ...user, ...updated })}
                onSave={saveUserData}
              />
            </div>
          </div>

          <div className="card mt-6">
            <div className="card-header">
              <h3>Routing Profiles</h3>
            </div>
            <div className="card-body">
              <ProfilesPanel
                profiles={user?.profiles ?? null}
                onChange={(profiles) => user && setUser({ ...user, profiles })}
                onSave={() => saveUserData({})}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "models" && (
        <div className="animate-fade-in">
          <div className="card">
            <div className="card-header">
              <h3>Model Catalog</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                Define which models the router can choose from
              </p>
            </div>
            <div className="card-body">
              <CatalogEditorPanel
                catalog={user?.customCatalog ?? null}
                onChange={(catalog) => user && setUser({ ...user, customCatalog: catalog })}
                onSave={() => saveUserData({})}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "account" && (
        <div className="animate-fade-in">
          <div className="card">
            <div className="card-header">
              <h3>Account Settings</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input className="input" type="text" value={user?.name || ""} disabled />
                <span className="form-hint">Contact support to change your display name</span>
              </div>

              {user?.email && (
                <div className="form-group mt-4">
                  <label className="form-label">Email</label>
                  <input className="input" type="text" value={user.email} disabled />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
