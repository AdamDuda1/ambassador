import sql from "@/lib/database/client";

export const SAFEGUARD_KEYS = {
  onboardingEnabled: "onboarding_enabled",
  shirtOrderingEnabled: "shirt_ordering_enabled",
  postersEnabled: "posters_enabled",
  referralsEnabled: "referrals_enabled",
} as const;

export type SafeguardKey = (typeof SAFEGUARD_KEYS)[keyof typeof SAFEGUARD_KEYS];

export type Safeguards = {
  onboardingEnabled: boolean;
  shirtOrderingEnabled: boolean;
  postersEnabled: boolean;
  referralsEnabled: boolean;
};

type SafeguardRow = {
  key: string;
  enabled: boolean | null;
  updated_at: string | null;
  updated_by_user_id: string | null;
};

export type SafeguardState = {
  key: SafeguardKey;
  enabled: boolean;
  updatedAt: string | null;
  updatedByUserId: string | null;
};

const DEFAULT_SAFEGUARDS: Safeguards = {
  onboardingEnabled: true,
  shirtOrderingEnabled: true,
  postersEnabled: true,
  referralsEnabled: true,
};

export function isSafeguardKey(value: unknown): value is SafeguardKey {
  return (
    value === SAFEGUARD_KEYS.onboardingEnabled ||
    value === SAFEGUARD_KEYS.shirtOrderingEnabled ||
    value === SAFEGUARD_KEYS.postersEnabled ||
    value === SAFEGUARD_KEYS.referralsEnabled
  );
}

export async function getSafeguards(): Promise<Safeguards> {
  const rows = await listSafeguardStates();

  return rows.reduce<Safeguards>((state, row) => {
    if (row.key === SAFEGUARD_KEYS.onboardingEnabled) {
      return { ...state, onboardingEnabled: row.enabled };
    }

    if (row.key === SAFEGUARD_KEYS.shirtOrderingEnabled) {
      return { ...state, shirtOrderingEnabled: row.enabled };
    }

    if (row.key === SAFEGUARD_KEYS.postersEnabled) {
      return { ...state, postersEnabled: row.enabled };
    }

    if (row.key === SAFEGUARD_KEYS.referralsEnabled) {
      return { ...state, referralsEnabled: row.enabled };
    }

    return state;
  }, DEFAULT_SAFEGUARDS);
}

export async function listSafeguardStates(): Promise<SafeguardState[]> {
  const rows = await sql<SafeguardRow[]>`
    SELECT key, enabled, updated_at, updated_by_user_id
    FROM app_safeguards
    WHERE key = ANY(${SAFEGUARD_KEY_LIST}::text[])
    ORDER BY key ASC
  `;
  const rowByKey = new Map(rows.map((row) => [row.key, row]));

  return [
    toSafeguardState(SAFEGUARD_KEYS.onboardingEnabled, rowByKey.get(SAFEGUARD_KEYS.onboardingEnabled)),
    toSafeguardState(SAFEGUARD_KEYS.shirtOrderingEnabled, rowByKey.get(SAFEGUARD_KEYS.shirtOrderingEnabled)),
    toSafeguardState(SAFEGUARD_KEYS.postersEnabled, rowByKey.get(SAFEGUARD_KEYS.postersEnabled)),
    toSafeguardState(SAFEGUARD_KEYS.referralsEnabled, rowByKey.get(SAFEGUARD_KEYS.referralsEnabled)),
  ];
}

export async function setSafeguard(input: {
  key: SafeguardKey;
  enabled: boolean;
  updatedByUserId: string | null;
}) {
  const row = (await sql<SafeguardRow[]>`
    INSERT INTO app_safeguards (key, enabled, updated_by_user_id)
    VALUES (${input.key}, ${input.enabled}, ${input.updatedByUserId})
    ON CONFLICT (key) DO UPDATE
    SET enabled = EXCLUDED.enabled,
        updated_by_user_id = EXCLUDED.updated_by_user_id,
        updated_at = NOW()
    RETURNING key, enabled, updated_at, updated_by_user_id
  `).at(0);

  return toSafeguardState(input.key, row);
}

const SAFEGUARD_KEY_LIST = [
  SAFEGUARD_KEYS.onboardingEnabled,
  SAFEGUARD_KEYS.shirtOrderingEnabled,
  SAFEGUARD_KEYS.postersEnabled,
  SAFEGUARD_KEYS.referralsEnabled,
];

function getDefaultEnabled(key: SafeguardKey) {
  if (key === SAFEGUARD_KEYS.onboardingEnabled) {
    return DEFAULT_SAFEGUARDS.onboardingEnabled;
  }

  if (key === SAFEGUARD_KEYS.shirtOrderingEnabled) {
    return DEFAULT_SAFEGUARDS.shirtOrderingEnabled;
  }

  if (key === SAFEGUARD_KEYS.postersEnabled) {
    return DEFAULT_SAFEGUARDS.postersEnabled;
  }

  return DEFAULT_SAFEGUARDS.referralsEnabled;
}

