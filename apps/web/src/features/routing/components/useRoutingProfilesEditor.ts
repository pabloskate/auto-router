"use client";

import { useEffect, useRef, useState } from "react";
import type { RouterProfile, RouterProfileModel } from "@custom-router/core";

import { createAutosaveQueue } from "@/src/features/routing/profiles-autosave";
import type {
  ProfileBuilderRequest,
  ProfileBuilderRun,
  ProfileBuilderTaskFamily,
} from "@/src/features/routing/profile-builder-contracts";
import {
  PROFILE_BUILDER_BUDGET_POSTURES,
  PROFILE_BUILDER_LATENCY_SENSITIVITIES,
  PROFILE_BUILDER_OPTIMIZE_FOR,
  PROFILE_BUILDER_TASK_FAMILIES,
} from "@/src/features/routing/profile-builder-contracts";
import {
  buildProfileModelKey,
  hasResolvedProfileModel,
  normalizeProfileIdInput,
  getProfileIdValidationError,
  normalizeProfile,
} from "@/src/lib/routing/profile-config";
import type { GatewayInfo, GatewayModel } from "@/src/features/gateways/contracts";
import {
  createBlankProfile,
  createCustomModelDraft,
  createProfileFromPreset,
  DEFAULT_AUTOSAVE_SNAPSHOT,
  findMatchingPresetForProfile,
  formatGatewayModelOptionLabel,
  getGatewayModel,
  getQuickSetupPresets,
  normalizeProfilesForEditor,
  parseImportedProfileJson,
  refreshProfileFromPreset,
  sanitizeProfileSelections,
  serializeProfileForJson,
  syncProfileModelFromGateway,
  type CustomModelDraft,
  type ProfilesAutosaveSnapshot,
  validateProfilesDraft,
} from "@/src/features/routing/profiles-editor-utils";
import { getGatewayPresetId, type RoutingPreset } from "@/src/lib/routing-presets";

export interface RoutingProfilesEditorProps {
  profiles: RouterProfile[] | null;
  gateways: GatewayInfo[];
  onChange: (updated: RouterProfile[]) => void;
  onSave: (profiles: RouterProfile[]) => Promise<boolean>;
  saveState?: "pristine" | "dirty" | "saving" | "saved";
  routingConfigRequiresReset?: boolean;
  routingConfigResetMessage?: string | null;
  onResetLegacyConfig?: () => Promise<void>;
  onCreateGatewayModel?: (gatewayId: string, model: GatewayModel) => Promise<GatewayModel | null>;
  onProfileBuilderApplied?: () => Promise<void>;
}

interface QuickSetupState {
  displayName: string;
  error: string | null;
  open: boolean;
  profileId: string;
  selectedPresetId: string;
}

interface CreateProfileState {
  displayName: string;
  error: string | null;
  open: boolean;
  profileId: string;
}

interface CreateProfileChoiceState {
  open: boolean;
}

interface AgentCreateState {
  applying: boolean;
  editedDescription: string;
  editedDisplayName: string;
  editedProfileId: string;
  editedRoutingInstructions: string;
  error: string | null;
  open: boolean;
  request: ProfileBuilderRequest;
  run: ProfileBuilderRun | null;
  submitting: boolean;
}

interface ModelEditorState {
  draft: CustomModelDraft;
  error: string | null;
  open: boolean;
  profileId: string | null;
  rowIndex: number | null;
}

interface CustomModelState {
  draft: CustomModelDraft;
  error: string | null;
  open: boolean;
  profileId: string | null;
  saving: boolean;
}

interface AdvancedEditorState {
  draft: string;
  error: string | null;
  open: boolean;
  profileId: string | null;
}

interface PresetRefreshState {
  open: boolean;
  presetId: string | null;
  profileId: string | null;
}

const INSTRUCTION_AUTOSAVE_DEBOUNCE_MS = 2400;

function createQuickSetupState(presets: readonly RoutingPreset[]): QuickSetupState {
  const preset = presets[0];
  return {
    open: false,
    selectedPresetId: preset?.id ?? "",
    profileId: normalizeProfileIdInput(preset?.id ?? ""),
    displayName: preset?.name ?? "",
    error: null,
  };
}

function createProfileState(): CreateProfileState {
  return {
    open: false,
    profileId: "",
    displayName: "",
    error: null,
  };
}

function createProfileChoiceState(): CreateProfileChoiceState {
  return {
    open: false,
  };
}

function supportedProfileBuilderGateways(gateways: GatewayInfo[]): GatewayInfo[] {
  return gateways.filter((gateway) => {
    const presetId = getGatewayPresetId(gateway.baseUrl);
    return (presetId === "openrouter" || presetId === "vercel") && gateway.models.length > 0;
  });
}

