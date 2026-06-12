import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const bridgeRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
dotenv.config({ path: path.join(bridgeRoot, ".env") });

const enableBedrockBoxTwitch =
  process.env.ENABLE_BEDROCK_BOX_TWITCH !== "false";

function readEnvFlag(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (value === "true") return true;
  if (value === "false") return false;
  return defaultValue;
}

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
    redirectUri:
      process.env.TWITCH_REDIRECT_URI ??
      "http://localhost:8787/auth/twitch/callback",
    broadcasterLogin: process.env.TWITCH_BROADCASTER_LOGIN ?? "",
    broadcasterUserId: process.env.TWITCH_BROADCASTER_USER_ID ?? "",
    userId:
      process.env.TWITCH_USER_ID ??
      process.env.TWITCH_MODERATOR_USER_ID ??
      "",
    accessToken: process.env.TWITCH_ACCESS_TOKEN ?? "",
    refreshToken: process.env.TWITCH_REFRESH_TOKEN ?? "",
    eventsubWebSocketUrl:
      process.env.TWITCH_EVENTSUB_WEBSOCKET_URL ??
      "wss://eventsub.wss.twitch.tv/ws",
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
    enableTwitchChatDisplay:
      process.env.ENABLE_TWITCH_CHAT_DISPLAY !== "false",
    enableChannelPointEvents: readEnvFlag(
      "ENABLE_CHANNEL_POINT_EVENTS",
      enableBedrockBoxTwitch,
    ),
    enableCheerEvents: readEnvFlag("ENABLE_CHEER_EVENTS", enableBedrockBoxTwitch),
    enableSubscribeEvents: readEnvFlag(
      "ENABLE_SUBSCRIBE_EVENTS",
      enableBedrockBoxTwitch,
    ),
    enableFollowEvents: readEnvFlag("ENABLE_FOLLOW_EVENTS", enableBedrockBoxTwitch),
    /** When true, Twitch events map to box_* commands (BedrockBox). When false, legacy fill !commands. */
    enableBedrockBoxTwitch,
    enableMediumEffects: process.env.ENABLE_MEDIUM_EFFECTS === "true",
    enableStrongEffects: process.env.ENABLE_STRONG_EFFECTS === "true",
  },
  cooldown: {
    perUserSeconds: 30,
  },
  queue: {
    maxSize: 50,
    maxEventsPerPoll: 5,
    maxChatQueueSize: 100,
    maxChatEventsPerPoll: 10,
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

export function getTwitchMissingConfig(): string[] {
  const missing: string[] = [];
  if (!config.twitch.clientId) missing.push("TWITCH_CLIENT_ID");
  if (!config.twitch.clientSecret) missing.push("TWITCH_CLIENT_SECRET");
  if (!config.twitch.accessToken) missing.push("TWITCH_ACCESS_TOKEN");
  if (!config.twitch.broadcasterUserId && !config.twitch.broadcasterLogin) {
    missing.push("TWITCH_BROADCASTER_USER_ID or TWITCH_BROADCASTER_LOGIN");
  }
  return missing;
}

export function isTwitchConfigured(): boolean {
  return getTwitchMissingConfig().length === 0;
}

export function isTwitchIntegrationRequested(): boolean {
  const safety = config.safety;
  return (
    config.platforms.enableTwitch ||
    safety.enableTwitchChat ||
    safety.enableChannelPointEvents ||
    safety.enableCheerEvents ||
    safety.enableSubscribeEvents ||
    safety.enableFollowEvents
  );
}
