import { config } from "../../config.js";
import { isSabGameActive } from "../../minecraft/gameState.js";
import { logger } from "../../logs/logger.js";
import { getYoutubeClient, resolveLiveChatId } from "./auth.js";
import {
  normalizeLiveChatMessage,
  youtubeToNormalizedStreamEvent,
} from "./youtubeNormalizer.js";
import type { NormalizedStreamEvent } from "../../types.js";

export type StreamEventHandler = (event: NormalizedStreamEvent) => void;

const MAX_QUOTA_BACKOFF_MS = 3_600_000;

export class YoutubeClient {
  private liveChatId: string | null = null;
  private nextPageToken: string | undefined;
  private polling = false;
  private stopped = false;
  private seenMessageIds = new Set<string>();
  private readonly maxSeenIds = 5000;
  private quotaBackoffMs = 0;
  private consecutiveQuotaErrors = 0;
  private lastQuotaWarnAt = 0;
  private lastIdleLogAt = 0;
  private quotaLimited = false;

  constructor(private readonly onEvent: StreamEventHandler) {}

  async start(): Promise<void> {
    if (this.polling) return;
    this.stopped = false;

    const liveVideoId = config.youtube.liveVideoId;
    if (!liveVideoId) {
      throw new Error("YOUTUBE_LIVE_VIDEO_ID is not configured");
    }

    this.liveChatId = await resolveLiveChatId(liveVideoId);
    if (!this.liveChatId) {
      throw new Error("Could not resolve liveChatId from live video");
    }

    logger.ok(`YouTube live chat connected: ${this.liveChatId}`);
    if (config.youtube.pollOnlyWhenGameRunning) {
      logger.info(
        "YouTube chat poll runs only while Minecraft game is running or paused (saves API quota)",
      );
    }
    this.polling = true;
    void this.pollLoop();
  }

  stop(): void {
    this.stopped = true;
    this.polling = false;
    this.quotaLimited = false;
    this.quotaBackoffMs = 0;
    logger.info("YouTube live chat polling stopped");
  }

  isConnected(): boolean {
    return (
      this.polling &&
      !this.stopped &&
      this.liveChatId !== null &&
      !this.quotaLimited &&
      this.shouldPollNow()
    );
  }

  isQuotaLimited(): boolean {
    return this.quotaLimited;
  }

  getLiveChatId(): string | null {
    return this.liveChatId;
  }

  private shouldPollNow(): boolean {
    if (!config.youtube.pollOnlyWhenGameRunning) {
      return true;
    }
    return isSabGameActive();
  }

  private async pollLoop(): Promise<void> {
    while (!this.stopped && this.liveChatId) {
      if (this.quotaBackoffMs > 0) {
        await sleep(this.quotaBackoffMs);
        if (this.stopped) break;
      }

      if (!this.shouldPollNow()) {
        const now = Date.now();
        if (now - this.lastIdleLogAt >= 120_000) {
          logger.info(
            "YouTube chat poll idle — waiting for Minecraft game start (no API calls)",
          );
          this.lastIdleLogAt = now;
        }
        await sleep(config.youtube.idleCheckIntervalMs);
        continue;
      }

      try {
        await this.fetchPage();
        this.consecutiveQuotaErrors = 0;
        this.quotaBackoffMs = 0;
        this.quotaLimited = false;
      } catch (error) {
        if (isQuotaError(error)) {
          this.handleQuotaError();
        } else {
          logger.error("YouTube live chat poll failed", error);
          await sleep(5000);
        }
      }
    }
    this.polling = false;
  }

  private handleQuotaError(): void {
    this.consecutiveQuotaErrors += 1;
    this.quotaLimited = true;
    this.quotaBackoffMs = Math.min(
      config.youtube.quotaBackoffMs *
        2 ** Math.max(0, this.consecutiveQuotaErrors - 1),
      MAX_QUOTA_BACKOFF_MS,
    );

    const now = Date.now();
    if (now - this.lastQuotaWarnAt >= 60_000) {
      const minutes = Math.max(1, Math.round(this.quotaBackoffMs / 60_000));
      logger.warn(
        `YouTube API quota exceeded — pausing chat poll for ~${minutes} min (use POST /api/debug/events; see docs/youtube-api-setup.md#quota)`,
      );
      this.lastQuotaWarnAt = now;
    }
  }

  private async fetchPage(): Promise<void> {
    const youtube = getYoutubeClient();
    const response = await youtube.liveChatMessages.list({
      liveChatId: this.liveChatId!,
      part: ["id", "snippet", "authorDetails"],
      pageToken: this.nextPageToken,
    });

    const apiWaitMillis = response.data.pollingIntervalMillis ?? 5000;
    const waitMillis = Math.max(
      apiWaitMillis,
      config.youtube.minPollIntervalMs,
    );
    this.nextPageToken = response.data.nextPageToken ?? undefined;

    for (const item of response.data.items ?? []) {
      if (!item.id || this.seenMessageIds.has(item.id)) {
        continue;
      }
      this.seenMessageIds.add(item.id);
      if (this.seenMessageIds.size > this.maxSeenIds) {
        const first = this.seenMessageIds.values().next().value;
        if (first) this.seenMessageIds.delete(first);
      }

      const raw = normalizeLiveChatMessage(item);
      if (raw) {
        this.onEvent(youtubeToNormalizedStreamEvent(raw));
      }
    }

    await sleep(waitMillis);
  }
}

function isQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (/quota/i.test(message)) {
    return true;
  }

  const reasons = (error as { errors?: Array<{ reason?: string }> })?.errors;
  return reasons?.some((entry) => entry.reason === "quotaExceeded") ?? false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
