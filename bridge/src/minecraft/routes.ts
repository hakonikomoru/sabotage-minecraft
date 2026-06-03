import type { FastifyInstance } from "fastify";
import { config, isDevelopment, isYoutubeConfigured } from "../config.js";
import { logger } from "../logs/logger.js";
import type { PlatformManager } from "../platforms/index.js";
import { getAuthUrl, exchangeCodeForTokens } from "../platforms/youtube/auth.js";
import { eventStore } from "./eventStore.js";
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
  app.get("/health", async () => ({
    ok: true,
    service: "sabotage-minecraft-bridge",
    platforms: {
      youtube: config.platforms.enableYoutube,
      twitch: config.platforms.enableTwitch,
    },
  }));

  app.get("/api/minecraft/events", async (request, reply) => {
    if (!verifyBridgeApiKey(request.headers["x-bridge-api-key"])) {
      return reply.code(401).send({ error: "unauthorized" });
    }
    return { events: eventStore.pollEvents() };
  });

  app.post<{ Body: { eventIds?: string[] } }>(
    "/api/minecraft/events/ack",
    async (request, reply) => {
      if (!verifyBridgeApiKey(request.headers["x-bridge-api-key"])) {
        return reply.code(401).send({ error: "unauthorized" });
      }
      const eventIds = request.body?.eventIds ?? [];
      const acked = eventStore.ackEvents(eventIds);
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
      return { ok: true, eventId: event.id };
    },
  );

  app.get("/auth/youtube", async (_request, reply) => {
    if (!isYoutubeConfigured()) {
      return reply.code(503).send({ error: "YouTube OAuth is not configured" });
    }
    return reply.redirect(getAuthUrl());
  });

  app.get<{ Querystring: { code?: string } }>(
    "/auth/youtube/callback",
    async (request, reply) => {
      const code = request.query.code;
      if (!code) {
        return reply.code(400).send({ error: "missing code" });
      }
      const tokens = await exchangeCodeForTokens(code);
      logger.ok("YouTube OAuth tokens received");
      logger.info("Save YOUTUBE_REFRESH_TOKEN in .env");
      return {
        ok: true,
        hasRefreshToken: Boolean(tokens.refresh_token),
        refreshToken: isDevelopment() ? (tokens.refresh_token ?? null) : null,
      };
    },
  );
}