function toSafeguardState(
  key: SafeguardKey,
  row: SafeguardRow | undefined,
): SafeguardState {
  return {
    key,
    enabled: row?.enabled ?? getDefaultEnabled(key),
    updatedAt: row?.updated_at ?? null,
    updatedByUserId: row?.updated_by_user_id ?? null,
  };
}

export type UserFeatureFlagOverride = {
  userId: string;
  flagKey: SafeguardKey;
  createdAt: string;
  createdByUserId: string | null;
};

export type UserFeatureFlagOverrideWithUser = UserFeatureFlagOverride & {
  displayName: string;
  email: string | null;
  slackId: string | null;
};

type OverrideRow = {
  user_id: string;
  flag_key: string;
  created_at: string;
  created_by_user_id: string | null;
};

type OverrideRowWithUser = OverrideRow & {
  display_name: string;
  email: string | null;
  slack_id: string | null;
};

export async function getOverrideFlagsForUser(userId: string): Promise<Set<SafeguardKey>> {
  const rows = await sql<{ flag_key: string }[]>`
    SELECT flag_key
    FROM user_feature_flag_overrides
    WHERE user_id = ${userId}
  `;
  const keys = new Set<SafeguardKey>();
  for (const row of rows) {
    if (isSafeguardKey(row.flag_key)) {
      keys.add(row.flag_key);
    }
  }
  return keys;
}

export async function getEffectiveSafeguards(userId: string | null): Promise<Safeguards> {
  const safeguards = await getSafeguards();
  if (userId === null) return safeguards;

  const overrides = await getOverrideFlagsForUser(userId);
  return {
    onboardingEnabled: safeguards.onboardingEnabled || overrides.has(SAFEGUARD_KEYS.onboardingEnabled),
    shirtOrderingEnabled: safeguards.shirtOrderingEnabled || overrides.has(SAFEGUARD_KEYS.shirtOrderingEnabled),
    postersEnabled: safeguards.postersEnabled || overrides.has(SAFEGUARD_KEYS.postersEnabled),
    referralsEnabled: safeguards.referralsEnabled || overrides.has(SAFEGUARD_KEYS.referralsEnabled),
  };
}

export async function listOverridesGroupedByFlag(): Promise<
  Record<SafeguardKey, UserFeatureFlagOverrideWithUser[]>
> {
  const rows = await sql<OverrideRowWithUser[]>`
    SELECT o.user_id, o.flag_key, o.created_at, o.created_by_user_id,
           u.display_name, u.email, u.slack_id
    FROM user_feature_flag_overrides o
    JOIN users u ON u.id = o.user_id
    ORDER BY u.display_name ASC, o.created_at ASC
  `;

  const grouped: Record<SafeguardKey, UserFeatureFlagOverrideWithUser[]> = {
    [SAFEGUARD_KEYS.onboardingEnabled]: [],
    [SAFEGUARD_KEYS.shirtOrderingEnabled]: [],
    [SAFEGUARD_KEYS.postersEnabled]: [],
    [SAFEGUARD_KEYS.referralsEnabled]: [],
  };

  for (const row of rows) {
    if (!isSafeguardKey(row.flag_key)) continue;
    grouped[row.flag_key].push({
      userId: row.user_id,
      flagKey: row.flag_key,
      createdAt: row.created_at,
      createdByUserId: row.created_by_user_id,
      displayName: row.display_name,
      email: row.email,
      slackId: row.slack_id,
    });
  }

  return grouped;
}

export async function addUserFeatureFlagOverride(input: {
  userId: string;
  flagKey: SafeguardKey;
  createdByUserId: string | null;
}): Promise<boolean> {
  const rows = await sql<OverrideRow[]>`
    INSERT INTO user_feature_flag_overrides (user_id, flag_key, created_by_user_id)
    VALUES (${input.userId}, ${input.flagKey}, ${input.createdByUserId})
    ON CONFLICT DO NOTHING
    RETURNING user_id, flag_key, created_at, created_by_user_id
  `;
  return rows.length > 0;
}

export async function removeUserFeatureFlagOverride(input: {
  userId: string;
  flagKey: SafeguardKey;
}): Promise<boolean> {
  const rows = await sql<OverrideRow[]>`
    DELETE FROM user_feature_flag_overrides
    WHERE user_id = ${input.userId} AND flag_key = ${input.flagKey}
    RETURNING user_id, flag_key, created_at, created_by_user_id
  `;
  return rows.length > 0;
}
