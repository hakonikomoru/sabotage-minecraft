import { config, isTwitchConfigured } from "../../config.js";
import { logger } from "../../logs/logger.js";
import type { NormalizedStreamEvent } from "../../types.js";
import { TWITCH_EVENTSUB_SUBSCRIPTIONS } from "./twitchTypes.js";

export type TwitchEventHandler = (event: NormalizedStreamEvent) => void;

/**
 * Twitch EventSub クライアント（MVP: スタブ）
 * MVP 後: WebSocket / Webhook / Conduits で購読
 */
export class TwitchEventSubClient {
  private connected = false;

  constructor(private readonly onEvent: TwitchEventHandler) {}

  async start(): Promise<void> {
    if (!isTwitchConfigured()) {
      throw new Error("Twitch OAuth is not configured");
    }

    logger.info(
      `Twitch EventSub stub ready (transport=${config.twitch.eventsubTransport})`,
    );
    logger.info(
      `Planned subscriptions: ${TWITCH_EVENTSUB_SUBSCRIPTIONS.join(", ")}`,
    );
    logger.warn(
      "Twitch EventSub is not implemented in MVP — enable after YouTube MVP",
    );
    this.connected = false;
    void this.onEvent;
  }

  stop(): void {
    this.connected = false;
    logger.info("Twitch EventSub stopped");
  }

  isConnected(): boolean {
    return this.connected;
  }
}

/** @deprecated use TwitchEventSubClient */
export const TwitchClient = TwitchEventSubClient;
