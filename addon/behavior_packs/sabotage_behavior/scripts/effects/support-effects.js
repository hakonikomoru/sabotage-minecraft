import { ItemStack } from "@minecraft/server";
import { CONFIG } from "../config.js";
import { getMainPlayer } from "../utils/players.js";
import { broadcast } from "./visual-effects.js";

export function removeWhiteWoolFromInventory(player) {
  const inventory = player.getComponent("inventory")?.container;
  if (!inventory) return;
  for (let slot = 0; slot < inventory.size; slot++) {
    const item = inventory.getItem(slot);
    if (item?.typeId === CONFIG.fillChallenge.targetBlock) {
      inventory.setItem(slot, undefined);
    }
  }
}

export function giveWhiteWool(player, amount) {
  let remaining = amount;
  const inventory = player.getComponent("inventory")?.container;
  if (!inventory) return;

  while (remaining > 0) {
    const batch = Math.min(remaining, 64);
    const item = new ItemStack(CONFIG.fillChallenge.targetBlock, batch);
    const leftover = inventory.addItem(item);
    remaining -= batch;
    if (leftover) {
      player.dimension.spawnItem(leftover, player.location);
    }
  }
}

export function applyBlockSupport() {
  const player = getMainPlayer();
  if (!player) {
    broadcast("Block effect skipped: no player found.");
    return 0;
  }
  giveWhiteWool(player, 16);
  broadcast("Added white wool: 16");
  return 16;
}
