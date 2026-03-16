"use client";

import React, { useEffect, useRef, useState } from "react";
import type { RouterProfile, RouterProfileModel } from "@custom-router/core";

import { SaveActionBar, type SaveActionState } from "./SaveActionBar";
import type { GatewayInfo, GatewayModel } from "@/src/features/gateways/contracts";
import {
  AUTO_PROFILE_ID,
  AUTO_PROFILE_NAME,
  buildProfileModelKey,
  ensureAutoProfile,
  hasResolvedProfileModel,
  normalizeProfile,
  normalizeProfileModel,
} from "@/src/lib/routing/profile-config";
import { ROUTING_PRESETS, type RoutingPreset } from "@/src/lib/routing-presets";

export type { RouterProfile } from "@custom-router/core";

const REASONING_OPTIONS = [
  { value: "none", label: "None" },
  { value: "minimal", label: "Minimal" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "xhigh", label: "Extra high" },
] as const;

interface Props {
  profiles: RouterProfile[] | null;
  gateways: GatewayInfo[];
  onChange: (updated: RouterProfile[]) => void;
  saveState: SaveActionState;
  onSave: () => Promise<boolean>;
  routingConfigRequiresReset?: boolean;
  routingConfigResetMessage?: string | null;
  onResetLegacyConfig?: () => Promise<void>;
  onCreateGatewayModel?: (gatewayId: string, model: GatewayModel) => Promise<GatewayModel | null>;
}

interface ProfileCardProps {
  profile: RouterProfile;
  index: number;
  gateways: GatewayInfo[];
  isRequired: boolean;
  forceExpanded?: boolean;
  onUpdate: (idx: number, patch: Partial<RouterProfile>) => void;
  onRemove: (idx: number) => void;
  onCreateGatewayModel?: (gatewayId: string, model: GatewayModel) => Promise<GatewayModel | null>;
}

