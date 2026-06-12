import { world } from "@minecraft/server";
import { CONFIG } from "../config.js";
import { getMainPlayer } from "../utils/players.js";

const PLATFORM_LABELS = {
  twitch: "Twitch",
  youtube: "YouTube",
  debug: "Debug",
};

function clipMessage(text, maxLength) {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(0, maxLength - 1))}…`;
}

/**
 * @param {{ platform?: string, authorName?: string, message?: string }} event
 */
export function showStreamChat(event) {
  if (CONFIG.chatDisplay?.enabled === false) {
    return;
  }

  const message = event.message?.trim?.() ?? "";
  if (!message) {
    return;
  }

  const platform = event.platform ?? "twitch";
  const label =
    CONFIG.chatDisplay?.platformLabels?.[platform] ??
    PLATFORM_LABELS[platform] ??
    platform;
  const author = event.authorName ?? "viewer";
  const maxLength = CONFIG.chatDisplay?.maxMessageLength ?? 60;
  const clipped = clipMessage(message, maxLength);
  const chatLine = `[${label}] ${author}: ${clipped}`;

  if (CONFIG.chatDisplay?.showInGameChat !== false) {
    world.sendMessage(chatLine);
  }

  if (CONFIG.chatDisplay?.showActionBar !== false) {
    const player = getMainPlayer();
    if (player) {
      player.onScreenDisplay.setActionBar(chatLine);
    }
  }

  console.warn(`[SAB][CHAT] ${chatLine}`);
}
