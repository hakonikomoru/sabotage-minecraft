import {
  config,
  isTwitchConfigured,
  isYoutubeConfigured,
} from "../config.js";
import { logger } from "../logs/logger.js";
import type { NormalizedStreamEvent } from "../types.js";
import { YoutubeClient } from "./youtube/youtubeClient.js";
import { TwitchEventSubClient } from "./twitch/twitchClient.js";

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

    if (config.platforms.enableTwitch) {
      await this.startTwitch();
    } else {
      logger.info("Twitch platform disabled (ENABLE_TWITCH=false)");
    }
  }

  stopAll(): void {
    this.youtubeClient?.stop();
    this.twitchClient?.stop();
  }

  isYoutubeConnected(): boolean {
    return this.youtubeClient?.isConnected() ?? false;
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
    this.youtubeClient = new YoutubeClient(this.onEvent);
    await this.youtubeClient.start();
  }

  private async startTwitch(): Promise<void> {
    if (!isTwitchConfigured()) {
      logger.warn("Twitch enabled but OAuth is not configured");
      return;
    }
    this.twitchClient = new TwitchEventSubClient(this.onEvent);
    await this.twitchClient.start();
  }
}

export {
  debugToNormalizedStreamEvent,
} from "./debug/debugEvents.js";
export {
  youtubeToNormalizedStreamEvent,
} from "./youtube/youtubeNormalizer.js";