interface CustomModelDraft {
  gatewayId: string;
  modelId: string;
  name: string;
  modality: string;
  reasoningPreset: GatewayModel["reasoningPreset"];
  whenToUse: string;
  description: string;
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
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

function IconZap({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function gatewayName(gateways: GatewayInfo[], gatewayId?: string): string {
  if (!gatewayId) {
    return "Unresolved";
  }

  return gateways.find((gateway) => gateway.id === gatewayId)?.name ?? gatewayId;
}

function getGatewayModel(gateways: GatewayInfo[], gatewayId?: string, modelId?: string): GatewayModel | undefined {
  if (!gatewayId || !modelId) {
    return undefined;
  }

  return gateways.find((gateway) => gateway.id === gatewayId)?.models.find((model) => model.id === modelId);
}

function syncProfileModelFromGateway(gateways: GatewayInfo[], model: RouterProfileModel): RouterProfileModel {
  const normalized = normalizeProfileModel(model);
  const gatewayModel = getGatewayModel(gateways, normalized.gatewayId, normalized.modelId);
  const reasoningPreset = normalized.reasoningPreset ?? normalized.thinking ?? gatewayModel?.reasoningPreset ?? gatewayModel?.thinking;

  return {
    ...normalized,
    name: normalized.name ?? gatewayModel?.name ?? normalized.modelId,
    modality: normalized.modality ?? gatewayModel?.modality,
    reasoningPreset,
    thinking: reasoningPreset ?? normalized.thinking ?? gatewayModel?.thinking,
    whenToUse: normalized.whenToUse ?? gatewayModel?.whenToUse,
    description: normalized.description ?? gatewayModel?.description,
  };
}

function sanitizeProfileSelections(profile: RouterProfile): RouterProfile {
  const resolvedSelections = new Set(
    (profile.models ?? [])
      .filter(hasResolvedProfileModel)
      .map((model) => buildProfileModelKey(model.gatewayId, model.modelId)),
  );

  return {
    ...profile,
    defaultModel: profile.defaultModel && resolvedSelections.has(profile.defaultModel) ? profile.defaultModel : undefined,
    classifierModel: profile.classifierModel && resolvedSelections.has(profile.classifierModel) ? profile.classifierModel : undefined,
  };
}

function createSuggestedProfileModel(gateways: GatewayInfo[], presetModel: GatewayModel): RouterProfileModel {
  const matches = gateways.flatMap((gateway) =>
    gateway.models
      .filter((model) => model.id === presetModel.id)
      .map((model) => ({ gatewayId: gateway.id, model })),
  );

  if (matches.length === 1) {
    return {
      gatewayId: matches[0]?.gatewayId,
      modelId: presetModel.id,
      name: presetModel.name,
      modality: presetModel.modality,
      reasoningPreset: presetModel.reasoningPreset ?? presetModel.thinking,
      thinking: presetModel.reasoningPreset ?? presetModel.thinking,
      whenToUse: presetModel.whenToUse,
      description: presetModel.description,
    };
  }

  return {
    modelId: presetModel.id,
    name: presetModel.name,
    modality: presetModel.modality,
    reasoningPreset: presetModel.reasoningPreset ?? presetModel.thinking,
    thinking: presetModel.reasoningPreset ?? presetModel.thinking,
    whenToUse: presetModel.whenToUse,
    description: presetModel.description,
  };
}

function createProfileFromPreset(preset: RoutingPreset, gateways: GatewayInfo[]): RouterProfile {
  const models = preset.models.map((model) => createSuggestedProfileModel(gateways, model));
  const resolvedPresetModels = models.filter(hasResolvedProfileModel);
  const defaultModel = resolvedPresetModels.find((model) => model.modelId === preset.defaultModel);
  const classifierModel = resolvedPresetModels.find((model) => model.modelId === preset.classifierModel);

  return {
    id: preset.id,
    name: preset.name,
    description: preset.description,
    routingInstructions: preset.routingInstructions,
    defaultModel: defaultModel ? buildProfileModelKey(defaultModel.gatewayId, defaultModel.modelId) : undefined,
    classifierModel: classifierModel ? buildProfileModelKey(classifierModel.gatewayId, classifierModel.modelId) : undefined,
    models,
  };
}

function nextProfileModelDraft(_gateways: GatewayInfo[], _models: RouterProfileModel[]): RouterProfileModel {
  return {
    modelId: "",
    name: "",
  };
}

function createCustomModelDraft(gateways: GatewayInfo[]): CustomModelDraft {
  return {
    gatewayId: gateways[0]?.id ?? "",
    modelId: "",
    name: "",
    modality: "text->text",
    reasoningPreset: "none",
    whenToUse: "",
    description: "",
  };
}

function availableGatewayModels(gateway: GatewayInfo | undefined, profile: RouterProfile, rowIndex: number): GatewayModel[] {
  if (!gateway) {
    return [];
  }

  const currentRow = profile.models?.[rowIndex];
  const takenModelIds = new Set(
    (profile.models ?? [])
      .filter((_, index) => index !== rowIndex)
      .map((model) => model.modelId)
      .filter(Boolean),
  );

  return gateway.models.filter((model) => model.id === currentRow?.modelId || !takenModelIds.has(model.id));
}

function QuickSetupSection({
  profiles,
  gateways,
  onApplyPreset,
  feedbackMessage,
}: {
  profiles: RouterProfile[];
  gateways: GatewayInfo[];
  onApplyPreset: (preset: RoutingPreset) => void;
  feedbackMessage?: string | null;
}) {
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const existingProfileIds = new Set(profiles.map((profile) => profile.id));
  const availablePresets = ROUTING_PRESETS.filter((preset) => !existingProfileIds.has(preset.id));
  const selectedPreset = availablePresets.find((preset) => preset.id === selectedPresetId) ?? availablePresets[0];
  const suggestedProfile = selectedPreset ? createProfileFromPreset(selectedPreset, gateways) : null;
  const resolvedCount = (suggestedProfile?.models ?? []).filter(hasResolvedProfileModel).length;
  const unresolvedCount = (suggestedProfile?.models ?? []).length - resolvedCount;

  useEffect(() => {
    if (!selectedPreset && availablePresets.length > 0) {
      setSelectedPresetId(availablePresets[0]?.id ?? "");
    }
  }, [availablePresets, selectedPreset]);

  return (
    <div className="card">
      <div className="card-header">
        <h3>Quick Setup</h3>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "var(--space-1)", marginBottom: 0 }}>
          Create a profile template first, then bind any unresolved models to the gateway you want.
        </p>
      </div>
      <div className="card-body">
        {availablePresets.length === 0 ? (
          <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
            All quick setup presets have already been added.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div className="form-row" style={{ alignItems: "end" }}>
              <div className="form-group">
                <label className="form-label">Template</label>
                <select className="input" value={selectedPreset?.id ?? ""} onChange={(event) => setSelectedPresetId(event.target.value)}>
                  {availablePresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>{preset.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                <button className="btn btn--primary" type="button" disabled={!selectedPreset} onClick={() => selectedPreset && onApplyPreset(selectedPreset)}>
                  <IconZap />
                  Add profile from template
                </button>
              </div>
            </div>

            {selectedPreset && (
              <div
                style={{
                  padding: "var(--space-4)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-surface)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                }}
              >
                <div style={{ fontWeight: 600 }}>{selectedPreset.name}</div>
                <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>{selectedPreset.description}</div>
                <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                  <span className="badge badge--info">{resolvedCount} resolved</span>
                  {unresolvedCount > 0 && <span className="badge badge--warning">{unresolvedCount} need gateway selection</span>}
                  <span className="badge badge--default">{selectedPreset.models.length} models total</span>
                </div>
              </div>
            )}

            {feedbackMessage && (
              <div
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--accent)",
                  background: "var(--accent-dim)",
                  color: "var(--text-primary)",
                  fontSize: "0.875rem",
                }}
              >
                {feedbackMessage}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LegacyResetNotice({
  message,
  onReset,
  disabled,
}: {
  message?: string | null;
  onReset?: () => Promise<void>;
  disabled: boolean;
}) {
  return (
    <div
      style={{
        padding: "var(--space-5)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--danger)",
        background: "var(--danger-dim)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--space-4)",
      }}
    >
      <div>
        <div style={{ fontWeight: 600, color: "var(--danger)", marginBottom: "var(--space-1)" }}>Routing profiles need to be rebuilt</div>
        <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          {message ?? "Legacy routing settings were detected. Reset the routing profiles and rebuild them in the new profile-centric editor."}
        </div>
      </div>
      <button className="btn btn--danger" type="button" onClick={() => void onReset?.()} disabled={disabled}>
        Reset routing profiles
      </button>
    </div>
  );
}

function AutoSizeTextarea({
  value,
  onChange,
  placeholder,
  minHeight = 140,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) {
      return;
    }

    node.style.height = "0px";
    node.style.height = `${Math.max(node.scrollHeight, minHeight)}px`;
  }, [value, minHeight]);

  return (
    <textarea
      ref={textareaRef}
      className="textarea"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      style={{ minHeight, resize: "vertical", overflow: "hidden" }}
    />
  );
}

function summarizeInstructions(value?: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "No custom routing instructions yet.";
  }

  return trimmed.length > 220 ? `${trimmed.slice(0, 220).trim()}...` : trimmed;
}

function reasoningBadgeVariant(reasoningPreset?: GatewayModel["reasoningPreset"]): "badge--success" | "badge--info" | "badge--warning" {
  if (reasoningPreset === "none" || reasoningPreset === "minimal") {
    return "badge--success";
  }

  if (reasoningPreset === "high" || reasoningPreset === "xhigh") {
    return "badge--warning";
  }

  return "badge--info";
}

function ProfileModelCard({
  model,
  rowIndex,
  gateways,
  profile,
  onUpdate,
  onRemove,
}: {
  model: RouterProfileModel;
  rowIndex: number;
  gateways: GatewayInfo[];
  profile: RouterProfile;
  onUpdate: (rowIndex: number, nextModel: RouterProfileModel) => void;
  onRemove: (rowIndex: number) => void;
}) {
  const resolved = hasResolvedProfileModel(model);
  const currentGateway = gateways.find((gateway) => gateway.id === model.gatewayId);
  const selectableModels = availableGatewayModels(currentGateway, profile, rowIndex);
  const currentGatewayModel = getGatewayModel(gateways, model.gatewayId, model.modelId);
  const resolvedLabel = resolved ? `${gatewayName(gateways, model.gatewayId)} bound` : "Needs gateway binding";
  const reasoningPreset = model.reasoningPreset ?? model.thinking ?? currentGatewayModel?.reasoningPreset ?? currentGatewayModel?.thinking;
  const displayName = model.name || currentGatewayModel?.name || "No profile label";
  const [isExpanded, setIsExpanded] = useState(!resolved);

  useEffect(() => {
    if (!resolved) {
      setIsExpanded(true);
    }
  }, [resolved]);

  return (
    <div
      style={{
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        background: "var(--bg-surface)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "var(--space-4)",
          padding: "var(--space-4) var(--space-5)",
          borderBottom: isExpanded ? "1px solid var(--border-subtle)" : "none",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-1)" }}>
            <code className="mono" style={{ fontSize: "0.9375rem", fontWeight: 600 }}>
              {model.modelId || "Select a gateway model"}
            </code>
            <span className={`badge ${resolved ? "badge--info" : "badge--warning"}`}>{resolvedLabel}</span>
            {reasoningPreset && <span className={`badge ${reasoningBadgeVariant(reasoningPreset)}`}>Reasoning {reasoningPreset}</span>}
            {model.modality && <span className="badge badge--default">{model.modality}</span>}
          </div>
          <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            <span>{displayName}</span>
            {model.whenToUse && (
              <>
                <span style={{ color: "var(--text-muted)" }}>•</span>
                <span>{model.whenToUse}</span>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
          <button className="btn btn--ghost btn--sm" type="button" onClick={() => setIsExpanded((current) => !current)}>
            {isExpanded ? "Done" : "Edit"}
          </button>
          <button className="btn btn--ghost btn--sm" type="button" onClick={() => onRemove(rowIndex)}>
            <IconTrash />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div style={{ padding: "var(--space-4) var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Gateway</label>
              <select
                className="input"
                value={model.gatewayId || ""}
                onChange={(event) => {
                  const nextGatewayId = event.target.value || undefined;
                  const nextGateway = gateways.find((gateway) => gateway.id === nextGatewayId);
                  const nextModels = availableGatewayModels(nextGateway, profile, rowIndex);
                  const matchingCurrentModel = nextModels.find((entry) => entry.id === model.modelId);
                  const fallbackModel = matchingCurrentModel ?? nextModels[0];
                  onUpdate(rowIndex, {
                    ...model,
                    gatewayId: nextGatewayId,
                    modelId: fallbackModel?.id ?? model.modelId,
                    name: model.name ?? fallbackModel?.name,
                    modality: model.modality ?? fallbackModel?.modality,
                    reasoningPreset: model.reasoningPreset ?? model.thinking ?? fallbackModel?.reasoningPreset ?? fallbackModel?.thinking,
                    thinking: model.reasoningPreset ?? model.thinking ?? fallbackModel?.reasoningPreset ?? fallbackModel?.thinking,
                    whenToUse: model.whenToUse ?? fallbackModel?.whenToUse,
                    description: model.description ?? fallbackModel?.description,
                  });
                }}
              >
                <option value="">Select a gateway</option>
                {gateways.map((gateway) => (
                  <option key={gateway.id} value={gateway.id}>{gateway.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Gateway model</label>
              <select
                className="input input--mono"
                value={model.modelId}
                onChange={(event) => {
                  const selectedGatewayModel = selectableModels.find((entry) => entry.id === event.target.value);
                  onUpdate(rowIndex, {
                    ...model,
                    modelId: event.target.value,
                    name: selectedGatewayModel?.name ?? model.name,
                    modality: selectedGatewayModel?.modality ?? model.modality,
                    reasoningPreset: model.reasoningPreset ?? model.thinking ?? selectedGatewayModel?.reasoningPreset ?? selectedGatewayModel?.thinking,
                    thinking: model.reasoningPreset ?? model.thinking ?? selectedGatewayModel?.reasoningPreset ?? selectedGatewayModel?.thinking,
                    whenToUse: selectedGatewayModel?.whenToUse ?? model.whenToUse,
                    description: selectedGatewayModel?.description ?? model.description,
                  });
                }}
              >
                {!selectableModels.some((entry) => entry.id === model.modelId) && model.modelId && (
                  <option value={model.modelId}>{model.modelId}</option>
                )}
                <option value="">Select a gateway model</option>
                {selectableModels.map((gatewayModel) => (
                  <option key={gatewayModel.id} value={gatewayModel.id}>{gatewayModel.id}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Profile label</label>
              <input
                className="input"
                value={model.name || ""}
                onChange={(event) => onUpdate(rowIndex, { ...model, name: event.target.value || undefined })}
                placeholder="Optional override"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Reasoning preset</label>
              <select
                className="input"
                value={reasoningPreset ?? "none"}
                onChange={(event) => onUpdate(rowIndex, { ...model, reasoningPreset: event.target.value as GatewayModel["reasoningPreset"], thinking: event.target.value as GatewayModel["reasoningPreset"] })}
              >
                {REASONING_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Modality</label>
              <input
                className="input input--mono"
                value={model.modality || ""}
                onChange={(event) => onUpdate(rowIndex, { ...model, modality: event.target.value || undefined })}
                placeholder="text->text"
              />
            </div>
            <div className="form-group">
              <label className="form-label">When to use</label>
              <input
                className="input"
                value={model.whenToUse || ""}
                onChange={(event) => onUpdate(rowIndex, { ...model, whenToUse: event.target.value || undefined })}
                placeholder="Optional routing hint"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="textarea"
              rows={2}
              value={model.description || ""}
              onChange={(event) => onUpdate(rowIndex, { ...model, description: event.target.value || undefined })}
              placeholder="Optional description override"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileCard({
  profile,
  index,
  gateways,
  isRequired,
  forceExpanded = false,
  onUpdate,
  onRemove,
  onCreateGatewayModel,
}: ProfileCardProps) {
  const [showCustomModelForm, setShowCustomModelForm] = useState(false);
  const [customModelDraft, setCustomModelDraft] = useState<CustomModelDraft>(() => createCustomModelDraft(gateways));
  const [customModelSaving, setCustomModelSaving] = useState(false);
  const [showRoutingInstructions, setShowRoutingInstructions] = useState(false);
  const normalizedProfile = sanitizeProfileSelections(normalizeProfile(profile));
  const resolvedModels = (normalizedProfile.models ?? []).filter(hasResolvedProfileModel);
  const unresolvedModelCount = (normalizedProfile.models ?? []).length - resolvedModels.length;
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (forceExpanded) {
      setIsExpanded(true);
    }
  }, [forceExpanded]);

  function updateProfile(patch: Partial<RouterProfile>) {
    onUpdate(index, sanitizeProfileSelections({ ...normalizedProfile, ...patch }));
  }

  function updateModel(rowIndex: number, nextModel: RouterProfileModel) {
    const updatedModels = [...(normalizedProfile.models ?? [])];
    updatedModels[rowIndex] = syncProfileModelFromGateway(gateways, nextModel);
    updateProfile({ models: updatedModels });
  }

  function removeModel(rowIndex: number) {
    const updatedModels = [...(normalizedProfile.models ?? [])];
    updatedModels.splice(rowIndex, 1);
    updateProfile({ models: updatedModels });
  }

  async function handleCreateCustomModel() {
    if (!onCreateGatewayModel || !customModelDraft.gatewayId || !customModelDraft.modelId.trim()) {
      return;
    }

    setCustomModelSaving(true);
    try {
      const createdModel = await onCreateGatewayModel(customModelDraft.gatewayId, {
        id: customModelDraft.modelId.trim(),
        name: customModelDraft.name.trim() || customModelDraft.modelId.trim(),
        modality: customModelDraft.modality.trim() || undefined,
        reasoningPreset: customModelDraft.reasoningPreset,
        thinking: customModelDraft.reasoningPreset,
        whenToUse: customModelDraft.whenToUse.trim() || undefined,
        description: customModelDraft.description.trim() || undefined,
      });

      if (!createdModel) {
        return;
      }

      updateProfile({
        models: [
          ...(normalizedProfile.models ?? []),
          {
            gatewayId: customModelDraft.gatewayId,
            modelId: createdModel.id,
            name: createdModel.name,
            modality: createdModel.modality,
            reasoningPreset: createdModel.reasoningPreset ?? createdModel.thinking,
            thinking: createdModel.reasoningPreset ?? createdModel.thinking,
            whenToUse: createdModel.whenToUse,
            description: createdModel.description,
          },
        ],
      });
      setCustomModelDraft(createCustomModelDraft(gateways));
      setShowCustomModelForm(false);
    } finally {
      setCustomModelSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span>{normalizedProfile.name || normalizedProfile.id || "New Profile"}</span>
            {isRequired && <span className="badge badge--accent">Required</span>}
            <span className="badge badge--info">{(normalizedProfile.models ?? []).length} models</span>
            {unresolvedModelCount > 0 && <span className="badge badge--warning">{unresolvedModelCount} unresolved</span>}
            {(normalizedProfile.models ?? []).length === 0 && <span className="badge badge--warning">Needs setup</span>}
          </h3>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "var(--space-1)", marginBottom: 0 }}>
            <code className="code">{normalizedProfile.id || "set-profile-id"}</code>
            {" · "}
            {normalizedProfile.description || "Bind exact gateway models here and edit only the rows you need."}
          </p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
          <button className="btn btn--ghost btn--sm" type="button" onClick={() => setIsExpanded((current) => !current)}>
            {isExpanded ? "Done" : "Edit profile"}
          </button>
          {!isRequired && (
            <button className="btn btn--danger btn--sm" type="button" onClick={() => onRemove(index)}>
              <IconTrash />
              Remove
            </button>
          )}
        </div>
      </div>
      {isExpanded && (
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Profile ID</label>
            <input
              className="input input--mono"
              value={normalizedProfile.id}
              readOnly={isRequired}
              onChange={(event) => updateProfile({ id: event.target.value })}
              placeholder="auto-coding"
            />
            <span className="form-hint">The model name clients send to the API.</span>
          </div>
          <div className="form-group">
            <label className="form-label">Display name</label>
            <input
              className="input"
              value={normalizedProfile.name}
              onChange={(event) => updateProfile({ name: event.target.value })}
              placeholder="Fast Coding"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Description</label>
            <input
              className="input"
              value={normalizedProfile.description || ""}
              onChange={(event) => updateProfile({ description: event.target.value || undefined })}
              placeholder="Short human-readable summary"
            />
          </div>
        </div>

        <div
          style={{
            padding: "var(--space-4)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-surface)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" }}>
            <div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Routing instructions</div>
              <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                Advanced. Use this only when the profile needs explicit classifier guidance.
              </div>
            </div>
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => setShowRoutingInstructions((current) => !current)}>
              {showRoutingInstructions ? "Hide instructions" : "Edit instructions"}
            </button>
          </div>

          {showRoutingInstructions ? (
            <AutoSizeTextarea
              value={normalizedProfile.routingInstructions || ""}
              onChange={(value) => updateProfile({ routingInstructions: value || undefined })}
              placeholder="Explain how the classifier should choose among this profile's models."
            />
          ) : (
            <div
              style={{
                fontSize: "0.875rem",
                color: "var(--text-secondary)",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
              }}
            >
              {summarizeInstructions(normalizedProfile.routingInstructions)}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" }}>
            <div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Profile models</div>
              <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                Select the exact gateway-bound models this profile may route to. Duplicate model IDs inside one profile are not allowed.
              </div>
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button
                className="btn btn--secondary btn--sm"
                type="button"
                onClick={() => updateProfile({ models: [...(normalizedProfile.models ?? []), nextProfileModelDraft(gateways, normalizedProfile.models ?? [])] })}
              >
                <IconPlus />
                Add synced model
              </button>
              <button
                className="btn btn--secondary btn--sm"
                type="button"
                onClick={() => setShowCustomModelForm((current) => !current)}
              >
                <IconPlus />
                Create custom model
              </button>
            </div>
          </div>

          {showCustomModelForm && (
            <div style={{ padding: "var(--space-4)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Gateway</label>
                  <select
                    className="input"
                    value={customModelDraft.gatewayId}
                    onChange={(event) => setCustomModelDraft((current) => ({ ...current, gatewayId: event.target.value }))}
                  >
                    <option value="">Select a gateway</option>
                    {gateways.map((gateway) => (
                      <option key={gateway.id} value={gateway.id}>{gateway.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Model ID</label>
                  <input
                    className="input input--mono"
                    value={customModelDraft.modelId}
                    onChange={(event) => setCustomModelDraft((current) => ({ ...current, modelId: event.target.value }))}
                    placeholder="provider/model-id"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Display name</label>
                  <input
                    className="input"
                    value={customModelDraft.name}
                    onChange={(event) => setCustomModelDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Modality</label>
                  <input
                    className="input input--mono"
                    value={customModelDraft.modality}
                    onChange={(event) => setCustomModelDraft((current) => ({ ...current, modality: event.target.value }))}
                    placeholder="text->text"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Reasoning preset</label>
                  <select
                    className="input"
                    value={customModelDraft.reasoningPreset}
                    onChange={(event) => setCustomModelDraft((current) => ({ ...current, reasoningPreset: event.target.value as GatewayModel["reasoningPreset"] }))}
                  >
                    {REASONING_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">When to use</label>
                  <input
                    className="input"
                    value={customModelDraft.whenToUse}
                    onChange={(event) => setCustomModelDraft((current) => ({ ...current, whenToUse: event.target.value }))}
                    placeholder="Optional routing hint"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="textarea"
                  rows={2}
                  value={customModelDraft.description}
                  onChange={(event) => setCustomModelDraft((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Optional model description"
                />
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button className="btn btn--primary btn--sm" type="button" disabled={customModelSaving} onClick={() => void handleCreateCustomModel()}>
                  {customModelSaving ? "Saving…" : "Create and add"}
                </button>
                <button className="btn btn--secondary btn--sm" type="button" onClick={() => setShowCustomModelForm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {(normalizedProfile.models ?? []).length === 0 ? (
            <div className="empty-state" style={{ padding: "var(--space-8)" }}>
              <div className="empty-state-title">No profile models yet</div>
              <p className="empty-state-desc">Add synced gateway inventory or create a custom gateway model from this profile.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {(normalizedProfile.models ?? []).map((model, rowIndex) => {
                return (
                  <ProfileModelCard
                    key={`${model.gatewayId ?? "draft"}:${model.modelId || rowIndex}`}
                    model={model}
                    rowIndex={rowIndex}
                    gateways={gateways}
                    profile={normalizedProfile}
                    onUpdate={updateModel}
                    onRemove={removeModel}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Fallback model</label>
            <select
              className="input"
              value={normalizedProfile.defaultModel || ""}
              onChange={(event) => updateProfile({ defaultModel: event.target.value || undefined })}
            >
              <option value="">Select a fallback model</option>
              {resolvedModels.map((model) => (
                <option key={`default:${buildProfileModelKey(model.gatewayId, model.modelId)}`} value={buildProfileModelKey(model.gatewayId, model.modelId)}>
                  {formatProfileModelOptionLabel(gateways, model)}
                </option>
              ))}
            </select>
            <span className="form-hint">Only resolved profile models can be used as fallbacks.</span>
          </div>
          <div className="form-group">
            <label className="form-label">Router model</label>
            <select
              className="input"
              value={normalizedProfile.classifierModel || ""}
              onChange={(event) => updateProfile({ classifierModel: event.target.value || undefined })}
            >
              <option value="">Select a router model</option>
              {resolvedModels.map((model) => (
                <option key={`classifier:${buildProfileModelKey(model.gatewayId, model.modelId)}`} value={buildProfileModelKey(model.gatewayId, model.modelId)}>
                  {formatProfileModelOptionLabel(gateways, model)}
                </option>
              ))}
            </select>
            <span className="form-hint">The classifier is resolved through the gateway you bind here.</span>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}

function formatProfileModelOptionLabel(gateways: GatewayInfo[], model: RouterProfileModel): string {
  const label = model.name || getGatewayModel(gateways, model.gatewayId, model.modelId)?.name || model.modelId;
  return `${label} · ${gatewayName(gateways, model.gatewayId)} · ${model.modelId}`;
}

function validateProfilesForSave(profiles: RouterProfile[]): string | null {
  for (const profile of profiles) {
    if (!profile.id.trim()) {
      return "Every profile needs an ID before you can save.";
    }

    if (!profile.name.trim()) {
      return `Profile "${profile.id}" needs a display name before you can save.`;
    }

    for (const model of profile.models ?? []) {
      if (!model.gatewayId || !model.modelId.trim()) {
        return `Finish selecting the gateway and model for every row in "${profile.name || profile.id}" before saving.`;
      }
    }
  }

  return null;
}

export function ProfilesPanel({
  profiles,
  gateways,
  onChange,
  saveState,
  onSave,
  routingConfigRequiresReset = false,
  routingConfigResetMessage,
  onResetLegacyConfig,
  onCreateGatewayModel,
}: Props) {
  const items = ensureAutoProfile(profiles);
  const [presetFeedback, setPresetFeedback] = useState<string | null>(null);
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  function updateProfile(index: number, patch: Partial<RouterProfile>) {
    setValidationMessage(null);
    const updated = [...items];
    updated[index] = sanitizeProfileSelections(normalizeProfile({ ...(updated[index] as RouterProfile), ...patch }));
    onChange(updated);
  }

  function addProfile() {
    setPresetFeedback(null);
    setValidationMessage(null);
    onChange([
      ...items,
      {
        id: "",
        name: "",
        models: [],
      },
    ]);
  }

  function removeProfile(index: number) {
    setPresetFeedback(null);
    setValidationMessage(null);
    const updated = [...items];
    updated.splice(index, 1);
    onChange(updated);
  }

  function applyPreset(preset: RoutingPreset) {
    const nextProfile = createProfileFromPreset(preset, gateways);
    setExpandedProfileId(null);
    setPresetFeedback(`Added "${nextProfile.name}" below. Open that profile to review the selected models and set its fallback/router choices.`);
    setValidationMessage(null);
    onChange([...items, nextProfile]);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        document.getElementById(`routing-profile-${nextProfile.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  async function handleSave() {
    const validationError = validateProfilesForSave(items);
    if (validationError) {
      setValidationMessage(validationError);
      return;
    }

    await onSave();
  }

  if (routingConfigRequiresReset) {
    return (
      <LegacyResetNotice
        message={routingConfigResetMessage}
        onReset={onResetLegacyConfig}
        disabled={saveState === "saving"}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <QuickSetupSection profiles={items} gateways={gateways} onApplyPreset={applyPreset} feedbackMessage={presetFeedback} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", maxWidth: 620 }}>
          Profiles are now the only routed model pools. Gateways only provide credentials and synced inventories; every routed candidate must be selected here.
        </p>
        <button className="btn btn--primary" type="button" onClick={addProfile}>
          <IconPlus />
          Add profile
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {items.map((profile, index) => (
          <div key={profile.id || `profile-${index}`} id={`routing-profile-${profile.id || `profile-${index}`}`}>
            <ProfileCard
              profile={profile}
              index={index}
              gateways={gateways}
              isRequired={profile.id === AUTO_PROFILE_ID}
              forceExpanded={profile.id === expandedProfileId}
              onUpdate={updateProfile}
              onRemove={removeProfile}
              onCreateGatewayModel={onCreateGatewayModel}
            />
          </div>
        ))}
      </div>

      {validationMessage && (
        <div
          style={{
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--warning)",
            background: "var(--warning-dim)",
            color: "var(--text-primary)",
            fontSize: "0.875rem",
          }}
        >
          {validationMessage}
        </div>
      )}

      <div style={{ marginTop: "var(--space-2)", paddingTop: "var(--space-6)", borderTop: "1px solid var(--border-subtle)" }}>
        <SaveActionBar state={saveState} onSave={handleSave} saveLabel="Save profiles" />
      </div>
    </div>
  );
}
