import type { NormalizedStreamEvent } from "../../types.js";
import { cheerTierToRouletteCommand, getCheerTier } from "./cheerTier.js";
import { resolveRewardMapping } from "./twitchRewardMap.js";
import type {
  TwitchChannelPointRedemption,
  TwitchChatMessageEvent,
  TwitchCheerEvent,
  TwitchFollowEvent,
  TwitchGiftSubEvent,
  TwitchSubscribeEvent,
} from "./twitchTypes.js";

export function normalizeTwitchChatMessage(
  event: TwitchChatMessageEvent,
): NormalizedStreamEvent {
  return {
    id: event.id,
    platform: "twitch",
    source: "twitchChat",
    authorName: event.chatter_user_name,
    authorId: event.chatter_user_id,
    message: event.message.text,
    createdAt: event.timestamp,
  };
}

export function normalizeChannelPointRedemption(
  event: TwitchChannelPointRedemption,
): NormalizedStreamEvent {
  const mapping = resolveRewardMapping(
    event.reward.id,
    event.reward.title,
  );
  return {
    id: event.id,
    platform: "twitch",
    source: "channelPoint",
    authorName: event.user_name,
    authorId: event.user_id,
    rewardId: event.reward.id,
    rewardTitle: event.reward.title,
    rewardCost: event.reward.cost,
    command: mapping?.command,
    createdAt: event.redeemed_at,
  };
}

export function normalizeCheerEvent(
  event: TwitchCheerEvent,
): NormalizedStreamEvent {
  const tier = getCheerTier(event.bits);
  return {
    id: event.id,
    platform: "twitch",
    source: "cheer",
    authorName: event.user_name,
    authorId: event.user_id,
    message: event.message,
    bits: event.bits,
    command: cheerTierToRouletteCommand(tier),
    createdAt: event.timestamp,
  };
}

export function normalizeSubscribeEvent(
  event: TwitchSubscribeEvent,
): NormalizedStreamEvent {
  return {
    id: event.id,
    platform: "twitch",
    source: "subscribe",
    authorName: event.user_name,
    authorId: event.user_id,
    subTier: event.tier,
    command: "sub_support",
    createdAt: event.timestamp,
  };
}

export function normalizeGiftSubEvent(
  event: TwitchGiftSubEvent,
): NormalizedStreamEvent {
  return {
    id: event.id,
    platform: "twitch",
    source: "giftSub",
    authorName: event.user_name,
    authorId: event.user_id,
    giftCount: event.total,
    subTier: event.tier,
    command: "gift_sub_event",
    createdAt: event.timestamp,
  };
}

export function normalizeFollowEvent(
  event: TwitchFollowEvent,
): NormalizedStreamEvent {
  return {
    id: event.id,
    platform: "twitch",
    source: "follow",
    authorName: event.user_name,
    authorId: event.user_id,
    command: "follow_firework",
    createdAt: event.followed_at,
  };
}
