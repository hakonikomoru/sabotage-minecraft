import { randomUUID } from "node:crypto";
import { config } from "../../config.js";
import type { NormalizedStreamEvent } from "../../types.js";
import { resolveUserByLogin } from "./auth.js";
import { TwitchEventSubWebSocket } from "./eventsub-websocket.js";
import { twitchLog } from "./logger.js";
import { BEDROCK_BOX_COMMANDS } from "./bedrockBoxCommands.js";
import { mapChatMessageToNormalizedEvent } from "./mapper.js";
import { TwitchTokenStore } from "./token-store.js";
import type { TwitchChannelChatMessageEvent } from "./twitchTypes.js";

export type TwitchEventHandler = (event: NormalizedStreamEvent) => void;

export class TwitchChatPlatform {
  private wsClient: TwitchEventSubWebSocket | null = null;
  private readonly tokenStore = new TwitchTokenStore();
  private readonly followTriggeredThisSession = new Set<string>();
  private readonly chatCommentedThisSession = new Set<string>();
  private broadcasterUserId = config.twitch.broadcasterUserId;
  private userId = config.twitch.userId;

  constructor(private readonly onEvent: TwitchEventHandler) {}

  async start(): Promise<void> {
    twitchLog.info("Twitch EventSub integration enabled.");
    if (config.safety.enableBedrockBoxTwitch) {
      twitchLog.info(
        "BedrockBox Twitch mode ON — events map to box_* commands.",
      );
    }
    await this.resolveIds();
    this.wsClient = new TwitchEventSubWebSocket(
      this.tokenStore,
      {
        onChatMessage: (raw) => this.handleChatMessage(raw),
        onFollow: (raw) => this.handleFollow(raw),
        onSubscribe: (raw) => this.handleSubscribe(raw),
        onGiftSub: (raw) => this.handleGiftSub(raw),
        onCheer: (raw) => this.handleCheer(raw),
        onChannelPoint: (raw) => this.handleChannelPoint(raw),
        onDisconnected: () => {
          twitchLog.warn("EventSub WebSocket disconnected.");
        },
      },
      {
        broadcasterUserId: this.broadcasterUserId,
        userId: this.userId,
      },
    );
    await this.wsClient.start();
  }

  stop(): void {
    this.wsClient?.stop();
    this.wsClient = null;
    this.followTriggeredThisSession.clear();
    this.chatCommentedThisSession.clear();
  }

  isConnected(): boolean {
    return this.wsClient?.isConnected() ?? false;
  }

  private async resolveIds(): Promise<void> {
    const accessToken = await this.tokenStore.getValidAccessToken();

    if (!this.broadcasterUserId && config.twitch.broadcasterLogin) {
      const user = await resolveUserByLogin(
        config.twitch.broadcasterLogin,
        accessToken,
      );
      if (!user) {
        throw new Error(
          `Could not resolve TWITCH_BROADCASTER_LOGIN=${config.twitch.broadcasterLogin}`,
        );
      }
      this.broadcasterUserId = user.id;
      twitchLog.info(
        `Resolved broadcaster user id for ${user.login}: ${user.id}`,
      );
    }

    if (!this.userId) {
      this.userId = this.broadcasterUserId;
    }

    if (!this.broadcasterUserId || !this.userId) {
      throw new Error(
        "TWITCH_BROADCASTER_USER_ID and TWITCH_USER_ID are required",
      );
    }
  }

  private handleChatMessage(raw: Record<string, unknown>): void {
    const event = raw as unknown as TwitchChannelChatMessageEvent;
    const userName = event.chatter_user_name ?? "viewer";
    const userId = event.chatter_user_id ?? userName;

    const normalized = mapChatMessageToNormalizedEvent(event);

    if (config.safety.enableBedrockBoxTwitch) {
      const isFirstComment = !this.chatCommentedThisSession.has(userId);
      if (isFirstComment) {
        this.chatCommentedThisSession.add(userId);
        normalized.command = BEDROCK_BOX_COMMANDS.commentFirst;
        twitchLog.info(`First chat -> box_comment_first user=${userName}`);
      } else {
        normalized.command = BEDROCK_BOX_COMMANDS.commentRepeat;
        twitchLog.info(`Repeat chat -> box_comment_repeat user=${userName}`);
      }
    } else {
      const messageText = event.message?.text ?? "";
      twitchLog.info(
        `Chat message received: author=${userName} text=${messageText}`,
      );
    }

    this.onEvent(normalized);
  }

