import type { RouterProfile } from "@custom-router/core";

export const AUTO_PROFILE_ID = "auto";
export const AUTO_PROFILE_NAME = "Auto";

function sanitizeOptionalString(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function ensureAutoProfile(profiles: RouterProfile[] | null | undefined): RouterProfile[] {
  const items = profiles ? [...profiles] : [];
  const autoIndex = items.findIndex((profile) => profile.id === AUTO_PROFILE_ID);

  if (autoIndex === -1) {
    items.unshift({ id: AUTO_PROFILE_ID, name: AUTO_PROFILE_NAME });
    return items;
  }

  const autoProfile = items[autoIndex] as RouterProfile;
  items[autoIndex] = {
    ...autoProfile,
    id: AUTO_PROFILE_ID,
    name: sanitizeOptionalString(autoProfile.name) ?? AUTO_PROFILE_NAME,
  };

  return items;
}

export function mergeLegacyRoutingInstructions(args: {
  profiles: RouterProfile[] | null | undefined;
  routingInstructions: string | null | undefined;
}): RouterProfile[] | null {
  const legacyInstructions = sanitizeOptionalString(args.routingInstructions);
  if (!legacyInstructions) {
    return args.profiles ?? null;
  }

  const profiles = ensureAutoProfile(args.profiles);
  return profiles.map((profile) =>
    profile.id === AUTO_PROFILE_ID && !sanitizeOptionalString(profile.routingInstructions)
      ? { ...profile, routingInstructions: legacyInstructions }
      : profile
  );
}
