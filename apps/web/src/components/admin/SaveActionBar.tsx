"use client";

import React from "react";

export type SaveActionState = "pristine" | "dirty" | "saving" | "saved";

type Props = {
  state: SaveActionState;
  onSave: () => void | Promise<void>;
  saveLabel?: string;
};

function statusMeta(state: SaveActionState): { badgeClass: string; title: string; hint: string } {
  if (state === "dirty") {
    return {
      badgeClass: "badge--warning",
      title: "Unsaved changes",
      hint: "Review your edits and save to apply them.",
    };
  }

  if (state === "saving") {
    return {
      badgeClass: "badge--info",
      title: "Saving changes...",
      hint: "Applying updates to your router configuration.",
    };
  }

  return {
    badgeClass: "badge--success",
    title: "All changes saved",
    hint: "Your edits are up to date.",
  };
}

export function SaveActionBar({ state, onSave, saveLabel = "Save changes" }: Props) {
  const status = statusMeta(state);
  const isSaving = state === "saving";
  const canSave = state === "dirty";

  return (
    <div className="save-action-bar" role="status" aria-live="polite">
      <div className="save-action-bar__status">
        <span className={`badge ${status.badgeClass}`}>{status.title}</span>
        <span className="save-action-bar__hint">{status.hint}</span>
      </div>
      <button className="btn btn--primary" onClick={() => void onSave()} disabled={!canSave || isSaving}>
        {isSaving ? "Saving..." : saveLabel}
      </button>
    </div>
  );
}
