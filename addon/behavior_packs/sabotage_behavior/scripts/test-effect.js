import { canAcceptYoutubeEvents } from "./state.js";
import { eventQueue } from "./event-queue.js";
import { getEffectDefinition } from "./effects/registry.js";
import { executeEffect } from "./effects/index.js";
import { broadcast } from "./effects/visual-effects.js";

export const TESTABLE_COMMANDS = new Set([
  "slow",
  "blind",
  "chicken",
  "hole",
  "block",
  "box_comment_first",
  "box_comment_repeat",
  "box_follow",
  "box_subscribe",
  "box_channel_point",
  "box_bits",
  "box_gift_sub",
]);

/**
 * @param {import("@minecraft/server").Player} player
 * @param {string} command
 * @param {{ bits?: number }} [options]
 */
export function runTestEffect(player, command, options = {}) {
  const normalized = command.toLowerCase();
  if (!TESTABLE_COMMANDS.has(normalized)) {
    broadcast(`Unknown test command: ${normalized}`);
    return false;
  }

  if (!canAcceptYoutubeEvents()) {
    broadcast("Game not started - run start before testing.");
    return false;
  }

  const def = getEffectDefinition(normalized);
  const testEvent = {
    id: `test_${Date.now()}`,
    platform: "debug",
    type: def?.category === "support" ? "support" : "sabotage",
    source: "debug",
    command: normalized,
    tier: "weak",
    authorName: player.name,
    message: `test:${normalized}`,
    createdAt: new Date().toISOString(),
  };

  if (normalized === "box_bits") {
    testEvent.bits = options.bits ?? 5;
  }

  if (!eventQueue.enqueue(testEvent)) {
    broadcast(`Test event queue failed: ${normalized}`);
    return false;
  }

  broadcast(`Test event queued: ${normalized}`);
  const event = eventQueue.dequeueOne();
  if (event) {
    executeEffect(event);
  }
  return true;
}
