import type { FastifyInstance } from "fastify";
import {
  config,
  isDevelopment,
  isTwitchIntegrationRequested,
  isYoutubeOAuthClientConfigured,
} from "../config.js";
import { logger } from "../logs/logger.js";
import type { PlatformManager } from "../platforms/index.js";
import { getAuthUrl, exchangeCodeForTokens } from "../platforms/youtube/auth.js";
import {
  exchangeCodeForTokens as exchangeTwitchCodeForTokens,
  getTwitchAuthUrl,
  resolveUserByLogin,
  validateAccessToken,
} from "../platforms/twitch/auth.js";
import { eventStore } from "./eventStore.js";
import {
  getSabGameStateLabel,
  isSabGameActive,
  updateSabGameState,
} from "./gameState.js";
import { MVP_COMMAND_NAMES } from "../rules/commandParser.js";

function verifyBridgeApiKey(
  headerValue: string | string[] | undefined,
): boolean {
  if (!headerValue || Array.isArray(headerValue)) {
    return false;
  }
  return headerValue === config.bridgeApiKey;
}

export function registerRoutes(
  app: FastifyInstance,
  getPlatformManager: () => PlatformManager | null,
): void {
  app.get("/health", async () => {
    const platforms = getPlatformManager();
    return {
      ok: true,
      service: "sabotage-minecraft-bridge",
      platforms: {
        youtube: config.platforms.enableYoutube,
        youtubeChat: config.safety.enableYoutubeChat,
        youtubeOAuthConfigured: isYoutubeOAuthClientConfigured(),
        youtubeLiveChatConnected: platforms?.isYoutubeConnected() ?? false,
        youtubeQuotaLimited: platforms?.isYoutubeQuotaLimited() ?? false,
        sabGameActive: isSabGameActive(),
        sabGameState: getSabGameStateLabel(),
        twitch: isTwitchIntegrationRequested(),
        twitchChat: config.safety.enableTwitchChat,
        twitchChannelPoints: config.safety.enableChannelPointEvents,
        twitchCheer: config.safety.enableCheerEvents,
        twitchSubscribe: config.safety.enableSubscribeEvents,
        twitchFollow: config.safety.enableFollowEvents,
        twitchBedrockBox: config.safety.enableBedrockBoxTwitch,
        twitchConnected: platforms?.isTwitchConnected() ?? false,
      },
    };
  });

  app.get("/api/minecraft/events", async (request, reply) => {
    if (!verifyBridgeApiKey(request.headers["x-bridge-api-key"])) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    updateSabGameState(request.headers["x-sab-game-state"]);
    const events = eventStore.pollEvents();
    if (events.length > 0) {
      logger.info(`Minecraft polled events: ${events.length}`);
    }
    return { events };
  });

  app.post<{ Body: { eventIds?: string[] } }>(
    "/api/minecraft/events/ack",
    async (request, reply) => {
      if (!verifyBridgeApiKey(request.headers["x-bridge-api-key"])) {
        return reply.code(401).send({ error: "unauthorized" });
      }
      const eventIds = request.body?.eventIds ?? [];
      const acked = eventStore.ackEvents(eventIds);
      if (acked > 0) {
        logger.info(`Minecraft acked events: ${acked}`);
      }
      return { ok: true, acked };
    },
  );

  app.get("/api/admin/status", async (request, reply) => {
    if (!verifyBridgeApiKey(request.headers["x-bridge-api-key"])) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    const platforms = getPlatformManager();
    return eventStore.getStatus(
      platforms?.isYoutubeConnected() ?? false,
      platforms?.isTwitchConnected() ?? false,
      platforms?.getLiveChatId() ?? null,
    );
  });

  app.post<{ Body: { command?: string; authorName?: string } }>(
    "/api/debug/events",
    async (request, reply) => {
      if (!isDevelopment()) {
        return reply.code(404).send({ error: "not found" });
      }
      if (!verifyBridgeApiKey(request.headers["x-bridge-api-key"])) {
        return reply.code(401).send({ error: "unauthorized" });
      }
      const command = request.body?.command?.trim().toLowerCase();
      if (!command) {
        return reply.code(400).send({ error: "command is required" });
      }
      if (!MVP_COMMAND_NAMES.includes(command)) {
        return reply.code(400).send({
          error: "unsupported command",
          allowed: MVP_COMMAND_NAMES,
        });
      }
      const event = eventStore.enqueueManualEvent({
        command,
        authorName: request.body?.authorName ?? "debug-user",
        message: `!${command}`,
      });
      if (!event) {
        return reply.code(409).send({ error: "event rejected" });
      }
      logger.info(`Debug event accepted: ${command}`);
      return { ok: true, eventId: event.id };
    },
  );

  app.get("/auth/youtube", async (_request, reply) => {
    if (!isYoutubeOAuthClientConfigured()) {
      return reply.code(503).send({
        error:
          "YouTube OAuth client is not configured (YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET)",
      });
    }
    return reply.redirect(getAuthUrl());
  });

  app.get<{ Querystring: { code?: string; error?: string } }>(
    "/auth/youtube/callback",
    async (request, reply) => {
      if (!isYoutubeOAuthClientConfigured()) {
        return reply.code(503).send({
          error:
            "YouTube OAuth client is not configured (YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET)",
        });
      }

      const oauthError = request.query.error;
      if (oauthError) {
        return reply.code(400).send({ error: oauthError });
      }

      const code = request.query.code;
      if (!code) {
        return reply.code(400).send({ error: "missing code" });
      }

      try {
        const tokens = await exchangeCodeForTokens(code);
        logger.ok("YouTube OAuth tokens received");
        logger.info("Save YOUTUBE_REFRESH_TOKEN in bridge/.env and restart Bridge");
        return {
          ok: true,
          hasRefreshToken: Boolean(tokens.refresh_token),
          refreshToken: isDevelopment() ? (tokens.refresh_token ?? null) : null,
        };
      } catch (error) {
        logger.error("YouTube OAuth callback failed", error);
        return reply.code(500).send({ error: "token exchange failed" });
      }
    },
  );

  app.get("/auth/twitch", async (_request, reply) => {
    if (!config.twitch.clientId || !config.twitch.clientSecret) {
      return reply.code(503).send({
        error:
          "Twitch OAuth client is not configured (TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET)",
      });
    }
    return reply.redirect(getTwitchAuthUrl());
  });

  app.get<{ Querystring: { code?: string; error?: string } }>(
    "/auth/twitch/callback",
    async (request, reply) => {
      if (!config.twitch.clientId || !config.twitch.clientSecret) {
        return reply.code(503).send({
          error:
            "Twitch OAuth client is not configured (TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET)",
        });
      }

      const oauthError = request.query.error;
      if (oauthError) {
        return reply.code(400).send({ error: oauthError });
      }

      const code = request.query.code;
      if (!code) {
        return reply.code(400).send({ error: "missing code" });
      }

      try {
        const tokens = await exchangeTwitchCodeForTokens(code);
        logger.ok("Twitch OAuth tokens received");
        const validated = await validateAccessToken(tokens.access_token);
        let broadcasterUserId = config.twitch.broadcasterUserId;
        if (!broadcasterUserId && config.twitch.broadcasterLogin) {
          const broadcaster = await resolveUserByLogin(
            config.twitch.broadcasterLogin,
            tokens.access_token,
          );
          broadcasterUserId = broadcaster?.id ?? "";
        }

        if (isDevelopment()) {
          reply.type("text/plain; charset=utf-8");
          return `Twitch OAuth completed.

Scopes granted: ${validated.scopes.join(", ") || "(none)"}
If follow/sub/bits/channel-points fail, re-run /auth/twitch after scope updates.

Copy the following values to bridge/.env:

ENABLE_TWITCH_CHAT=true
ENABLE_BEDROCK_BOX_TWITCH=true
ENABLE_FOLLOW_EVENTS=true
ENABLE_SUBSCRIBE_EVENTS=true
ENABLE_CHANNEL_POINT_EVENTS=true
ENABLE_CHEER_EVENTS=true
TWITCH_ACCESS_TOKEN=${tokens.access_token}
TWITCH_REFRESH_TOKEN=${tokens.refresh_token ?? ""}
TWITCH_USER_ID=${validated.userId}
TWITCH_BROADCASTER_USER_ID=${broadcasterUserId || validated.userId}
${config.twitch.broadcasterLogin ? `TWITCH_BROADCASTER_LOGIN=${config.twitch.broadcasterLogin}` : ""}
`;
        }

        return {
          ok: true,
          userId: validated.userId,
          broadcasterUserId: broadcasterUserId || validated.userId,
          hasRefreshToken: Boolean(tokens.refresh_token),
        };
      } catch (error) {
        logger.error("Twitch OAuth callback failed", error);
        return reply.code(500).send({ error: "token exchange failed" });
      }
    },
  );
}
