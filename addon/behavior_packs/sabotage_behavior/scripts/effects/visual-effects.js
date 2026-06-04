import { world } from "@minecraft/server";
import { EFFECT_LABELS } from "../config.js";

export function broadcast(message) {
  console.warn(`[SAB][BROADCAST] ${message}`);
  world.sendMessage(`[SAB] ${message}`);
}

export function showTitleAll(title, subtitle) {
  for (const player of world.getAllPlayers()) {
    player.onScreenDisplay.setTitle(title, {
      subtitle,
      fadeInDuration: 5,
      stayDuration: 40,
      fadeOutDuration: 10,
    });
  }
}

export function showEventTitle(event) {
  const label = EFFECT_LABELS[event.command] ?? event.command;
  showTitleAll(`${event.authorName} triggered !${event.command}!`, label);
}
