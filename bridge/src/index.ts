import Fastify from "fastify";
import { config, isDevelopment, isYoutubeConfigured } from "./config.js";
import { logger } from "./logs/logger.js";
import { registerRoutes } from "./minecraft/routes.js";
import { eventStore } from "./minecraft/eventStore.js";
import { PlatformManager } from "./platforms/index.js";
import { MVP_COMMAND_NAMES } from "./rules/commandParser.js";

const app = Fastify({ logger: false });
let platformManager: PlatformManager | null = null;

registerRoutes(app, () => platformManager);

async function main(): Promise<void> {
  platformManager = new PlatformManager((event) => {
    eventStore.handleNormalizedStreamEvent(event);
  });

  await app.listen({ port: config.port, host: "0.0.0.0" });
  logger.ok(`Bridge server started on port ${config.port}`);
  logger.info(`MVP commands: ${MVP_COMMAND_NAMES.join(", ")}`);
  await platformManager.startAll();
}

main().catch((error) => {
  logger.error("Failed to start bridge server", error);
  process.exit(1);
});

process.on("SIGINT", () => {
  platformManager?.stopAll();
  process.exit(0);
});

process.on("SIGTERM", () => {
  platformManager?.stopAll();
  process.exit(0);
});
