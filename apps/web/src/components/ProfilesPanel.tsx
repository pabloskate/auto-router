"use client";

import { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// ProfilesPanel.tsx
//
// Redesigned routing profiles with a card-based layout:
// - Each profile is a distinct card with clear visual separation
// - Profile ID is prominent (this is what users send in API calls)
// - Inheritance indicators for overridden settings
// - Inline editing with clear save/discard actions
// ─────────────────────────────────────────────────────────────────────────────

export type RouterProfile = {
  id: string;
  name: string;
  description?: string;
  defaultModel?: string;
  classifierModel?: string;
  routingInstructions?: string;
  blocklist?: string[];
  catalogFilter?: string[];
};

interface Props {
  profiles: RouterProfile[] | null;
  onChange: (updated: RouterProfile[]) => void;
  onSave: () => Promise<boolean>;
}

// ─── Icons ───────────────────────────────────────────────────────────────────
function IconPlus({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

function IconTrash({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
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

function IconTag({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  );
}

function IconModel({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}

function IconBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    </svg>
  );
}

function IconFilter({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  );
}

function IconInfo({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="empty-state" style={{ padding: "var(--space-10) var(--space-6)" }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "var(--radius-xl)",
          background: "var(--bg-interactive)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <IconTag style={{ width: 28, height: 28, color: "var(--text-muted)" } as any} />
      </div>
      <div className="empty-state-title">No Routing Profiles</div>
      <p className="empty-state-desc">
        Profiles let clients use custom model names (e.g., auto-cheap, auto-coding) with purpose-specific routing strategies.
      </p>
      <button className="btn" onClick={onCreate}>
        <IconPlus />
        Create First Profile
      </button>
    </div>
  );
}

// ─── Profile Card ────────────────────────────────────────────────────────────
function ProfileCard({
  profile,
  index,
  onUpdate,
  onRemove,
}: {
  profile: RouterProfile;
  index: number;
  onUpdate: (idx: number, patch: Partial<RouterProfile>) => void;
  onRemove: (idx: number) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(!profile.id);

  return (
    <div className="profile-card animate-slide-in" style={{ animationDelay: `${index * 50}ms` }}>
      {/* Card Header */}
      <div className="profile-card-header">
        <div className="profile-card-title">
          {profile.id ? (
            <>
              <span className="profile-card-id">{profile.id}</span>
              {profile.name && <span className="profile-card-name">— {profile.name}</span>}
            </>
          ) : (
            <span style={{ fontStyle: "italic", color: "var(--text-muted)" }}>New Profile</span>
          )}
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button
            className="btn btn--sm btn--ghost"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Collapse" : "Expand"}
          </button>
          <button
            className="btn btn--sm btn--danger"
            onClick={() => onRemove(index)}
          >
            <IconTrash />
          </button>
        </div>
      </div>

      {/* Required Fields - Always Visible */}
      <div className="form-row" style={{ marginBottom: isExpanded ? "var(--space-5)" : 0 }}>
        <div className="form-group">
          <label className="form-label">
            Profile ID <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <input
            className="input input--mono"
            type="text"
            value={profile.id}
            onChange={(e) => onUpdate(index, { id: e.target.value })}
            placeholder="auto-cheap"
          />
          <span className="form-hint">The model name clients send in requests. Must be unique.</span>
        </div>

        <div className="form-group">
          <label className="form-label">
            Display Name <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <input
            className="input"
            type="text"
            value={profile.name}
            onChange={(e) => onUpdate(index, { name: e.target.value })}
            placeholder="Cheap Auto"
          />
          <span className="form-hint">Human-readable name shown in the UI.</span>
        </div>
      </div>

      {/* Expanded Fields */}
      {isExpanded && (
        <>
          {/* Description */}
          <div className="form-group" style={{ marginBottom: "var(--space-5)" }}>
            <label className="form-label">Description</label>
            <input
              className="input"
              type="text"
              value={profile.description || ""}
              onChange={(e) => onUpdate(index, { description: e.target.value || undefined })}
              placeholder="Brief description of when to use this profile..."
            />
          </div>

          {/* Model Overrides */}
          <div style={{ marginBottom: "var(--space-5)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                marginBottom: "var(--space-4)",
                paddingBottom: "var(--space-3)",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <IconModel style={{ color: "var(--text-muted)" } as any} />
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                Model Overrides
              </span>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Fallback Model</label>
                <input
                  className="input input--mono"
                  type="text"
                  value={profile.defaultModel || ""}
                  onChange={(e) => onUpdate(index, { defaultModel: e.target.value || undefined })}
                  placeholder="Inherits from global config"
                />
                <span className="form-hint">Override the default fallback model for this profile.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Classifier Model</label>
                <input
                  className="input input--mono"
                  type="text"
                  value={profile.classifierModel || ""}
                  onChange={(e) => onUpdate(index, { classifierModel: e.target.value || undefined })}
                  placeholder="Inherits from global config"
                />
                <span className="form-hint">Override the LLM used for routing decisions.</span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ marginBottom: "var(--space-5)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                marginBottom: "var(--space-4)",
                paddingBottom: "var(--space-3)",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <IconFilter style={{ color: "var(--text-muted)" } as any} />
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                Model Filters
              </span>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <IconBlock style={{ width: 12, height: 12 } as any} />
                    Additional Blocklist
                  </div>
                </label>
                <input
                  className="input input--mono"
                  type="text"
                  value={profile.blocklist?.join(", ") || ""}
                  onChange={(e) => {
                    const ids = e.target.value
                      .split(",")
                      .map((v) => v.trim())
                      .filter((v) => v.length > 0);
                    onUpdate(index, { blocklist: ids.length > 0 ? ids : undefined });
                  }}
                  placeholder="Added to global blocklist"
                />
                <span className="form-hint">Extra models to exclude (in addition to global blocklist).</span>
              </div>

              <div className="form-group">
                <label className="form-label">Catalog Filter</label>
                <input
                  className="input input--mono"
                  type="text"
                  value={profile.catalogFilter?.join(", ") || ""}
                  onChange={(e) => {
                    const ids = e.target.value
                      .split(",")
                      .map((v) => v.trim())
                      .filter((v) => v.length > 0);
                    onUpdate(index, { catalogFilter: ids.length > 0 ? ids : undefined });
                  }}
                  placeholder="Only route to these models"
                />
                <span className="form-hint">If set, only these models will be considered (restricts catalog).</span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="form-group">
            <label className="form-label">
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <IconInfo style={{ width: 12, height: 12 } as any} />
                Custom Routing Instructions
              </div>
            </label>
            <textarea
              className="textarea"
              value={profile.routingInstructions || ""}
              onChange={(e) => onUpdate(index, { routingInstructions: e.target.value || undefined })}
              placeholder="e.g., Always prefer the cheapest model. Prioritize DeepSeek and GLM for reasoning tasks..."
              rows={3}
            />
            <span className="form-hint">Replaces global routing instructions for this profile. Be specific!</span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ProfilesPanel({ profiles, onChange, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const items = profiles || [];

  function updateProfile(idx: number, patch: Partial<RouterProfile>) {
    const updated = [...items];
    updated[idx] = { ...(updated[idx] as RouterProfile), ...patch };
    onChange(updated);
  }

  function addProfile() {
    onChange([...items, { id: "", name: "" }]);
  }

  function removeProfile(idx: number) {
    const updated = [...items];
    updated.splice(idx, 1);
    onChange(updated);
  }

  async function handleSave() {
    setSaving(true);
    await onSave();
    setSaving(false);
  }

  return (
    <div>
      {/* Create Button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-5)" }}>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", maxWidth: 600 }}>
          Profiles let clients use custom model names like <code className="code">auto-cheap</code> or{" "}
          <code className="code">auto-coding</code> that trigger specific routing strategies.
        </p>
        <button className="btn" onClick={addProfile}>
          <IconPlus />
          Add Profile
        </button>
      </div>

      {/* Profiles List */}
      {items.length === 0 ? (
        <EmptyState onCreate={addProfile} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {items.map((profile, idx) => (
            <ProfileCard
              key={idx}
              profile={profile}
              index={idx}
              onUpdate={updateProfile}
              onRemove={removeProfile}
            />
          ))}
        </div>
      )}

      {/* Save Button */}
      {items.length > 0 && (
        <div style={{ marginTop: "var(--space-6)", paddingTop: "var(--space-6)", borderTop: "1px solid var(--border-subtle)" }}>
          <button className="btn" onClick={() => void handleSave()} disabled={saving}>
            <IconSave />
            {saving ? "Saving..." : "Save All Profiles"}
          </button>
        </div>
      )}
    </div>
  );
}
