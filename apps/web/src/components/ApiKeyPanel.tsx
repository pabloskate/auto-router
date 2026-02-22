"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ApiKeyPanel.tsx
//
// Lists the user's API keys, lets them generate new ones and revoke existing
// ones. New key value is shown once (copy-only) then discarded.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";

export type ApiKeyInfo = {
  id: string;
  prefix: string;
  label: string | null;
  revoked: boolean;
  createdAt: string;
};

interface Props {
  keys: ApiKeyInfo[];
  onKeysChanged: () => void;
  onStatus: (msg: string) => void;
}

export function ApiKeyPanel({ keys, onKeysChanged, onStatus }: Props) {
  const [newKey, setNewKey] = useState<string | null>(null);

  async function generateKey() {
    onStatus("Generating key...");
    setNewKey(null);
    const res = await fetch("/api/v1/user/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: "New Key" }),
    });
    if (!res.ok) { onStatus("Failed to generate key."); return; }
    const data = await res.json() as { apiKey: string };
    setNewKey(data.apiKey);
    onStatus("Key generated. Copy it below!");
    onKeysChanged();
  }

  async function revokeKey(keyId: string) {
    onStatus("Revoking key...");
    const res = await fetch(`/api/v1/user/keys?keyId=${keyId}`, { method: "DELETE" });
    if (!res.ok) { onStatus("Failed to revoke key."); return; }
    onStatus("Key revoked.");
    onKeysChanged();
  }

  return (
    <article className="panel stack">
      <h3>Your API Keys</h3>
      <p style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
        Use these keys to authenticate requests to the Auto Router.
      </p>

      {newKey && (
        <div style={{ background: "var(--accent-bg)", border: "2px solid var(--accent)", padding: 12, borderRadius: 6 }}>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>🔑 New API Key (copy now — shown only once):</p>
          <code style={{ fontSize: "0.85rem", wordBreak: "break-all", display: "block", padding: "8px", background: "var(--bg-strong)", borderRadius: 6 }}>
            {newKey}
          </code>
          <button
            className="alt"
            style={{ marginTop: 8, fontSize: "0.8rem" }}
            onClick={() => { void navigator.clipboard.writeText(newKey); onStatus("Copied to clipboard!"); }}
          >
            Copy to Clipboard
          </button>
        </div>
      )}

      <div className="actions">
        <button onClick={() => void generateKey()}>Generate New Key</button>
      </div>

      <table style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>Prefix</th>
            <th>Status</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {keys.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", padding: 16, color: "var(--ink-soft)" }}>No API keys yet.</td>
            </tr>
          ) : (
            keys.map((k) => (
              <tr key={k.id}>
                <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{k.prefix}…</td>
                <td style={{ fontSize: "0.8rem" }}>{k.revoked ? "🔴 Revoked" : "🟢 Active"}</td>
                <td style={{ fontSize: "0.8rem" }}>{new Date(k.createdAt).toLocaleDateString()}</td>
                <td>
                  {!k.revoked && (
                    <button
                      className="alt"
                      style={{ padding: "2px 8px", fontSize: "0.75rem", color: "var(--critical)" }}
                      onClick={() => void revokeKey(k.id)}
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </article>
  );
}
