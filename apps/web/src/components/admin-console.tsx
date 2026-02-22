"use client";

// ─────────────────────────────────────────────────────────────────────────────
// admin-console.tsx
//
// Root shell for the admin UI. Handles data loading and wires together the
// four focused sub-components:
//
//   AuthGate           — login / signup form (shown when not authenticated)
//   ApiKeyPanel        — generate, list, and revoke API keys
//   RouterConfigPanel  — per-user router settings (default model, instructions, blocklist)
//   CatalogEditorPanel — custom model catalog ("constitution")
//
// All API calls live in this file or in the individual panels. Sub-components
// receive data as props and call callbacks to signal changes — they never fetch
// directly (except ApiKeyPanel which manages its own generate/revoke calls).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { AuthGate } from "./AuthGate";
import { ApiKeyPanel, type ApiKeyInfo } from "./ApiKeyPanel";
import { RouterConfigPanel } from "./RouterConfigPanel";
import { CatalogEditorPanel, type CatalogItem } from "./CatalogEditorPanel";

type UserInfo = {
  id: string;
  name: string;
  preferredModels: string[];
  defaultModel: string | null;
  classifierModel: string | null;
  routingInstructions: string | null;
  blocklist: string[] | null;
  customCatalog: CatalogItem[] | null;
};

export function AdminConsole() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [status, setStatus] = useState("Loading...");

  async function loadData() {
    setStatus("Loading dashboard...");

    const [userRes, keysRes] = await Promise.all([
      fetch("/api/v1/user/me", { cache: "no-store" }),
      fetch("/api/v1/user/keys", { cache: "no-store" }),
    ]);

    if (!userRes.ok) {
      setIsAuthenticated(false);
      setUser(null);
      setKeys([]);
      setStatus("Please log in.");
      return;
    }

    if (!keysRes.ok) {
      setStatus("Failed to load API keys.");
      return;
    }

    const userData = await userRes.json() as { user: UserInfo };
    const keysData = await keysRes.json() as { keys: ApiKeyInfo[] };

    setUser(userData.user);
    setKeys(keysData.keys);
    setIsAuthenticated(true);
    setStatus("Ready.");
  }

  useEffect(() => { void loadData(); }, []);

  async function handleLogout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    setIsAuthenticated(false);
    setUser(null);
    setKeys([]);
    setStatus("Logged out.");
  }

  async function savePreferences() {
    if (!user) return;
    setStatus("Saving preferences...");
    const res = await fetch("/api/v1/user/me", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        preferred_models: user.preferredModels,
        default_model: user.defaultModel,
        classifier_model: user.classifierModel,
        routing_instructions: user.routingInstructions,
        blocklist: user.blocklist,
        custom_catalog: user.customCatalog,
      }),
    });
    setStatus(res.ok ? "Preferences saved." : "Failed to save preferences.");
  }

  if (!isAuthenticated) {
    return <AuthGate onAuthenticated={() => void loadData()} />;
  }

  return (
    <section className="stack">
      <div className="panel stack">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Welcome, {user?.name}</h2>
          <button className="alt" onClick={() => void handleLogout()}>Log Out</button>
        </div>
        <p><strong>Status:</strong> {status}</p>
      </div>

      <div className="grid">
        <ApiKeyPanel
          keys={keys}
          onKeysChanged={() => void loadData()}
          onStatus={setStatus}
        />

        <RouterConfigPanel
          config={{
            defaultModel: user?.defaultModel ?? null,
            classifierModel: user?.classifierModel ?? null,
            routingInstructions: user?.routingInstructions ?? null,
            blocklist: user?.blocklist ?? null,
          }}
          onChange={(updated) => user && setUser({ ...user, ...updated })}
        />

        <CatalogEditorPanel
          catalog={user?.customCatalog ?? null}
          onChange={(catalog) => user && setUser({ ...user, customCatalog: catalog })}
          onSave={() => void savePreferences()}
        />
      </div>
    </section>
  );
}
