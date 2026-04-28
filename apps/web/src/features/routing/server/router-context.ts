import type { CatalogItem, RouterConfig, RouterProfile } from "@custom-router/core";

import { parseProfileModelKey, profileModelToCatalogItem } from "@/src/lib/routing/profile-config";
import { ROUTING_PRESETS } from "@/src/lib/routing-presets";
import { getRouterRepository, type RouterRepository } from "@/src/lib/storage/repository";

import { findMatchedProfile, isRoutedRequestModel } from "./router-decision";
import { resolveGatewayCapabilityForBaseUrl } from "./gateway-capabilities";
import type { RoutedRequestBody, UserRouterConfig } from "./router-service-types";

export interface ResolvedRoutingContext {
  repository: RouterRepository;
  runtimeConfig: RouterConfig;
  catalog: CatalogItem[];
  requestedModel: string;
  matchedProfile?: RouterProfile;
  routedRequest: boolean;
}

function getPresetModelForProfileModel(profileId: string, modelId: string) {
  const preset = ROUTING_PRESETS.find((candidate) => candidate.id === profileId);
  if (!preset) {
    return undefined;
  }

  const shortModelId = modelId.includes("/") ? modelId.slice(modelId.lastIndexOf("/") + 1) : modelId;
  return preset.models.find((model) => model.id === modelId || model.id === shortModelId || modelId.endsWith(`/${model.id}`));
}

export async function resolveUserRoutingContext(args: {
  body: RoutedRequestBody;
  userConfig?: UserRouterConfig;
}): Promise<ResolvedRoutingContext> {
  const repository = getRouterRepository();
  const [systemConfig, systemCatalog] = await Promise.all([
    repository.getConfig(),
    repository.getCatalog(),
  ]);

  const runtimeConfig: RouterConfig = { ...systemConfig };
  if (args.userConfig) {
    if (args.userConfig.routeTriggerKeywords) runtimeConfig.routeTriggerKeywords = args.userConfig.routeTriggerKeywords;
    if (args.userConfig.routingFrequency) {
      runtimeConfig.routingFrequency = args.userConfig.routingFrequency as RouterConfig["routingFrequency"];
    }
  }

  const gatewayCapabilityById = new Map(
    (args.userConfig?.gatewayRows ?? []).map((gateway) => [
      gateway.id,
      resolveGatewayCapabilityForBaseUrl(gateway.baseUrl),
    ] as const),
  );
  const gatewayInventoryItems: CatalogItem[] = (args.userConfig?.gatewayRows ?? []).flatMap((gateway) => {
    const capability = gatewayCapabilityById.get(gateway.id);
    return gateway.models.map((model) => ({
      ...model,
      upstreamModelId: capability?.supportsFamilyIdentity ? model.upstreamModelId : undefined,
      gatewayId: gateway.id,
    }));
  });

  const requestedModel = typeof args.body.model === "string" ? args.body.model : "";
  const matchedProfile = findMatchedProfile(requestedModel, args.userConfig?.profiles);
  const routedRequest = isRoutedRequestModel(requestedModel, args.userConfig?.profiles);
  const activeProfile = routedRequest ? matchedProfile : undefined;

  const profileInventory = (activeProfile?.models ?? [])
    .map((model) => {
      const item = profileModelToCatalogItem(model);
      if (!item || !activeProfile) {
        return item;
      }

      const presetModel = getPresetModelForProfileModel(activeProfile.id, item.id);
      if (!presetModel) {
        return item;
      }

      return {
        ...item,
        name: item.name ?? presetModel.name,
        modality: item.modality ?? presetModel.modality,
        reasoningPreset: item.reasoningPreset ?? presetModel.reasoningPreset ?? presetModel.thinking,
        thinking: item.thinking ?? presetModel.reasoningPreset ?? presetModel.thinking,
        whenToUse: item.whenToUse ?? presetModel.whenToUse,
        description: item.description ?? presetModel.description,
      };
    })
    .filter((item): item is CatalogItem => Boolean(item))
    .map((item) => {
      const capability = item.gatewayId ? gatewayCapabilityById.get(item.gatewayId) : undefined;
      return {
        ...item,
        upstreamModelId: capability?.supportsFamilyIdentity ? item.upstreamModelId : undefined,
      };
    });
  const resolvedCatalog =
    routedRequest
      ? profileInventory
      : gatewayInventoryItems.length > 0
        ? gatewayInventoryItems
        : args.userConfig?.customCatalog && args.userConfig.customCatalog.length > 0
          ? args.userConfig.customCatalog
          : systemCatalog;

  if (activeProfile) {
    const selectedProfileModels = new Map(
      (activeProfile.models ?? [])
        .filter((model) => model.gatewayId && model.modelId)
        .map((model) => [`${model.gatewayId}::${model.modelId}`, model] as const),
    );
    const gatewayModels = new Map(
      gatewayInventoryItems
        .filter((model) => model.gatewayId)
        .map((model) => [`${model.gatewayId}::${model.id}`, model] as const),
    );

    const defaultBinding = parseProfileModelKey(activeProfile.defaultModel);
    const classifierBinding = parseProfileModelKey(activeProfile.classifierModel);
    const defaultProfileModel = defaultBinding
      ? selectedProfileModels.get(`${defaultBinding.gatewayId}::${defaultBinding.modelId}`)
      : undefined;
    const classifierGatewayModel = classifierBinding
      ? gatewayModels.get(`${classifierBinding.gatewayId}::${classifierBinding.modelId}`)
      : undefined;

    runtimeConfig.defaultModel = defaultProfileModel?.modelId;
    runtimeConfig.classifierModel = classifierGatewayModel?.id;
    runtimeConfig.routingInstructions = activeProfile.routingInstructions;
  } else if (routedRequest) {
    runtimeConfig.defaultModel = undefined;
    runtimeConfig.classifierModel = undefined;
    runtimeConfig.routingInstructions = undefined;
  }

  return {
    repository,
    runtimeConfig,
    catalog: resolvedCatalog,
    requestedModel,
    matchedProfile,
    routedRequest,
  };
}
