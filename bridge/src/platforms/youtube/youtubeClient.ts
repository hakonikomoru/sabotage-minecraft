import { config } from "../../config.js";
import { logger } from "../../logs/logger.js";
import { getYoutubeClient, resolveLiveChatId } from "./auth.js";
import {
  normalizeLiveChatMessage,
  youtubeToNormalizedStreamEvent,
} from "./youtubeNormalizer.js";
import type { NormalizedStreamEvent } from "../../types.js";

export type StreamEventHandler = (event: NormalizedStreamEvent) => void;

export class YoutubeClient {
  private liveChatId: string | null = null;
  private nextPageToken: string | undefined;
  private polling = false;
  private stopped = false;
  private seenMessageIds = new Set<string>();
  private readonly maxSeenIds = 5000;

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
    this.polling = true;
    void this.pollLoop();
  }

  stop(): void {
    this.stopped = true;
    this.polling = false;
    logger.info("YouTube live chat polling stopped");
  }

  isConnected(): boolean {
    return this.polling && !this.stopped && this.liveChatId !== null;
  }

  getLiveChatId(): string | null {
    return this.liveChatId;
  }

  private async pollLoop(): Promise<void> {
    while (!this.stopped && this.liveChatId) {
      try {
        await this.fetchPage();
      } catch (error) {
        logger.error("YouTube live chat poll failed", error);
        await sleep(5000);
      }
    }
    this.polling = false;
  }

  private async fetchPage(): Promise<void> {
    const youtube = getYoutubeClient();
    const response = await youtube.liveChatMessages.list({
      liveChatId: this.liveChatId!,
      // API supports only id, snippet, authorDetails — Super Chat etc. live under snippet.
      part: ["id", "snippet", "authorDetails"],
      pageToken: this.nextPageToken,
    });

    const waitMillis = response.data.pollingIntervalMillis ?? 5000;
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
