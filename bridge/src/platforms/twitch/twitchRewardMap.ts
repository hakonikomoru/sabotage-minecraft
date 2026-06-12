import type { SabotageEventTier, SabotageEventType } from "../../types.js";

export type TwitchRewardMapping = {
  command: string;
  type: SabotageEventType;
  tier: SabotageEventTier;
};

/**
 * Fill Challenge 用の報酬タイトルマップ。
 * BedrockBox では ENABLE_BEDROCK_BOX_TWITCH=true 時に channelPoint は
 * 常に box_channel_point へ（報酬名・reward_id 不問）。
 * TODO: reward_id / rewardTitle 別分岐をここに追加可能。
 */
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
