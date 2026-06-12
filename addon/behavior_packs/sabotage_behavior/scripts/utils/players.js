import { world, GameMode } from "@minecraft/server";
import { CONFIG } from "../config.js";
import { getMainPlayerName } from "../state.js";

export function getMainPlayer() {
  const name = getMainPlayerName();
  if (name) {
    const player = world.getPlayers({ name })[0];
    if (player) return player;
  }
  const players = world.getAllPlayers();
  return players[0] ?? null;
}

export function getAllGamePlayers() {
  const main = getMainPlayer();
  return main ? [main] : world.getAllPlayers();
}

export function isCreativePlayer(player) {
  if (!player) return false;
  try {
    return player.getGameMode() === GameMode.Creative;
  } catch {
    return false;
  }
}

export function isAdmin(player) {
  if (!player) return false;
  if (CONFIG.admin.playerNames.includes(player.name)) {
    return true;
  }
  return player.hasTag("sab:admin");
}
