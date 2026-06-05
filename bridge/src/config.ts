import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const bridgeRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
dotenv.config({ path: path.join(bridgeRoot, ".env") });

export const config = {
  port: Number(process.env.PORT ?? 8787),
  nodeEnv: process.env.NODE_ENV ?? "development",
  bridgeApiKey: process.env.BRIDGE_API_KEY ?? "change-me",
  platforms: {
    enableYoutube: process.env.ENABLE_YOUTUBE === "true",
    enableTwitch: process.env.ENABLE_TWITCH === "true",
  },
  youtube: {
    clientId: process.env.YOUTUBE_CLIENT_ID ?? "",
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET ?? "",
    redirectUri:
      process.env.YOUTUBE_REDIRECT_URI ??
      "http://localhost:8787/auth/youtube/callback",
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN ?? "",
    channelId: process.env.YOUTUBE_CHANNEL_ID ?? "",
    liveVideoId: process.env.YOUTUBE_LIVE_VIDEO_ID ?? "",
    /** Minimum ms between liveChatMessages.list calls (saves daily quota). */
    minPollIntervalMs: Number(process.env.YOUTUBE_MIN_POLL_INTERVAL_MS ?? 15_000),
    /** Initial backoff when daily quota is exceeded (ms). */
    quotaBackoffMs: Number(process.env.YOUTUBE_QUOTA_BACKOFF_MS ?? 300_000),
    /** Skip YouTube API calls until Minecraft reports running/paused. */
    pollOnlyWhenGameRunning:
      process.env.YOUTUBE_POLL_ONLY_WHEN_GAME_RUNNING !== "false",
    /** How often to re-check game state while idle (ms). */
    idleCheckIntervalMs: Number(
      process.env.YOUTUBE_IDLE_CHECK_INTERVAL_MS ?? 30_000,
    ),
  },
  twitch: {
    clientId: process.env.TWITCH_CLIENT_ID ?? "",
    clientSecret: process.env.TWITCH_CLIENT_SECRET ?? "",
    broadcasterUserId: process.env.TWITCH_BROADCASTER_USER_ID ?? "",
    moderatorUserId: process.env.TWITCH_MODERATOR_USER_ID ?? "",
    accessToken: process.env.TWITCH_ACCESS_TOKEN ?? "",
    refreshToken: process.env.TWITCH_REFRESH_TOKEN ?? "",
    eventsubTransport:
      (process.env.TWITCH_EVENTSUB_TRANSPORT ?? "websocket") as
        | "websocket"
        | "webhook"
        | "conduits",
  },
  safety: {
    enableYoutubeChat: process.env.ENABLE_YOUTUBE_CHAT === "true",
    enableSuperChatEvents: process.env.ENABLE_SUPER_CHAT_EVENTS === "true",
    enableMemberEvents: process.env.ENABLE_MEMBER_EVENTS === "true",
    enableTwitchChat: process.env.ENABLE_TWITCH_CHAT === "true",
    enableChannelPointEvents:
      process.env.ENABLE_CHANNEL_POINT_EVENTS === "true",
    enableCheerEvents: process.env.ENABLE_CHEER_EVENTS === "true",
    enableSubscribeEvents: process.env.ENABLE_SUBSCRIBE_EVENTS === "true",
    enableFollowEvents: process.env.ENABLE_FOLLOW_EVENTS === "true",
    enableMediumEffects: process.env.ENABLE_MEDIUM_EFFECTS === "true",
    enableStrongEffects: process.env.ENABLE_STRONG_EFFECTS === "true",
  },
  cooldown: {
    perUserSeconds: 30,
  },
  queue: {
    maxSize: 50,
    maxEventsPerPoll: 5,
  },
} as const;

export function isDevelopment(): boolean {
  return config.nodeEnv !== "production";
}

export function isYoutubeOAuthClientConfigured(): boolean {
  return Boolean(config.youtube.clientId && config.youtube.clientSecret);
}

export function isYoutubeConfigured(): boolean {
  return Boolean(
    isYoutubeOAuthClientConfigured() && config.youtube.refreshToken,
  );
}

export function isTwitchConfigured(): boolean {
  return Boolean(
    config.twitch.clientId &&
      config.twitch.clientSecret &&
      config.twitch.broadcasterUserId &&
      config.twitch.accessToken,
  );
}
