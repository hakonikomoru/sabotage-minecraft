export type SabotageEventType =
  | "sabotage"
  | "support"
  | "effect"
  | "system"
  | "chat";

export type StreamPlatform = "youtube" | "twitch" | "debug";

export type StreamEventSource =
  | "normalChat"
  | "superChat"
  | "superSticker"
  | "member"
  | "owner"
  | "moderator"
  | "twitchChat"
  | "channelPoint"
  | "cheer"
  | "subscribe"
  | "giftSub"
  | "follow"
  | "debug";

/** @deprecated use StreamEventSource */
export type SabotageEventSource = StreamEventSource;

export type SabotageEventTier = "weak" | "medium" | "strong" | "special";

export type EffectRisk = "safe" | "medium" | "dangerous";

export type EffectCategory =
  | "movement"
  | "vision"
  | "mob"
  | "field"
  | "support"
  | "visual"
  | "system";

export type CheerTier = "small" | "medium" | "large" | "special";

/** Bridge 内部の共通正規化イベント（全プラットフォーム） */
export type NormalizedStreamEvent = {
  id: string;
  platform: StreamPlatform;
  source: StreamEventSource;
  authorName: string;
  authorId?: string;
  message?: string;
  command?: string;

  amountMicros?: number;
  currency?: string;

  bits?: number;
  rewardId?: string;
  rewardTitle?: string;
  rewardCost?: number;
  giftCount?: number;
  subTier?: string;

  createdAt: string;

  /** YouTube admin flags */
  isOwner?: boolean;
  isModerator?: boolean;
  isMember?: boolean;
};

/** @deprecated use NormalizedStreamEvent */
export type StreamEvent = NormalizedStreamEvent;

export type SabotageEvent = {
  id: string;
  platform: StreamPlatform;
  type: SabotageEventType;
  source: StreamEventSource;
  command: string;
  tier: SabotageEventTier;
  category?: EffectCategory;
  risk?: EffectRisk;
  authorName: string;
  authorId?: string;
  message?: string;
  amountMicros?: number;
  currency?: string;
  bits?: number;
  rewardTitle?: string;
  createdAt: string;
};

/** YouTube adapter 内部用（live chat 生データ正規化前） */
export type NormalizedYoutubeEvent = {
  id: string;
  source: StreamEventSource;
  authorName: string;
  authorChannelId: string;
  messageText: string;
  amountMicros?: number;
  currency?: string;
  isOwner: boolean;
  isModerator: boolean;
  isMember: boolean;
  publishedAt: string;
};

export type BridgeMode = "idle" | "running" | "paused";

export type BridgeStatus = {
  youtubeConnected: boolean;
  twitchConnected: boolean;
  minecraftConnected: boolean;
  liveChatId: string | null;
  pendingEvents: number;
  processedEvents: number;
  ignoredEvents: number;
  mode: BridgeMode;
};

export type FutureGameMode = "vote_event" | "random_roulette";

export type ResolvedStreamCommand = {
  command: string;
  type: SabotageEventType;
  tier: SabotageEventTier;
};
