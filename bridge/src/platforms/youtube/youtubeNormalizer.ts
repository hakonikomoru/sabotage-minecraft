import type { youtube_v3 } from "googleapis";
import type {
  NormalizedStreamEvent,
  NormalizedYoutubeEvent,
  StreamEventSource,
} from "../../types.js";

type LiveChatMessage = youtube_v3.Schema$LiveChatMessage & {
  superChatDetails?: {
    userComment?: string | null;
    amountMicros?: string | null;
    currency?: string | null;
  };
  superStickerDetails?: {
    amountMicros?: string | null;
    currency?: string | null;
  };
  memberMilestoneChatDetails?: {
    userComment?: string | null;
  };
};

function getAuthorName(
  authorDetails: youtube_v3.Schema$LiveChatMessageAuthorDetails | undefined,
): string {
  return authorDetails?.displayName ?? authorDetails?.channelId ?? "unknown";
}

function getSource(message: LiveChatMessage): StreamEventSource {
  const details = message.authorDetails;
  if (details?.isChatOwner) return "owner";
  if (details?.isChatModerator) return "moderator";
  if (message.superChatDetails) return "superChat";
  if (message.superStickerDetails) return "superSticker";
  if (details?.isChatSponsor) return "member";
  return "normalChat";
}

export function normalizeLiveChatMessage(
  message: LiveChatMessage,
): NormalizedYoutubeEvent | null {
  if (!message.id || !message.snippet?.publishedAt) {
    return null;
  }

  const authorDetails = message.authorDetails;
  const authorChannelId = authorDetails?.channelId ?? "unknown";
  const source = getSource(message);

  let messageText = message.snippet.displayMessage ?? "";
  let amountMicros: number | undefined;
  let currency: string | undefined;

  if (message.superChatDetails) {
    messageText =
      message.superChatDetails.userComment ??
      message.snippet.displayMessage ??
      "";
    amountMicros = Number(message.superChatDetails.amountMicros ?? 0);
    currency = message.superChatDetails.currency ?? undefined;
  } else if (message.superStickerDetails) {
    messageText = message.snippet.displayMessage ?? "Super Sticker";
    amountMicros = Number(message.superStickerDetails.amountMicros ?? 0);
    currency = message.superStickerDetails.currency ?? undefined;
  } else if (message.memberMilestoneChatDetails) {
    messageText =
      message.memberMilestoneChatDetails.userComment ??
      message.snippet.displayMessage ??
      "";
  }

  return {
    id: message.id,
    source,
    authorName: getAuthorName(authorDetails),
    authorChannelId,
    messageText,
    amountMicros,
    currency,
    isOwner: Boolean(authorDetails?.isChatOwner),
    isModerator: Boolean(authorDetails?.isChatModerator),
    isMember: Boolean(authorDetails?.isChatSponsor),
    publishedAt: message.snippet.publishedAt,
  };
}

export function youtubeToNormalizedStreamEvent(
  event: NormalizedYoutubeEvent,
): NormalizedStreamEvent {
  return {
    id: event.id,
    platform: "youtube",
    source: event.source,
    authorName: event.authorName,
    authorId: event.authorChannelId,
    message: event.messageText,
    amountMicros: event.amountMicros,
    currency: event.currency,
    createdAt: event.publishedAt,
    isOwner: event.isOwner,
    isModerator: event.isModerator,
    isMember: event.isMember,
  };
}