function profileBuilderGatewayUnavailableReason(gateways: GatewayInfo[]): string | null {
  const supported = gateways.filter((gateway) => {
    const presetId = getGatewayPresetId(gateway.baseUrl);
    return presetId === "openrouter" || presetId === "vercel";
  });

  if (supported.length === 0) {
    return "Agent-assisted profile creation currently supports OpenRouter and Vercel AI Gateway only.";
  }
  if (!supported.some((gateway) => gateway.models.length > 0)) {
    return "Sync at least one OpenRouter or Vercel gateway model before using the agent flow.";
  }

  return null;
}

function defaultTaskFamilies(): ProfileBuilderTaskFamily[] {
  return ["general", "coding"];
}

function createAgentCreateState(gateways: GatewayInfo[], existingProfiles: RouterProfile[]): AgentCreateState {
  const supportedGateways = supportedProfileBuilderGateways(gateways);
  return {
    open: false,
    submitting: false,
    applying: false,
    error: null,
    run: null,
    editedProfileId: "",
    editedDisplayName: "",
    editedDescription: "",
    editedRoutingInstructions: "",
    request: {
      profileId: nextGeneratedProfileId(existingProfiles),
      displayName: "",
      optimizeFor: PROFILE_BUILDER_OPTIMIZE_FOR[0],
      taskFamilies: defaultTaskFamilies(),
      needsVision: false,
      needsLongContext: false,
      latencySensitivity: PROFILE_BUILDER_LATENCY_SENSITIVITIES[1],
      budgetPosture: PROFILE_BUILDER_BUDGET_POSTURES[0],
      preferredGatewayId: supportedGateways[0]?.id,
      mustUse: "",
      avoid: "",
      additionalContext: "",
    },
  };
}

function createModelEditorState(gateways: GatewayInfo[]): ModelEditorState {
  return {
    open: false,
    profileId: null,
    rowIndex: null,
    error: null,
    draft: createCustomModelDraft(gateways),
  };
}

function createCustomModelState(gateways: GatewayInfo[]): CustomModelState {
  return {
    open: false,
    profileId: null,
    error: null,
    saving: false,
    draft: createCustomModelDraft(gateways),
  };
}

function createAdvancedEditorState(): AdvancedEditorState {
  return {
    open: false,
    profileId: null,
    draft: "",
    error: null,
  };
}

function createPresetRefreshState(): PresetRefreshState {
  return {
    open: false,
    presetId: null,
    profileId: null,
  };
}

function createEditorDraftFromModel(gateways: GatewayInfo[], model?: RouterProfileModel): CustomModelDraft {
  const base = createCustomModelDraft(gateways);
  if (!model) {
    return base;
  }

  const gatewayModel = getGatewayModel(gateways, model.gatewayId, model.modelId);
  const reasoningPreset = model.reasoningPreset ?? model.thinking ?? gatewayModel?.reasoningPreset ?? gatewayModel?.thinking ?? "provider_default";

  return {
    gatewayId: model.gatewayId ?? base.gatewayId,
    modelId: model.modelId,
    name: model.name ?? gatewayModel?.name ?? "",
    modality: model.modality ?? gatewayModel?.modality ?? base.modality,
    reasoningPreset,
    whenToUse: model.whenToUse ?? gatewayModel?.whenToUse ?? "",
    description: model.description ?? gatewayModel?.description ?? "",
  };
}

function buildModelFromDraft(gateways: GatewayInfo[], draft: CustomModelDraft): RouterProfileModel {
  return syncProfileModelFromGateway(gateways, {
    gatewayId: draft.gatewayId || undefined,
    modelId: draft.modelId.trim(),
    name: draft.name.trim() || undefined,
    modality: draft.modality.trim() || undefined,
    reasoningPreset: draft.reasoningPreset,
    thinking: draft.reasoningPreset,
    whenToUse: draft.whenToUse.trim() || undefined,
    description: draft.description.trim() || undefined,
  });
}

function nextGeneratedProfileId(existing: RouterProfile[]): string {
  let counter = existing.length + 1;
  let candidate = `profile-${counter}`;
  const existingIds = new Set(existing.map((profile) => profile.id));
  while (existingIds.has(candidate)) {
    counter += 1;
    candidate = `profile-${counter}`;
  }

  return candidate;
}

