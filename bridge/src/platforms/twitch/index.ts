import { config } from "../../config.js";
import { parseChatCommand } from "../../rules/commandParser.js";
import type { NormalizedStreamEvent } from "../../types.js";
import { resolveUserByLogin } from "./auth.js";
import { TwitchEventSubWebSocket } from "./eventsub-websocket.js";
import { twitchLog } from "./logger.js";
import { mapChatMessageToNormalizedEvent } from "./mapper.js";
import { TwitchTokenStore } from "./token-store.js";
import type { TwitchChannelChatMessageEvent } from "./twitchTypes.js";

export type TwitchEventHandler = (event: NormalizedStreamEvent) => void;

export class TwitchChatPlatform {
  private wsClient: TwitchEventSubWebSocket | null = null;
  private readonly tokenStore = new TwitchTokenStore();
  private broadcasterUserId = config.twitch.broadcasterUserId;
  private userId = config.twitch.userId;

  constructor(private readonly onEvent: TwitchEventHandler) {}

  async start(): Promise<void> {
    twitchLog.info("Twitch chat integration enabled.");
    await this.resolveIds();
    this.wsClient = new TwitchEventSubWebSocket(
      this.tokenStore,
      {
        onChatMessage: (raw) => this.handleChatMessage(raw),
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
    const messageText = event.message?.text ?? "";
    twitchLog.info(
      `Chat message received: author=${event.chatter_user_name} text=${messageText}`,
    );

    const normalized = mapChatMessageToNormalizedEvent(event);
    const parsed = parseChatCommand(messageText);
    if (!parsed) {
      twitchLog.info("Command ignored: unsupported command");
      return;
    }

    twitchLog.info(`Command accepted: ${parsed.command}`);
    this.onEvent(normalized);
    twitchLog.info(`Queued sabotage event: ${parsed.command}`);
  }
}

/** Backward-compatible export used by PlatformManager */
export { TwitchChatPlatform as TwitchEventSubClient };
