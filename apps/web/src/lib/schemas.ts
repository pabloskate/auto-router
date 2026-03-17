import { z } from "zod";

import { AUTH } from "./constants";

const reasoningEffortSchema = z.enum(["provider_default", "none", "minimal", "low", "medium", "high", "xhigh"]);
const reasoningPolicyModeSchema = z.enum([
  "off",
  "adaptive",
  "fixed_provider_default",
  "fixed_none",
  "fixed_minimal",
  "fixed_low",
  "fixed_medium",
  "fixed_high",
  "fixed_xhigh",
]);
const reasoningLatencySensitivitySchema = z.enum(["low", "medium", "high"]);
const toolStepBiasSchema = z.enum(["off", "prefer_reflex", "strong_reflex"]);
const crossFamilySwitchModeSchema = z.enum(["conservative", "permissive"]);
const inFamilyShiftHysteresisSchema = z.enum(["off", "sticky"]);

const reasoningPolicySchema = z.object({
  mode: reasoningPolicyModeSchema.optional(),
  latencySensitivity: reasoningLatencySensitivitySchema.optional(),
  toolStepBias: toolStepBiasSchema.optional(),
  shortOutputThreshold: z.number().int().min(1).optional(),
  longOutputThreshold: z.number().int().min(1).optional(),
  allowDowngradeAfterPlan: z.boolean().optional(),
  preferSameFamily: z.boolean().optional(),
  crossFamilySwitchMode: crossFamilySwitchModeSchema.optional(),
  inFamilyShiftHysteresis: inFamilyShiftHysteresisSchema.optional(),
}).superRefine((policy, ctx) => {
  if (
    typeof policy.shortOutputThreshold === "number"
    && typeof policy.longOutputThreshold === "number"
    && policy.longOutputThreshold <= policy.shortOutputThreshold
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "longOutputThreshold must be greater than shortOutputThreshold.",
      path: ["longOutputThreshold"],
    });
  }
});

export const routerProfileModelSchema = z.object({
  gatewayId: z.string().optional(),
  modelId: z.string().min(1),
  upstreamModelId: z.string().min(1).optional(),
  name: z.string().max(200).optional(),
  modality: z.string().optional(),
  thinking: reasoningEffortSchema.optional(),
  reasoningPreset: reasoningEffortSchema.optional(),
  whenToUse: z.string().optional(),
  description: z.string().optional(),
});

export const routerProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  defaultModel: z.string().optional(),
  classifierModel: z.string().optional(),
  routingInstructions: z.string().optional(),
  reasoningPolicy: reasoningPolicySchema.optional(),
  models: z.array(routerProfileModelSchema).optional(),
}).superRefine((profile, ctx) => {
  const seenModelIds = new Set<string>();
  for (const [index, model] of (profile.models ?? []).entries()) {
    const normalizedId = model.modelId.trim();
    if (!normalizedId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Model ID is required.",
        path: ["models", index, "modelId"],
      });
      continue;
    }

    if (seenModelIds.has(normalizedId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate profile model "${normalizedId}" is not allowed.`,
        path: ["models", index, "modelId"],
      });
    }
    seenModelIds.add(normalizedId);
  }
});

const categoryWeightsSchema = z.object({
  quality: z.number().min(0).max(1),
  speed: z.number().min(0).max(1),
  cost: z.number().min(0).max(1)
});

const profileWeightsSchema = z.object({
  quality: z.number().min(0).max(1),
  speed: z.number().min(0).max(1),
  costEfficiency: z.number().min(0).max(1),
  reliability: z.number().min(0).max(1)
});

const categoryPolicySchema = z.object({
  allowlist: z.array(z.string()).optional(),
  fallbackPool: z.array(z.string()).optional(),
  weights: categoryWeightsSchema.optional()
});

const profilePolicySchema = z.object({
  allowlist: z.array(z.string()).optional(),
  fallbackPool: z.array(z.string()).optional(),
  weights: profileWeightsSchema.optional()
});

export const routerConfigSchema = z.object({
  version: z.string().min(1),
  defaultModel: z.string().min(1).optional(),
  classifierModel: z.string().optional(),
  globalBlocklist: z.array(z.string()),
  routingInstructions: z.string().optional(),
});

export const chatCompletionSchema = z.object({
  model: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant", "tool", "developer"]),
        content: z.unknown().optional(),
        tool_call_id: z.string().optional()
      }).passthrough()
    )
    .optional(),
  tools: z
    .array(
      z.object({
        type: z.string().optional(),
        function: z
          .object({
            name: z.string().optional(),
            description: z.string().optional()
          }).passthrough()
          .optional()
      }).passthrough()
    )
    .optional(),
  stream: z.boolean().optional()
}).passthrough();

export const responsesSchema = z.object({
  model: z.string().min(1),
  input: z.unknown().optional(),
  tools: chatCompletionSchema.shape.tools.optional(),
  previous_response_id: z.string().optional(),
  stream: z.boolean().optional()
}).passthrough();

export const completionsSchema = z.object({
  model: z.string().min(1),
  prompt: z.unknown().optional(),
  stream: z.boolean().optional()
}).passthrough();

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1),
  password: z.string().min(AUTH.PASSWORD_MIN_LENGTH),
});

const catalogItemSchema = z.object({
  id:          z.string().min(1),
  name:        z.string().min(1),
  upstreamModelId: z.string().min(1).optional(),
  whenToUse:   z.string().optional(),
  description: z.string().optional(),
  modality:    z.string().optional(),
  thinking:    reasoningEffortSchema.optional(),
  reasoningPreset: reasoningEffortSchema.optional(),
});

export const createGatewaySchema = z.object({
  name:    z.string().min(1).max(100),
  baseUrl: z.string().url(),
  apiKey:  z.string().min(1),
});

export const updateGatewaySchema = z.object({
  name:    z.string().min(1).max(100).optional(),
  baseUrl: z.string().url().optional(),
  apiKey:  z.string().min(1).optional(),
  models:  z.array(catalogItemSchema).optional(),
}).superRefine((data, ctx) => {
  if (Object.keys(data).length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one field is required.",
    });
  }

  if (Array.isArray(data.models)) {
    const seen = new Set<string>();
    for (const [index, model] of data.models.entries()) {
      if (seen.has(model.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate model id "${model.id}" is not allowed.`,
          path: ["models", index, "id"],
        });
      }
      seen.add(model.id);
    }
  }
});