export function useRoutingProfilesEditor(props: RoutingProfilesEditorProps) {
  const items = normalizeProfilesForEditor(props.profiles, props.gateways);
  const presets = getQuickSetupPresets(props.gateways);
  const profileBuilderGateways = supportedProfileBuilderGateways(props.gateways);
  const profileBuilderUnavailableReason = profileBuilderGatewayUnavailableReason(props.gateways);
  const gatewaysRef = useRef(props.gateways);
  const onSaveRef = useRef(props.onSave);
  const mountedRef = useRef(true);
  const profileBuilderPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);
  const [renameProfileId, setRenameProfileId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [lastTouchedProfileId, setLastTouchedProfileId] = useState<string | null>(null);
  const [lastTouchedField, setLastTouchedField] = useState<"routingInstructions" | "profile" | "model" | null>(null);
  const [autosaveSnapshot, setAutosaveSnapshot] = useState<ProfilesAutosaveSnapshot>(DEFAULT_AUTOSAVE_SNAPSHOT);
  const [panelStatusMessage, setPanelStatusMessage] = useState<string | null>(null);
  const [quickSetup, setQuickSetup] = useState<QuickSetupState>(() => createQuickSetupState(presets));
  const [createProfileChoice, setCreateProfileChoice] = useState<CreateProfileChoiceState>(createProfileChoiceState);
  const [createProfile, setCreateProfile] = useState<CreateProfileState>(createProfileState);
  const [agentCreate, setAgentCreate] = useState<AgentCreateState>(() => createAgentCreateState(props.gateways, items));
  const [modelEditor, setModelEditor] = useState<ModelEditorState>(() => createModelEditorState(props.gateways));
  const [customModel, setCustomModel] = useState<CustomModelState>(() => createCustomModelState(props.gateways));
  const [advancedEditor, setAdvancedEditor] = useState<AdvancedEditorState>(createAdvancedEditorState);
  const [presetRefresh, setPresetRefresh] = useState<PresetRefreshState>(createPresetRefreshState);
  const autosaveQueueRef = useRef(
    createAutosaveQueue<RouterProfile[]>({
      debounceMs: 900,
      validate: (profiles) => validateProfilesDraft(profiles, gatewaysRef.current),
      save: (profiles) => onSaveRef.current(profiles),
      onSnapshot: (snapshot) => {
        if (mountedRef.current) {
          setAutosaveSnapshot(snapshot);
        }
      },
    }),
  );

  gatewaysRef.current = props.gateways;
  onSaveRef.current = props.onSave;

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (profileBuilderPollRef.current) {
        clearTimeout(profileBuilderPollRef.current);
        profileBuilderPollRef.current = null;
      }
      void autosaveQueueRef.current.dispose({ flushPending: true });
    };
  }, []);

  useEffect(() => {
    if (expandedProfileId && !items.some((profile) => profile.id === expandedProfileId)) {
      setExpandedProfileId(null);
    }
  }, [expandedProfileId, items]);

  useEffect(() => {
    setQuickSetup((current) => {
      if (presets.some((preset) => preset.id === current.selectedPresetId)) {
        return current;
      }

      const next = createQuickSetupState(presets);
      return {
        ...next,
        open: current.open && presets.length > 0,
      };
    });
  }, [presets]);

  useEffect(() => {
    if (!presetRefresh.open) {
      return;
    }

    const profile = presetRefresh.profileId
      ? items.find((entry) => entry.id === presetRefresh.profileId)
      : undefined;
    const preset = profile
      ? findMatchingPresetForProfile(profile, presets)
      : undefined;

    if (!profile || !preset || preset.id !== presetRefresh.presetId) {
      setPresetRefresh(createPresetRefreshState());
    }
  }, [items, presetRefresh, presets]);

  useEffect(() => {
    setAgentCreate((current) => {
      const preferredGatewayId = current.request.preferredGatewayId;
      const hasPreferredGateway = preferredGatewayId
        ? profileBuilderGateways.some((gateway) => gateway.id === preferredGatewayId)
        : false;
      const nextPreferredGatewayId = hasPreferredGateway ? preferredGatewayId : profileBuilderGateways[0]?.id;
      const nextProfileId = current.run ? current.request.profileId : nextGeneratedProfileId(items);

      if (
        current.request.preferredGatewayId === nextPreferredGatewayId
        && current.request.profileId === nextProfileId
      ) {
        return current;
      }

      return {
        ...current,
        request: {
          ...current.request,
          profileId: nextProfileId,
          preferredGatewayId: nextPreferredGatewayId,
        },
      };
    });
  }, [items, profileBuilderGateways]);

  function commitProfiles(nextProfiles: RouterProfile[], args?: {
    autosaveDebounceMs?: number;
    expandProfileId?: string | null;
    touchedField?: "routingInstructions" | "profile" | "model";
    touchedProfileId?: string | null;
  }) {
    setPanelStatusMessage(null);
    const normalized = normalizeProfilesForEditor(nextProfiles, props.gateways);
    if (typeof args?.expandProfileId !== "undefined") {
      setExpandedProfileId(args.expandProfileId);
    }
    if (typeof args?.touchedProfileId !== "undefined") {
      setLastTouchedProfileId(args.touchedProfileId);
    }
    if (typeof args?.touchedField !== "undefined") {
      setLastTouchedField(args.touchedField);
    }

    props.onChange(normalized);
    autosaveQueueRef.current.update(normalized, {
      debounceMs: args?.autosaveDebounceMs,
    });
  }

  function updateProfile(profileId: string, mutate: (profile: RouterProfile) => RouterProfile, args?: {
    autosaveDebounceMs?: number;
    touchedField?: "routingInstructions" | "profile" | "model";
  }) {
    const nextProfiles = items.map((profile) => {
      if (profile.id !== profileId) {
        return profile;
      }

      return sanitizeProfileSelections(mutate(profile), props.gateways);
    });
    commitProfiles(nextProfiles, {
      autosaveDebounceMs: args?.autosaveDebounceMs,
      expandProfileId: profileId,
      touchedField: args?.touchedField ?? "profile",
      touchedProfileId: profileId,
    });
  }

  function removeProfile(profileId: string) {
    commitProfiles(
      items.filter((profile) => profile.id !== profileId),
      {
        expandProfileId: expandedProfileId === profileId ? null : expandedProfileId,
        touchedField: "profile",
        touchedProfileId: null,
      },
    );
  }

  function toggleProfile(profileId: string) {
    setExpandedProfileId((current) => current === profileId ? null : profileId);
  }

  function openQuickSetup() {
    const preset = presets[0];
    if (!preset) {
      return;
    }

    setQuickSetup({
      open: true,
      selectedPresetId: preset.id,
      profileId: normalizeProfileIdInput(preset.id),
      displayName: preset.name,
      error: null,
    });
  }

  function closeQuickSetup() {
    setQuickSetup((current) => ({ ...current, open: false, error: null }));
  }

  function updateQuickSetupPreset(selectedPresetId: string) {
    const preset = presets.find((entry) => entry.id === selectedPresetId);
    setQuickSetup((current) => ({
      ...current,
      selectedPresetId,
      profileId: normalizeProfileIdInput(preset?.id ?? current.profileId),
      displayName: preset?.name ?? current.displayName,
      error: null,
    }));
  }

  function updateQuickSetupProfileId(value: string) {
    setQuickSetup((current) => ({
      ...current,
      profileId: normalizeProfileIdInput(value),
      error: null,
    }));
  }

  function createProfileFromQuickSetup() {
    const preset = presets.find((entry) => entry.id === quickSetup.selectedPresetId);
    if (!preset) {
      setQuickSetup((current) => ({ ...current, error: "Select a template first." }));
      return;
    }

    const profileId = normalizeProfileIdInput(quickSetup.profileId);
    const displayName = quickSetup.displayName.trim();
    const existingIds = new Set(items.map((profile) => profile.id));

    const profileIdError = getProfileIdValidationError(profileId);
    if (profileIdError) {
      setQuickSetup((current) => ({ ...current, profileId, error: profileIdError }));
      return;
    }
    if (existingIds.has(profileId)) {
      setQuickSetup((current) => ({ ...current, error: `Profile ID "${profileId}" already exists.` }));
      return;
    }
    if (!displayName) {
      setQuickSetup((current) => ({ ...current, error: "Display name is required." }));
      return;
    }

    const nextProfile = {
      ...createProfileFromPreset(preset, props.gateways),
      id: profileId,
      name: displayName,
    };

    closeQuickSetup();
    commitProfiles([...items, nextProfile], {
      expandProfileId: nextProfile.id,
      touchedField: "profile",
      touchedProfileId: nextProfile.id,
    });
  }

  function clearProfileBuilderPoll() {
    if (profileBuilderPollRef.current) {
      clearTimeout(profileBuilderPollRef.current);
      profileBuilderPollRef.current = null;
    }
  }

  function openCreateProfileChoice() {
    setCreateProfileChoice({ open: true });
  }

  function closeCreateProfileChoice() {
    setCreateProfileChoice({ open: false });
  }

  function openCreateProfile() {
    closeCreateProfileChoice();
    setCreateProfile({
      open: true,
      profileId: nextGeneratedProfileId(items),
      displayName: "",
      error: null,
    });
  }

  function closeCreateProfile() {
    setCreateProfile((current) => ({ ...current, open: false, error: null }));
  }

  function openAgentCreate() {
    closeCreateProfileChoice();
    clearProfileBuilderPoll();
    const initial = createAgentCreateState(props.gateways, items);
    setAgentCreate({
      ...initial,
      open: true,
    });
  }

  function closeAgentCreate() {
    clearProfileBuilderPoll();
    setAgentCreate((current) => ({
      ...current,
      open: false,
      submitting: false,
      applying: false,
      error: null,
      run: null,
      editedProfileId: "",
      editedDisplayName: "",
      editedDescription: "",
      editedRoutingInstructions: "",
    }));
  }

  function updateAgentRequest<K extends keyof ProfileBuilderRequest>(key: K, value: ProfileBuilderRequest[K]) {
    setAgentCreate((current) => ({
      ...current,
      error: null,
      request: {
        ...current.request,
        [key]: value,
      },
    }));
  }

  function toggleAgentTaskFamily(taskFamily: ProfileBuilderTaskFamily) {
    setAgentCreate((current) => {
      const selected = new Set(current.request.taskFamilies);
      if (selected.has(taskFamily)) {
        selected.delete(taskFamily);
      } else {
        selected.add(taskFamily);
      }

      return {
        ...current,
        error: null,
        request: {
          ...current.request,
          taskFamilies: selected.size > 0 ? [...selected] : [taskFamily],
        },
      };
    });
  }

  async function pollAgentRun(runId: string) {
    try {
      const response = await fetch(`/api/v1/user/profile-builder/runs/${runId}`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({ error: "Failed to load the builder run." })) as {
        error?: string;
        run?: ProfileBuilderRun;
      };

      if (!response.ok || !payload.run) {
        setAgentCreate((current) => ({
          ...current,
          submitting: false,
          applying: false,
          error: payload.error ?? "Failed to load the builder run.",
        }));
        clearProfileBuilderPoll();
        return;
      }

      setAgentCreate((current) => ({
        ...current,
        submitting: payload.run?.status === "running",
        run: payload.run ?? current.run,
        error: payload.run?.status === "error" ? payload.run.error ?? "Profile builder failed." : null,
        editedProfileId: payload.run?.status === "completed" ? payload.run.draftProfile?.id ?? current.editedProfileId : current.editedProfileId,
        editedDisplayName: payload.run?.status === "completed" ? payload.run.draftProfile?.name ?? current.editedDisplayName : current.editedDisplayName,
        editedDescription: payload.run?.status === "completed" ? payload.run.draftProfile?.description ?? "" : current.editedDescription,
        editedRoutingInstructions: payload.run?.status === "completed" ? payload.run.draftProfile?.routingInstructions ?? "" : current.editedRoutingInstructions,
      }));

      if (payload.run.status === "running") {
        clearProfileBuilderPoll();
        profileBuilderPollRef.current = setTimeout(() => {
          void pollAgentRun(runId);
        }, 1500);
      } else {
        clearProfileBuilderPoll();
      }
    } catch {
      setAgentCreate((current) => ({
        ...current,
        submitting: false,
        error: "Failed to poll the profile builder run.",
      }));
      clearProfileBuilderPoll();
    }
  }

  async function createProfileWithAgent() {
    const profileId = normalizeProfileIdInput(agentCreate.request.profileId);
    const displayName = agentCreate.request.displayName.trim();
    const profileIdError = getProfileIdValidationError(profileId);
    if (profileIdError) {
      setAgentCreate((current) => ({
        ...current,
        error: profileIdError,
        request: {
          ...current.request,
          profileId,
        },
      }));
      return;
    }
    if (!displayName) {
      setAgentCreate((current) => ({
        ...current,
        error: "Display name is required.",
      }));
      return;
    }
    if (agentCreate.request.taskFamilies.length === 0) {
      setAgentCreate((current) => ({
        ...current,
        error: "Select at least one task family.",
      }));
      return;
    }

    setAgentCreate((current) => ({
      ...current,
      submitting: true,
      error: null,
      run: null,
      request: {
        ...current.request,
        profileId,
        displayName,
      },
    }));

    try {
      const response = await fetch("/api/v1/user/profile-builder/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...agentCreate.request,
          profileId,
          displayName,
        }),
      });
      const payload = await response.json().catch(() => ({ error: "Failed to start the profile builder." })) as {
        error?: string;
        run?: ProfileBuilderRun;
      };
      if (!response.ok || !payload.run) {
        setAgentCreate((current) => ({
          ...current,
          submitting: false,
          error: payload.error ?? "Failed to start the profile builder.",
        }));
        return;
      }

      setAgentCreate((current) => ({
        ...current,
        run: payload.run ?? null,
        submitting: payload.run?.status === "running",
        error: null,
      }));

      if (payload.run.status === "running") {
        clearProfileBuilderPoll();
        profileBuilderPollRef.current = setTimeout(() => {
          void pollAgentRun(payload.run!.id);
        }, 1200);
      } else {
        await pollAgentRun(payload.run.id);
      }
    } catch {
      setAgentCreate((current) => ({
        ...current,
        submitting: false,
        error: "Failed to start the profile builder.",
      }));
    }
  }

  async function applyAgentDraft() {
    if (!agentCreate.run?.id) {
      return;
    }

    const profileId = normalizeProfileIdInput(agentCreate.editedProfileId);
    const profileIdError = getProfileIdValidationError(profileId);
    if (profileIdError) {
      setAgentCreate((current) => ({
        ...current,
        error: profileIdError,
        editedProfileId: profileId,
      }));
      return;
    }
    if (!agentCreate.editedDisplayName.trim()) {
      setAgentCreate((current) => ({
        ...current,
        error: "Display name is required.",
      }));
      return;
    }

    setAgentCreate((current) => ({
      ...current,
      applying: true,
      error: null,
    }));

    try {
      const response = await fetch(`/api/v1/user/profile-builder/runs/${agentCreate.run.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          displayName: agentCreate.editedDisplayName.trim(),
          description: agentCreate.editedDescription.trim() || undefined,
          routingInstructions: agentCreate.editedRoutingInstructions.trim() || undefined,
        }),
      });
      const payload = await response.json().catch(() => ({ error: "Failed to apply the draft." })) as {
        error?: string;
        profile?: RouterProfile;
      };
      if (!response.ok || !payload.profile) {
        setAgentCreate((current) => ({
          ...current,
          applying: false,
          error: payload.error ?? "Failed to apply the draft.",
        }));
        return;
      }

      if (props.onProfileBuilderApplied) {
        await props.onProfileBuilderApplied();
      } else {
        props.onChange(normalizeProfilesForEditor([...items, payload.profile], props.gateways));
      }
      closeAgentCreate();
    } catch {
      setAgentCreate((current) => ({
        ...current,
        applying: false,
        error: "Failed to apply the draft.",
      }));
    }
  }

  function updateCreateProfileId(value: string) {
    setCreateProfile((current) => ({
      ...current,
      profileId: normalizeProfileIdInput(value),
      error: null,
    }));
  }

  function createEmptyProfile() {
    const profileId = normalizeProfileIdInput(createProfile.profileId);
    const displayName = createProfile.displayName.trim();
    const existingIds = new Set(items.map((profile) => profile.id));

    const profileIdError = getProfileIdValidationError(profileId);
    if (profileIdError) {
      setCreateProfile((current) => ({ ...current, profileId, error: profileIdError }));
      return;
    }
    if (existingIds.has(profileId)) {
      setCreateProfile((current) => ({ ...current, error: `Profile ID "${profileId}" already exists.` }));
      return;
    }
    if (!displayName) {
      setCreateProfile((current) => ({ ...current, error: "Display name is required." }));
      return;
    }

    const nextProfile = createBlankProfile({
      id: profileId,
      name: displayName,
    });

    closeCreateProfile();
    commitProfiles([...items, nextProfile], {
      expandProfileId: nextProfile.id,
      touchedField: "profile",
      touchedProfileId: nextProfile.id,
    });
  }

  function beginRename(profileId: string, currentName: string) {
    setRenameProfileId(profileId);
    setRenameDraft(currentName);
  }

  function cancelRename() {
    setRenameProfileId(null);
    setRenameDraft("");
  }

  function commitRename(profileId: string) {
    const nextName = renameDraft.trim();
    const currentProfile = items.find((profile) => profile.id === profileId);
    cancelRename();

    if (!currentProfile || !nextName || nextName === currentProfile.name) {
      return;
    }

    updateProfile(profileId, (profile) => ({ ...profile, name: nextName }), { touchedField: "profile" });
  }

  function openModelEditor(profileId: string, rowIndex: number | null) {
    const profile = items.find((entry) => entry.id === profileId);
    const model = rowIndex === null ? undefined : profile?.models?.[rowIndex];
    setModelEditor({
      open: true,
      profileId,
      rowIndex,
      error: null,
      draft: createEditorDraftFromModel(props.gateways, model),
    });
  }

  function closeModelEditor() {
    setModelEditor(createModelEditorState(props.gateways));
  }

  function saveModelEditor() {
    if (!modelEditor.profileId) {
      return;
    }

    const draft = modelEditor.draft;
    if (!draft.gatewayId) {
      setModelEditor((current) => ({ ...current, error: "Select a gateway." }));
      return;
    }
    if (!draft.modelId.trim()) {
      setModelEditor((current) => ({ ...current, error: "Select a gateway model." }));
      return;
    }

    const nextModel = buildModelFromDraft(props.gateways, draft);
    updateProfile(modelEditor.profileId, (profile) => {
      const nextModels = [...(profile.models ?? [])];
      if (modelEditor.rowIndex === null) {
        nextModels.push(nextModel);
      } else {
        nextModels[modelEditor.rowIndex] = nextModel;
      }

      return {
        ...profile,
        models: nextModels,
      };
    }, { touchedField: "model" });
    closeModelEditor();
  }

  function removeModel(profileId: string, rowIndex: number) {
    updateProfile(profileId, (profile) => {
      const nextModels = [...(profile.models ?? [])];
      nextModels.splice(rowIndex, 1);
      return {
        ...profile,
        models: nextModels,
      };
    }, { touchedField: "model" });
  }

  function openCustomModel(profileId: string) {
    setCustomModel({
      open: true,
      profileId,
      error: null,
      saving: false,
      draft: createCustomModelDraft(props.gateways),
    });
  }

  function closeCustomModel() {
    setCustomModel(createCustomModelState(props.gateways));
  }

  function openAdvancedEditor(profileId: string) {
    const profile = items.find((entry) => entry.id === profileId);
    if (!profile) {
      return;
    }

    setAdvancedEditor({
      open: true,
      profileId,
      draft: `${JSON.stringify(profile, null, 2)}\n`,
      error: null,
    });
  }

  function closeAdvancedEditor() {
    setAdvancedEditor(createAdvancedEditorState());
  }

  async function importProfileFile(file: Pick<File, "name" | "text">) {
    let importedProfile: RouterProfile;
    try {
      importedProfile = parseImportedProfileJson(await file.text(), props.gateways);
    } catch (error) {
      setPanelStatusMessage((error as Error).message || "Failed to import the profile JSON file.");
      return;
    }

    const nextProfiles = [...items, importedProfile];
    const validationError = validateProfilesDraft(nextProfiles, props.gateways);
    if (validationError) {
      setPanelStatusMessage(validationError);
      return;
    }

    commitProfiles(nextProfiles, {
      expandProfileId: importedProfile.id,
      touchedField: "profile",
      touchedProfileId: importedProfile.id,
    });
    setPanelStatusMessage(`Imported "${importedProfile.name || importedProfile.id}" from ${file.name}.`);
  }

  function exportProfileJson(profileId: string) {
    const profile = items.find((entry) => entry.id === profileId);
    if (!profile) {
      setPanelStatusMessage("That profile could not be found.");
      return;
    }

    try {
      const blob = new Blob([serializeProfileForJson(profile)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${profile.id}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setPanelStatusMessage(`Downloaded ${profile.id}.json.`);
    } catch {
      setPanelStatusMessage(`Failed to export "${profile.id}" as JSON.`);
    }
  }

  function getMatchingPreset(profileId: string): RoutingPreset | undefined {
    const profile = items.find((entry) => entry.id === profileId);
    if (!profile) {
      return undefined;
    }

    return findMatchingPresetForProfile(profile, presets);
  }

  function openPresetRefresh(profileId: string) {
    const preset = getMatchingPreset(profileId);
    if (!preset) {
      return;
    }

    setPresetRefresh({
      open: true,
      profileId,
      presetId: preset.id,
    });
  }

  function closePresetRefresh() {
    setPresetRefresh(createPresetRefreshState());
  }

  function confirmPresetRefresh() {
    if (!presetRefresh.profileId || !presetRefresh.presetId) {
      return;
    }

    const profile = items.find((entry) => entry.id === presetRefresh.profileId);
    const preset = presets.find((entry) => entry.id === presetRefresh.presetId);
    if (!profile || !preset) {
      closePresetRefresh();
      return;
    }

    const nextProfiles = items.map((entry) => (
      entry.id === profile.id ? refreshProfileFromPreset(profile, preset, props.gateways) : entry
    ));

    closePresetRefresh();
    commitProfiles(nextProfiles, {
      expandProfileId: profile.id,
      touchedField: "profile",
      touchedProfileId: profile.id,
    });
  }

  function saveAdvancedEditor() {
    if (!advancedEditor.profileId) {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(advancedEditor.draft);
    } catch (error) {
      setAdvancedEditor((current) => ({
        ...current,
        error: `Invalid JSON: ${(error as Error).message}`,
      }));
      return;
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      setAdvancedEditor((current) => ({
        ...current,
        error: "Profile JSON must be a single object.",
      }));
      return;
    }

    const nextProfile = sanitizeProfileSelections(normalizeProfile(parsed as RouterProfile), props.gateways);
    const nextProfiles = items.map((profile) => (
      profile.id === advancedEditor.profileId ? nextProfile : profile
    ));
    const validationError = validateProfilesDraft(nextProfiles, props.gateways);
    if (validationError) {
      setAdvancedEditor((current) => ({
        ...current,
        error: validationError,
      }));
      return;
    }

    closeAdvancedEditor();
    commitProfiles(nextProfiles, {
      expandProfileId: nextProfile.id,
      touchedField: "profile",
      touchedProfileId: nextProfile.id,
    });
  }

  async function saveCustomModel() {
    if (!customModel.profileId) {
      return;
    }
    if (!props.onCreateGatewayModel) {
      setCustomModel((current) => ({ ...current, error: "Custom model creation is unavailable in this environment." }));
      return;
    }
    if (!customModel.draft.gatewayId) {
      setCustomModel((current) => ({ ...current, error: "Select a gateway." }));
      return;
    }
    if (!customModel.draft.modelId.trim()) {
      setCustomModel((current) => ({ ...current, error: "Model ID is required." }));
      return;
    }

    setCustomModel((current) => ({ ...current, saving: true, error: null }));
    try {
      const createdModel = await props.onCreateGatewayModel(customModel.draft.gatewayId, {
        id: customModel.draft.modelId.trim(),
        name: customModel.draft.name.trim() || customModel.draft.modelId.trim(),
        modality: customModel.draft.modality.trim() || undefined,
        reasoningPreset: customModel.draft.reasoningPreset,
        thinking: customModel.draft.reasoningPreset,
        whenToUse: customModel.draft.whenToUse.trim() || undefined,
        description: customModel.draft.description.trim() || undefined,
      });

      if (!createdModel) {
        setCustomModel((current) => ({
          ...current,
          saving: false,
          error: "Failed to create the gateway model.",
        }));
        return;
      }

      updateProfile(customModel.profileId, (profile) => ({
        ...profile,
        models: [
          ...(profile.models ?? []),
          {
            gatewayId: customModel.draft.gatewayId,
            modelId: createdModel.id,
            name: createdModel.name,
            modality: createdModel.modality,
            reasoningPreset: createdModel.reasoningPreset ?? createdModel.thinking,
            thinking: createdModel.reasoningPreset ?? createdModel.thinking,
            whenToUse: createdModel.whenToUse,
            description: createdModel.description,
          },
        ],
      }), { touchedField: "model" });
      closeCustomModel();
    } finally {
      setCustomModel((current) => ({ ...current, saving: false }));
    }
  }

  function updateRoutingInstructions(profileId: string, value: string) {
    updateProfile(profileId, (profile) => ({
      ...profile,
      routingInstructions: value || undefined,
    }), {
      touchedField: "routingInstructions",
      autosaveDebounceMs: INSTRUCTION_AUTOSAVE_DEBOUNCE_MS,
    });
  }

  function updateDefaultModel(profileId: string, value: string) {
    updateProfile(profileId, (profile) => ({
      ...profile,
      defaultModel: value || undefined,
    }), { touchedField: "profile" });
  }

  function updateClassifierModel(profileId: string, value: string) {
    updateProfile(profileId, (profile) => ({
      ...profile,
      classifierModel: value || undefined,
    }), { touchedField: "profile" });
  }

  function getQuickSetupPreset(): RoutingPreset | undefined {
    return presets.find((preset) => preset.id === quickSetup.selectedPresetId);
  }

  function getInstructionStatus(profileId: string): { label: string; tone: "neutral" | "success" | "warning" | "danger" } {
    const isTarget = profileId === lastTouchedProfileId && lastTouchedField === "routingInstructions";
    if (!isTarget) {
      return { label: "Saved", tone: "neutral" };
    }

    if (autosaveSnapshot.state === "saving") {
      return { label: "Saving...", tone: "neutral" };
    }
    if (autosaveSnapshot.state === "dirty") {
      return { label: "Pending", tone: "neutral" };
    }
    if (autosaveSnapshot.state === "invalid") {
      return { label: "Fix errors to save", tone: "warning" };
    }
    if (autosaveSnapshot.state === "error") {
      return { label: "Save failed", tone: "danger" };
    }

    return { label: "Saved", tone: "success" };
  }

  return {
    agentCreate,
    autosaveSnapshot,
    applyAgentDraft,
    createEmptyProfile,
    createProfileChoice,
    createProfile,
    createProfileWithAgent,
    createProfileFromQuickSetup,
    customModel,
    advancedEditor,
    presetRefresh,
    closeAgentCreate,
    closeCreateProfile,
    closeCreateProfileChoice,
    closeAdvancedEditor,
    closeCustomModel,
    closeModelEditor,
    closePresetRefresh,
    closeQuickSetup,
    confirmPresetRefresh,
    commitRename,
    expandedProfileId,
    getInstructionStatus,
    getMatchingPreset,
    getQuickSetupPreset,
    items,
    lastTouchedField,
    lastTouchedProfileId,
    modelEditor,
    openAgentCreate,
    openCreateProfileChoice,
    openCreateProfile,
    openAdvancedEditor,
    openCustomModel,
    exportProfileJson,
    importProfileFile,
    openModelEditor,
    openPresetRefresh,
    openQuickSetup,
    panelMessage: autosaveSnapshot.state === "error" || autosaveSnapshot.state === "invalid"
      ? autosaveSnapshot.message
      : panelStatusMessage,
    presets,
    profileBuilderGateways,
    profileBuilderUnavailableReason,
    quickSetup,
    removeModel,
    removeProfile,
    renameDraft,
    renameProfileId,
    saveAdvancedEditor,
    saveCustomModel,
    saveModelEditor,
    setAdvancedEditor,
    setAgentCreate,
    setCreateProfile,
    setCreateProfileChoice,
    setCustomModel,
    setExpandedProfileId,
    setModelEditor,
    setQuickSetup,
    setRenameDraft,
    setRenameProfileId,
    toggleProfile,
    toggleAgentTaskFamily,
    updateClassifierModel,
    updateCreateProfileId,
    updateDefaultModel,
    updateAgentRequest,
    updateQuickSetupPreset,
    updateQuickSetupProfileId,
    updateRoutingInstructions,
    beginRename,
    cancelRename,
    flushAutosave: () => autosaveQueueRef.current.flush(),
    formatGatewayModelOptionLabel,
    getGatewayModel,
  };
}
