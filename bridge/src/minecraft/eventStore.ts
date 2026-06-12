import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import {
  getEffectDefinition,
  isEffectAllowedBySafety,
} from "../effects/registry.js";
import { logger } from "../logs/logger.js";
import {
  isAdminStreamEvent,
  resolveCommandFromStreamEvent,
} from "../platforms/eventResolver.js";
import { CooldownManager } from "../rules/cooldown.js";
import { validateStreamMessage } from "../rules/safety.js";
import type {
  BridgeMode,
  BridgeStatus,
  NormalizedStreamEvent,
  SabotageEvent,
} from "../types.js";

type PendingEvent = SabotageEvent & { acked: boolean };

export class EventStore {
  private readonly pending: PendingEvent[] = [];
  private readonly chatPending: PendingEvent[] = [];
  private readonly cooldown = new CooldownManager();
  private readonly seenMessageIds = new Set<string>();
  private mode: BridgeMode = "running";
  private processedEvents = 0;
  private ignoredEvents = 0;
  private lastMinecraftPollAt: number | null = null;

  enqueueManualEvent(
    input: Partial<SabotageEvent> & Pick<SabotageEvent, "command">,
  ): SabotageEvent | null {
    const definition = getEffectDefinition(input.command);
    if (
      !definition ||
      !isEffectAllowedBySafety(definition, config.safety)
    ) {
      this.ignoredEvents += 1;
      logger.warn(`Ignored manual event (disabled): ${input.command}`);
      return null;
    }

    const event: SabotageEvent = {
      id: input.id ?? `evt_${randomUUID()}`,
      platform: input.platform ?? "debug",
      type: input.type ?? definition.type,
      source: input.source ?? "debug",
      command: input.command,
      tier: input.tier ?? definition.tier,
      category: definition.category,
      risk: definition.risk,
      authorName: input.authorName ?? "debug-user",
      authorId: input.authorId,
      message: input.message,
      amountMicros: input.amountMicros,
      currency: input.currency,
      bits: input.bits,
      rewardTitle: input.rewardTitle,
      createdAt: input.createdAt ?? new Date().toISOString(),
    };

    if (!this.enqueue(event)) {
      return null;
    }

    logger.info(`Manual event queued: ${event.command} (${event.id})`);
    return event;
  }

  handleNormalizedStreamEvent(event: NormalizedStreamEvent): void {
    if (this.mode !== "running") {
      this.ignoredEvents += 1;
      return;
    }

    const dedupeKey = `${event.platform}:${event.id}`;
    if (this.seenMessageIds.has(dedupeKey)) {
      this.ignoredEvents += 1;
      return;
    }

    const safety = validateStreamMessage(event);
    if (!safety.allowed) {
      this.ignoredEvents += 1;
      logger.info(
        `Ignored stream message (${safety.reason}): ${event.platform}/${event.id}`,
      );
      return;
    }

    this.rememberMessageId(dedupeKey);

    this.enqueueChatDisplay(event);

    const resolved = resolveCommandFromStreamEvent(event);
    if (!resolved) {
      if (event.source === "channelPoint") {
        logger.info(
          `Ignored channel point (no mapping): reward=${event.rewardTitle ?? "?"} id=${event.rewardId ?? "?"}`,
        );
      }
      return;
    }

    logger.info(
      `Received command: !${resolved.command} from ${event.authorName} (${event.platform}/${event.source})`,
    );

    const definition = getEffectDefinition(resolved.command);
    if (!definition) {
      return;
    }

    if (resolved.type === "system") {
      if (!isAdminStreamEvent(event)) {
        this.ignoredEvents += 1;
        return;
      }
      this.enqueue(this.buildSabotageEvent(event, resolved, definition));
      return;
    }

    if (!isEffectAllowedBySafety(definition, config.safety)) {
      this.ignoredEvents += 1;
      logger.warn(`Ignored disabled effect: !${resolved.command}`);
      return;
    }

    const authorId = event.authorId ?? event.authorName;
    if (
      !definition.skipUserCooldown &&
      !this.cooldown.checkUser(authorId)
    ) {
      this.ignoredEvents += 1;
      logger.info(
        `Ignored command due to cooldown: !${resolved.command} from ${event.authorName}`,
      );
      return;
    }

    if (!this.cooldown.checkCommand(definition)) {
      this.ignoredEvents += 1;
      logger.info(
        `Ignored command due to cooldown: !${resolved.command} from ${event.authorName}`,
      );
      return;
    }

    this.enqueue(this.buildSabotageEvent(event, resolved, definition));
  }

  /** @deprecated */
  handleStreamEvent(event: NormalizedStreamEvent): void {
    this.handleNormalizedStreamEvent(event);
  }

