import { CONFIG } from "../config.js";

const PLACE_SOUND_BY_BLOCK = {
  "minecraft:iron_block": "place.iron",
  "minecraft:gold_block": "place.iron",
  "minecraft:diamond_block": "place.iron",
  "minecraft:white_wool": "dig.wool",
};

/**
 * @param {string} blockTypeId
 */
export function getBlockPlaceSoundId(blockTypeId) {
  if (PLACE_SOUND_BY_BLOCK[blockTypeId]) {
    return PLACE_SOUND_BY_BLOCK[blockTypeId];
  }
  if (blockTypeId?.endsWith("_wool")) {
    return "dig.wool";
  }
  if (blockTypeId?.endsWith("_block")) {
    return "place.iron";
  }
  return "use.stone";
}

/**
 * Play a place sound at the player so remote BedrockBox fills stay audible.
 * @param {import("@minecraft/server").Player} player
 * @param {string} blockTypeId
 */
export function playBlockPlaceSoundForPlayer(player, blockTypeId) {
  if (!player || !blockTypeId) return;

  const soundId = getBlockPlaceSoundId(blockTypeId);
  const volume = CONFIG.world?.blockPlaceSoundVolume ?? 2;
  const pitch = CONFIG.world?.blockPlaceSoundPitch ?? 1;

  try {
    player.playSound(soundId, {
      location: player.location,
      volume,
      pitch,
    });
  } catch {
    try {
      player.playSound(soundId, { volume, pitch });
    } catch {
      // ignore missing sound on older builds
    }
  }
}

/**
 * @param {import("@minecraft/server").Player} player
 * @param {{ x: number, y: number, z: number }} blockLocation
 */
export function shouldPlayRemotePlaceSound(player, blockLocation) {
  const minDistance = CONFIG.world?.blockPlaceSoundMinDistance ?? 6;
  const loc = player.location;
  const dx = loc.x - (blockLocation.x + 0.5);
  const dy = loc.y - (blockLocation.y + 0.5);
  const dz = loc.z - (blockLocation.z + 0.5);
  return dx * dx + dy * dy + dz * dz >= minDistance * minDistance;
}