  private handleFollow(raw: Record<string, unknown>): void {
    const userId = String(raw.user_id ?? "");
    const userName = String(raw.user_name ?? "viewer");
    const eventId = String(raw.id ?? randomUUID());

    if (this.followTriggeredThisSession.has(userId)) {
      twitchLog.info(
        `Follow ignored: already triggered this session user=${userName}`,
      );
      return;
    }

    this.followTriggeredThisSession.add(userId);
    twitchLog.info(
      config.safety.enableBedrockBoxTwitch
        ? `Follow -> box_follow user=${userName}`
        : `Follow received user=${userName}`,
    );

    this.onEvent({
      id: eventId,
      platform: "twitch",
      source: "follow",
      authorName: userName,
      authorId: userId,
      createdAt: String(raw.followed_at ?? new Date().toISOString()),
    });
  }

  private handleSubscribe(raw: Record<string, unknown>): void {
    const userName = String(raw.user_name ?? "viewer");
    twitchLog.info(`Subscribe -> box_subscribe user=${userName}`);

    this.onEvent({
      id: String(raw.id ?? randomUUID()),
      platform: "twitch",
      source: "subscribe",
      authorName: userName,
      authorId: String(raw.user_id ?? ""),
      subTier: String(raw.tier ?? "1000"),
      createdAt: String(raw.timestamp ?? new Date().toISOString()),
    });
  }

  private handleGiftSub(raw: Record<string, unknown>): void {
    const userName = String(raw.user_name ?? "viewer");
    twitchLog.info(`Gift Sub -> box_gift_sub user=${userName}`);

    this.onEvent({
      id: String(raw.id ?? randomUUID()),
      platform: "twitch",
      source: "giftSub",
      authorName: userName,
      authorId: String(raw.user_id ?? ""),
      giftCount: Number(raw.total ?? 1),
      subTier: String(raw.tier ?? "1000"),
      createdAt: String(raw.timestamp ?? new Date().toISOString()),
    });
  }

  private handleCheer(raw: Record<string, unknown>): void {
    const userName = String(raw.user_name ?? "viewer");
    const bits = Number(raw.bits ?? 0);
    if (bits <= 0) {
      twitchLog.info(`Cheer ignored: no bits user=${userName}`);
      return;
    }
    twitchLog.info(`Cheer ${bits} -> box_bits amount=${bits} user=${userName}`);

    this.onEvent({
      id: String(raw.id ?? randomUUID()),
      platform: "twitch",
      source: "cheer",
      authorName: userName,
      authorId: String(raw.user_id ?? ""),
      message: typeof raw.message === "string" ? raw.message : undefined,
      bits,
      createdAt: String(raw.timestamp ?? new Date().toISOString()),
    });
  }

  private handleChannelPoint(raw: Record<string, unknown>): void {
    const userName = String(raw.user_name ?? "viewer");
    const reward = raw.reward as
      | { id?: string; title?: string; cost?: number }
      | undefined;
    const title = reward?.title ?? "reward";
    twitchLog.info(
      `Channel Point Redemption -> box_channel_point title=${title} user=${userName}`,
    );

    this.onEvent({
      id: String(raw.id ?? randomUUID()),
      platform: "twitch",
      source: "channelPoint",
      authorName: userName,
      authorId: String(raw.user_id ?? ""),
      rewardId: reward?.id,
      rewardTitle: title,
      rewardCost: reward?.cost,
      createdAt: String(raw.redeemed_at ?? new Date().toISOString()),
    });
  }
}

/** Backward-compatible export used by PlatformManager */
export { TwitchChatPlatform as TwitchEventSubClient };

// TODO: box_poll — viewer vote for next sabotage (Poll EventSub)
// TODO: box_prediction — success/fail prediction outcomes
// TODO: box_hype_train — Emergency Mode / TNT rush