  pollEvents(): SabotageEvent[] {
    this.lastMinecraftPollAt = Date.now();
    const chats = this.chatPending
      .filter((event) => !event.acked)
      .slice(0, config.queue.maxChatEventsPerPoll)
      .map(({ acked: _acked, ...event }) => event);
    const effects = this.pending
      .filter((event) => !event.acked)
      .slice(0, config.queue.maxEventsPerPoll)
      .map(({ acked: _acked, ...event }) => event);
    return [...chats, ...effects];
  }

  ackEvents(eventIds: string[]): number {
    let count = 0;
    for (const pending of [...this.chatPending, ...this.pending]) {
      if (eventIds.includes(pending.id) && !pending.acked) {
        pending.acked = true;
        this.processedEvents += 1;
        count += 1;
      }
    }
    this.compactPending();
    this.compactChatPending();
    return count;
  }

  getStatus(
    youtubeConnected: boolean,
    twitchConnected: boolean,
    liveChatId: string | null,
  ): BridgeStatus {
    return {
      youtubeConnected,
      twitchConnected,
      minecraftConnected:
        this.lastMinecraftPollAt !== null &&
        Date.now() - this.lastMinecraftPollAt < 30_000,
      liveChatId,
      pendingEvents:
        this.pending.filter((event) => !event.acked).length +
        this.chatPending.filter((event) => !event.acked).length,
      processedEvents: this.processedEvents,
      ignoredEvents: this.ignoredEvents,
      mode: this.mode,
    };
  }

  setMode(mode: BridgeMode): void {
    this.mode = mode;
    logger.info(`Bridge mode set to ${mode}`);
  }

  clearQueue(): number {
    const before = this.pending.length + this.chatPending.length;
    this.pending.length = 0;
    this.chatPending.length = 0;
    logger.warn(`Queue cleared (${before} events removed)`);
    return before;
  }

  private enqueueChatDisplay(stream: NormalizedStreamEvent): void {
    if (!config.safety.enableTwitchChatDisplay) {
      return;
    }
    if (stream.platform !== "twitch" || stream.source !== "twitchChat") {
      return;
    }

    const text = (stream.message ?? "").trim();
    if (!text) {
      return;
    }

    const event: SabotageEvent = {
      id: `chat_${stream.platform}_${stream.id}`,
      platform: stream.platform,
      type: "chat",
      source: stream.source,
      command: "chat",
      tier: "special",
      authorName: stream.authorName,
      authorId: stream.authorId,
      message: text,
      createdAt: stream.createdAt,
    };

    if (
      this.chatPending.filter((item) => !item.acked).length >=
      config.queue.maxChatQueueSize
    ) {
      this.ignoredEvents += 1;
      return;
    }

    this.chatPending.push({ ...event, acked: false });
    logger.info(`Chat display queued: ${stream.authorName}: ${text}`);
  }

  private buildSabotageEvent(
    stream: NormalizedStreamEvent,
    resolved: ReturnType<typeof resolveCommandFromStreamEvent>,
    definition: NonNullable<ReturnType<typeof getEffectDefinition>>,
  ): SabotageEvent {
    return {
      id: `evt_${stream.platform}_${stream.id}`,
      platform: stream.platform,
      type: resolved!.type,
      source: stream.source,
      command: resolved!.command,
      tier: definition.tier,
      category: definition.category,
      risk: definition.risk,
      authorName: stream.authorName,
      authorId: stream.authorId,
      message: stream.message,
      amountMicros: stream.amountMicros,
      currency: stream.currency,
      bits: stream.bits,
      rewardTitle: stream.rewardTitle,
      createdAt: stream.createdAt,
    };
  }

  private enqueue(event: SabotageEvent): boolean {
    if (
      this.pending.filter((item) => !item.acked).length >= config.queue.maxSize
    ) {
      this.ignoredEvents += 1;
      logger.warn("queue full");
      return false;
    }
    this.pending.push({ ...event, acked: false });
    logger.ok(`Event queued: ${event.command} by ${event.authorName}`);
    return true;
  }

  private rememberMessageId(id: string): void {
    this.seenMessageIds.add(id);
    if (this.seenMessageIds.size > 5000) {
      const first = this.seenMessageIds.values().next().value;
      if (first) this.seenMessageIds.delete(first);
    }
  }

  private compactPending(): void {
    if (this.pending.length <= config.queue.maxSize * 2) {
      return;
    }
    const unacked = this.pending.filter((event) => !event.acked);
    this.pending.length = 0;
    this.pending.push(...unacked);
  }

  private compactChatPending(): void {
    if (this.chatPending.length <= config.queue.maxChatQueueSize * 2) {
      return;
    }
    const unacked = this.chatPending.filter((event) => !event.acked);
    this.chatPending.length = 0;
    this.chatPending.push(...unacked);
  }
}

export const eventStore = new EventStore();
