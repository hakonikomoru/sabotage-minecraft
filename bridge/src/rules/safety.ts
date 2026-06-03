import { config } from "../config.js";
import type { NormalizedStreamEvent } from "../types.js";

const NG_WORDS = ["http://", "https://", "discord.gg/"];
const MAX_MESSAGE_LENGTH = 100;

export type SafetyDecision =
  | { allowed: true }
  | { allowed: false; reason: string };

export function validateStreamMessage(
  event: NormalizedStreamEvent,
): SafetyDecision {
  const text = (event.message ?? "").trim();
  const isNonChatSource = [
    "channelPoint",
    "cheer",
    "subscribe",
    "giftSub",
    "follow",
    "debug",
  ].includes(event.source);

  if (!text && !isNonChatSource) {
    return { allowed: false, reason: "empty message" };
  }
  if (text.length >= MAX_MESSAGE_LENGTH) {
    return { allowed: false, reason: "message too long" };
  }
  const lower = text.toLowerCase();
  for (const ng of NG_WORDS) {
    if (lower.includes(ng)) {
      return { allowed: false, reason: "blocked content" };
    }
  }

  if (event.source === "superChat" && !config.safety.enableSuperChatEvents) {
    return { allowed: false, reason: "super chat disabled" };
  }
  if (event.source === "member" && !config.safety.enableMemberEvents) {
    return { allowed: false, reason: "member events disabled" };
  }
  if (
    (event.source === "twitchChat" || event.source === "normalChat") &&
    event.platform === "twitch" &&
    !config.safety.enableTwitchChat
  ) {
    return { allowed: false, reason: "twitch chat disabled" };
  }
  if (event.source === "channelPoint" && !config.safety.enableChannelPointEvents) {
    return { allowed: false, reason: "channel points disabled" };
  }
  if (event.source === "cheer" && !config.safety.enableCheerEvents) {
    return { allowed: false, reason: "cheer disabled" };
  }
  if (
    (event.source === "subscribe" || event.source === "giftSub") &&
    !config.safety.enableSubscribeEvents
  ) {
    return { allowed: false, reason: "subscribe events disabled" };
  }
  if (event.source === "follow" && !config.safety.enableFollowEvents) {
    return { allowed: false, reason: "follow events disabled" };
  }

  return { allowed: true };
}

export function isAdminSource(event: NormalizedStreamEvent): boolean {
  return Boolean(event.isOwner || event.isModerator);
}
