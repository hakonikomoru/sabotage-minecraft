import type { SabotageEventTier, SabotageEventType } from "../../types.js";

export type TwitchRewardMapping = {
  command: string;
  type: SabotageEventType;
  tier: SabotageEventTier;
};

/** rewardId 優先、なければ rewardTitle で照合 */
export const twitchRewardMap: Record<string, TwitchRewardMapping> = {
  "妨害：暗闇": {
    command: "blind",
    type: "sabotage",
    tier: "weak",
  },
  "妨害：床を消す": {
    command: "hole",
    type: "sabotage",
    tier: "weak",
  },
  "応援：ブロック追加": {
    command: "block",
    type: "support",
    tier: "weak",
  },
};

export function resolveRewardMapping(
  rewardId?: string,
  rewardTitle?: string,
): TwitchRewardMapping | null {
  if (rewardId && twitchRewardMap[rewardId]) {
    return twitchRewardMap[rewardId];
  }
  if (rewardTitle && twitchRewardMap[rewardTitle]) {
    return twitchRewardMap[rewardTitle];
  }
  return null;
}
