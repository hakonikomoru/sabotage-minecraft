/**
 * Twitch EventSub 生イベント型（MVP 後に拡張）
 * @see https://dev.twitch.tv/docs/eventsub/eventsub-reference/
 */

export type TwitchChatMessageEvent = {
  id: string;
  chatter_user_id: string;
  chatter_user_name: string;
  message: { text: string };
  timestamp: string;
};

export type TwitchChannelPointRedemption = {
  id: string;
  user_id: string;
  user_name: string;
  reward: {
    id: string;
    title: string;
    cost: number;
  };
  redeemed_at: string;
};

export type TwitchCheerEvent = {
  id: string;
  user_id: string;
  user_name: string;
  bits: number;
  message?: string;
  timestamp: string;
};

export type TwitchSubscribeEvent = {
  id: string;
  user_id: string;
  user_name: string;
  tier: string;
  timestamp: string;
};

export type TwitchGiftSubEvent = {
  id: string;
  user_id: string;
  user_name: string;
  total: number;
  tier: string;
  timestamp: string;
};

export type TwitchFollowEvent = {
  id: string;
  user_id: string;
  user_name: string;
  followed_at: string;
};

/** EventSub 購読候補（MVP 後） */
export const TWITCH_EVENTSUB_SUBSCRIPTIONS = [
  "channel.chat.message",
  "channel.channel_points_custom_reward_redemption.add",
  "channel.cheer",
  "channel.subscribe",
  "channel.subscription.gift",
  "channel.follow",
] as const;

export type TwitchEventSubSubscription =
  (typeof TWITCH_EVENTSUB_SUBSCRIPTIONS)[number];
