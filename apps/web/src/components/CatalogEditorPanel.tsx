"use client";

// ─────────────────────────────────────────────────────────────────────────────
// CatalogEditorPanel.tsx
//
// Inline editor for the user's custom model catalog ("constitution").
//
// The custom catalog defines which models the router is allowed to pick from
// and provides per-model metadata (whenToUse, modality, thinking level) that
// the LLM classifier uses to make routing decisions.
//
// If the user has no custom catalog, the router falls back to the system
// catalog (populated by the ingest-worker cron job).
// ─────────────────────────────────────────────────────────────────────────────

export type CatalogItem = {
  id: string;
  name: string;
  modality?: string;
  thinking?: string;
  whenToUse?: string;
};

interface Props {
  catalog: CatalogItem[] | null;
  onChange: (updated: CatalogItem[]) => void;
  onSave: () => void;
}

const MODALITY_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "text->text", label: "Text → Text" },
  { value: "text,image->text", label: "Text, Image → Text" },
  { value: "text,video->text", label: "Text, Video → Text" },
  { value: "text,audio->text", label: "Text, Audio → Text" },
  { value: "text->image", label: "Text → Image" },
  { value: "text->audio", label: "Text → Audio" },
];

const THINKING_OPTIONS = [
  { value: "none", label: "None" },
  { value: "minimal", label: "Minimal" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "xhigh", label: "X-High" },
];

export function CatalogEditorPanel({ catalog, onChange, onSave }: Props) {
  const items = catalog || [];

  function updateItem(idx: number, patch: Partial<CatalogItem>) {
    const updated = [...items];
    updated[idx] = { ...(updated[idx] as CatalogItem), ...patch };
    onChange(updated);
  }

  function addItem() {
    onChange([...items, { id: "new-model/id", name: "New Model" }]);
  }

  function removeItem(idx: number) {
    const updated = [...items];
    updated.splice(idx, 1);
    onChange(updated);
  }

  return (
    <article className="panel stack" style={{ gridColumn: "1 / -1" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>Your Constitution (Model Catalog)</h3>
        <button onClick={addItem}>+ Add Model</button>
      </div>
      <p style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
        Define the precise list of models the Auto Router is allowed to pick from,
        and give the classifier specific notes on when to pick them.
      </p>

      <table style={{ marginTop: 12, minWidth: "100%", tableLayout: "auto" }}>
        <thead>
          <tr>
            <th style={{ width: "20%" }}>Model ID</th>
            <th style={{ width: "15%" }}>Name</th>
            <th style={{ width: "35%" }}>Notes / When to use</th>
            <th style={{ width: "10%" }}>Modality</th>
            <th style={{ width: "10%" }}>Thinking</th>
            <th style={{ width: "10%" }}></th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: 16, color: "var(--ink-soft)" }}>
                No models defined. The Auto Router will use the system catalog.
              </td>
            </tr>
          ) : (
            items.map((item, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    type="text"
                    value={item.id}
                    onChange={(e) => updateItem(idx, { id: e.target.value })}
                    style={{ width: "100%", fontSize: "0.8rem", padding: "4px" }}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(idx, { name: e.target.value })}
                    style={{ width: "100%", fontSize: "0.8rem", padding: "4px" }}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={item.whenToUse || ""}
                    placeholder="e.g., 'Use for coding'"
                    onChange={(e) => updateItem(idx, { whenToUse: e.target.value })}
                    style={{ width: "100%", fontSize: "0.8rem", padding: "4px" }}
                  />
                </td>
                <td>
                  <select
                    value={item.modality || "text"}
                    onChange={(e) => updateItem(idx, { modality: e.target.value })}
                    style={{ width: "100%", fontSize: "0.8rem", padding: "4px" }}
                  >
                    {MODALITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={item.thinking || "none"}
                    onChange={(e) => updateItem(idx, { thinking: e.target.value })}
                    style={{ width: "100%", fontSize: "0.8rem", padding: "4px" }}
                  >
                    {THINKING_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    className="alt"
                    style={{ color: "var(--critical)", padding: "2px 6px" }}
                    onClick={() => removeItem(idx)}
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="actions" style={{ marginTop: 16 }}>
        <button onClick={onSave}>Save Configuration & Catalog</button>
      </div>
    </article>
  );
}
