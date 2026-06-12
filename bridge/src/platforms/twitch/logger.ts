import { logger } from "../../logs/logger.js";

export const twitchLog = {
  info(message: string): void {
    logger.info(`[Bridge][Twitch] ${message}`);
  },
  ok(message: string): void {
    logger.ok(`[Bridge][Twitch] ${message}`);
  },
  warn(message: string): void {
    logger.warn(`[Bridge][Twitch] ${message}`);
  },
  error(message: string, error?: unknown): void {
    logger.error(`[Bridge][Twitch] ${message}`, error);
  },
};
