import type { youtube_v3 } from "googleapis";
import type {
  NormalizedStreamEvent,
  NormalizedYoutubeEvent,
  StreamEventSource,
} from "../../types.js";

type LiveChatSnippet = youtube_v3.Schema$LiveChatMessageSnippet & {
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

type LiveChatMessage = youtube_v3.Schema$LiveChatMessage & {
  snippet?: LiveChatSnippet;
};

function getAuthorName(
  authorDetails: youtube_v3.Schema$LiveChatMessageAuthorDetails | undefined,
): string {
  return authorDetails?.displayName ?? authorDetails?.channelId ?? "unknown";
}

function getSource(
  snippet: LiveChatSnippet | undefined,
  authorDetails: youtube_v3.Schema$LiveChatMessageAuthorDetails | undefined,
): StreamEventSource {
  if (authorDetails?.isChatOwner) return "owner";
  if (authorDetails?.isChatModerator) return "moderator";
  if (!snippet) return "normalChat";
  if (snippet.superChatDetails) return "superChat";
  if (snippet.superStickerDetails) return "superSticker";
  if (snippet.memberMilestoneChatDetails) return "member";
  return "normalChat";
}

export function normalizeLiveChatMessage(
  message: LiveChatMessage,
): NormalizedYoutubeEvent | null {
  if (!message.id || !message.snippet?.publishedAt) {
    return null;
  }

  const snippet = message.snippet;
  const authorDetails = message.authorDetails;
  const authorChannelId = authorDetails?.channelId ?? "unknown";
  const source = getSource(snippet, authorDetails);

  let messageText = snippet.displayMessage ?? "";
  let amountMicros: number | undefined;
  let currency: string | undefined;

  if (snippet.superChatDetails) {
    messageText =
      snippet.superChatDetails.userComment ??
      snippet.displayMessage ??
      "";
    amountMicros = Number(snippet.superChatDetails.amountMicros ?? 0);
    currency = snippet.superChatDetails.currency ?? undefined;
  } else if (snippet.superStickerDetails) {
    messageText = snippet.displayMessage ?? "Super Sticker";
    amountMicros = Number(snippet.superStickerDetails.amountMicros ?? 0);
    currency = snippet.superStickerDetails.currency ?? undefined;
  } else if (snippet.memberMilestoneChatDetails) {
    messageText =
      snippet.memberMilestoneChatDetails.userComment ??
      snippet.displayMessage ??
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
    publishedAt: snippet.publishedAt!,
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
