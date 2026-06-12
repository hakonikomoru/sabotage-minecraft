import {
  config,
  getTwitchMissingConfig,
  isTwitchConfigured,
  isYoutubeConfigured,
} from "../config.js";
import { logger } from "../logs/logger.js";
import type { NormalizedStreamEvent } from "../types.js";
import { YoutubeClient } from "./youtube/youtubeClient.js";
import { TwitchEventSubClient } from "./twitch/index.js";
import { twitchLog } from "./twitch/logger.js";

export type PlatformEventHandler = (event: NormalizedStreamEvent) => void;

export class PlatformManager {
  private youtubeClient: YoutubeClient | null = null;
  private twitchClient: TwitchEventSubClient | null = null;

  constructor(private readonly onEvent: PlatformEventHandler) {}

  async startAll(): Promise<void> {
    if (config.platforms.enableYoutube) {
      await this.startYoutube();
    } else {
      logger.info("YouTube platform disabled (ENABLE_YOUTUBE=false)");
    }

    if (config.platforms.enableTwitch || config.safety.enableTwitchChat) {
      await this.startTwitch();
    } else {
      logger.info("Twitch platform disabled (ENABLE_TWITCH_CHAT=false)");
    }
  }

  stopAll(): void {
    this.youtubeClient?.stop();
    this.twitchClient?.stop();
  }

  isYoutubeConnected(): boolean {
    return this.youtubeClient?.isConnected() ?? false;
  }

  isYoutubeQuotaLimited(): boolean {
    return this.youtubeClient?.isQuotaLimited() ?? false;
  }

  isTwitchConnected(): boolean {
    return this.twitchClient?.isConnected() ?? false;
  }

  getLiveChatId(): string | null {
    return this.youtubeClient?.getLiveChatId() ?? null;
  }

  private async startYoutube(): Promise<void> {
    if (!config.safety.enableYoutubeChat) {
      logger.info("YouTube chat disabled (ENABLE_YOUTUBE_CHAT=true to enable)");
      return;
    }
    if (!isYoutubeConfigured()) {
      logger.warn("YouTube chat enabled but OAuth is not configured");
      return;
    }
    try {
      this.youtubeClient = new YoutubeClient(this.onEvent);
      await this.youtubeClient.start();
    } catch (error) {
      logger.error(
        "YouTube startup failed (Bridge continues without YouTube chat)",
        error,
      );
      this.youtubeClient?.stop();
      this.youtubeClient = null;
    }
  }

  private async startTwitch(): Promise<void> {
    if (!config.safety.enableTwitchChat && !config.platforms.enableTwitch) {
      logger.info("Twitch chat disabled (ENABLE_TWITCH_CHAT=true to enable)");
      return;
    }
    const missing = getTwitchMissingConfig();
    if (missing.length > 0) {
      twitchLog.warn(`Disabled: missing ${missing.join(", ")}`);
      return;
    }
    if (!isTwitchConfigured()) {
      twitchLog.warn("Disabled: Twitch OAuth is not configured");
      return;
    }
    try {
      this.twitchClient = new TwitchEventSubClient(this.onEvent);
      await this.twitchClient.start();
    } catch (error) {
      twitchLog.error("Startup failed (Bridge continues without Twitch chat)", error);
      this.twitchClient?.stop();
      this.twitchClient = null;
    }
  }
}

export {
  debugToNormalizedStreamEvent,
} from "./debug/debugEvents.js";
export {
  youtubeToNormalizedStreamEvent,
} from "./youtube/youtubeNormalizer.js";
