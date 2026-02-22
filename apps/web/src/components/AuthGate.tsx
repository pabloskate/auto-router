"use client";

// ─────────────────────────────────────────────────────────────────────────────
// AuthGate.tsx
//
// Login / signup form shown when the user is not authenticated.
// On success it calls onAuthenticated() so the parent can load the dashboard.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";

interface Props {
  onAuthenticated: () => void;
}

export function AuthGate({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    const endpoint = mode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/signup";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json() as any;
    if (res.ok) {
      onAuthenticated();
    } else {
      setError(data.error || "Authentication failed.");
    }
  }

  return (
    <section className="stack" style={{ maxWidth: 400, margin: "80px auto" }}>
      <div className="panel stack">
        <h2>{mode === "login" ? "🔐 Log In" : "✨ Sign Up"}</h2>

        {mode === "signup" && (
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your Name"
            />
          </label>
        )}

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Password</span>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") void handleSubmit(); }}
            placeholder="Password"
          />
        </label>

        {error && <p style={{ color: "var(--critical)", fontSize: "0.85rem" }}>{error}</p>}

        <div className="actions" style={{ marginTop: 8 }}>
          <button onClick={() => void handleSubmit()}>
            {mode === "login" ? "Log In" : "Sign Up"}
          </button>
          <button
            className="alt"
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
          >
            {mode === "login" ? "Create an account" : "Log in instead"}
          </button>
        </div>
      </div>
    </section>
  );
}
