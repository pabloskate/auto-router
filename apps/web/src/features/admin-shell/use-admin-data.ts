"use client";

import { useEffect, useState } from "react";

import type { RegistrationMode } from "@/src/lib/constants";
import { hydrateUser, type ServerUserInfo, type UserInfo } from "@/src/features/account-settings/contracts";
import type { GatewayInfo } from "@/src/features/gateways/contracts";
import type { ApiKeyInfo, RoutingDraftState } from "@/src/components/admin/types";

export function useAdminData() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [status, setStatus] = useState("Loading...");
  const [error, setError] = useState<string | undefined>();
  const [gateways, setGateways] = useState<GatewayInfo[]>([]);
  const [reroutingDraftState, setReroutingDraftState] = useState<RoutingDraftState>("pristine");
  const [profilesDraftState, setProfilesDraftState] = useState<RoutingDraftState>("pristine");
  const [registrationMode, setRegistrationMode] = useState<RegistrationMode>("closed");

  async function loadData() {
    setStatus("Loading...");
    setError(undefined);

    const [userRes, keysRes, gatewaysRes, registrationRes] = await Promise.all([
      fetch("/api/v1/user/me", { cache: "no-store" }),
      fetch("/api/v1/user/keys", { cache: "no-store" }),
      fetch("/api/v1/user/gateways", { cache: "no-store" }),
      fetch("/api/v1/auth/registration-status", { cache: "no-store" }),
    ]);

    if (!userRes.ok) {
      setIsAuthenticated(false);
      setUser(null);
      setKeys([]);
      setGateways([]);
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

    if (gatewaysRes.ok) {
      const gatewaysData = await gatewaysRes.json() as { gateways?: GatewayInfo[] };
      setGateways(gatewaysData.gateways ?? []);
    } else {
      setGateways([]);
    }

    if (registrationRes.ok) {
      const registrationData = await registrationRes.json() as { mode: RegistrationMode };
      setRegistrationMode(registrationData.mode);
    } else {
      setRegistrationMode("closed");
    }

    setUser(hydrateUser(userData.user));
    setKeys(keysData.keys);
    setIsAuthenticated(true);
    setReroutingDraftState("pristine");
    setProfilesDraftState("pristine");
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
    setGateways([]);
    setReroutingDraftState("pristine");
    setProfilesDraftState("pristine");
    setStatus("Logged out");
  }

  function markReroutingDirty() {
    setReroutingDraftState((current) => (current === "dirty" ? current : "dirty"));
  }

  function markProfilesDirty() {
    setProfilesDraftState((current) => (current === "dirty" ? current : "dirty"));
  }

  async function saveUserData(updates: Partial<UserInfo>) {
    if (!user) {
      return false;
    }

    setStatus("Saving...");
    setError(undefined);

    const updatedUser = { ...user, ...updates };
    const payload: Record<string, unknown> = {
      preferred_models: updatedUser.preferredModels,
      custom_catalog: updatedUser.customCatalog,
      profiles: updatedUser.profiles,
      route_trigger_keywords: updatedUser.routeTriggerKeywords,
      routing_frequency: updatedUser.routingFrequency,
    };

    const response = await fetch("/api/v1/user/me", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      await loadData();
      setStatus("Saved successfully");
      return true;
    }

    const responsePayload = await response.json().catch(() => ({ error: "Failed to save changes" })) as { error?: string };
    setError(responsePayload.error ?? "Failed to save changes");
    setStatus("Error");
    return false;
  }

  async function saveReroutingData(updates: Partial<UserInfo>) {
    setReroutingDraftState("saving");
    const saved = await saveUserData(updates);
    setReroutingDraftState(saved ? "saved" : "dirty");
    return saved;
  }

  async function saveProfilesData(updates: Partial<UserInfo>) {
    setProfilesDraftState("saving");
    const saved = await saveUserData(updates);
    setProfilesDraftState(saved ? "saved" : "dirty");
    return saved;
  }

  return {
    isAuthenticated,
    user,
    setUser,
    keys,
    status,
    setStatus,
    error,
    setError,
    gateways,
    reroutingDraftState,
    profilesDraftState,
    markReroutingDirty,
    markProfilesDirty,
    registrationMode,
    loadData,
    handleLogout,
    saveUserData,
    saveReroutingData,
    saveProfilesData,
  };
}
