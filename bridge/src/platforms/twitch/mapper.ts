import type { NormalizedStreamEvent } from "../../types.js";
import type { TwitchChannelChatMessageEvent } from "./twitchTypes.js";

export function mapChatMessageToNormalizedEvent(
  event: TwitchChannelChatMessageEvent,
): NormalizedStreamEvent {
  return {
    id: event.message_id,
    platform: "twitch",
    source: "twitchChat",
    authorName: event.chatter_user_name,
    authorId: event.chatter_user_id,
    message: event.message.text,
    createdAt: event.message_timestamp ?? new Date().toISOString(),
  };
}

export { normalizeTwitchChatMessage } from "./twitchNormalizer.js";
