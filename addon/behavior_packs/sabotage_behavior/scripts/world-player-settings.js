import { system, world, Direction } from "@minecraft/server";
import { CONFIG, GAME_STATES } from "./config.js";
import { getCurrentMode, getField, getGameState } from "./state.js";
import { getBlockTypeId, setBlockSafe } from "./utils/blocks.js";
import { playBlockPlaceSoundForPlayer } from "./utils/block-place-sound.js";
import { isCreativePlayer } from "./utils/players.js";
import {
  getBedrockBoxBlockForLayer,
  getBedrockBoxLayerFromY,
  getBedrockBoxLayerCount,
  isBedrockBoxFillVolume,
} from "./modes/bedrock-box-layers.js";

function getVanillaBlockReach() {
  return CONFIG.world?.vanillaBlockReach ?? 5;
}

function directionOffset(face) {
  switch (face) {
    case Direction.Up:
      return { x: 0, y: 1, z: 0 };
    case Direction.Down:
      return { x: 0, y: -1, z: 0 };
    case Direction.North:
      return { x: 0, y: 0, z: -1 };
    case Direction.South:
      return { x: 0, y: 0, z: 1 };
    case Direction.East:
      return { x: 1, y: 0, z: 0 };
    case Direction.West:
      return { x: -1, y: 0, z: 0 };
    default:
      return null;
  }
}

function isPlaceableBlockItem(typeId) {
  if (!typeId || typeId === "minecraft:air") return false;
  return typeId.endsWith("_block") || typeId.endsWith("_wool");
}

function consumeHeldBlock(player) {
  if (isCreativePlayer(player)) return;

  const container = player.getComponent("inventory")?.container;
  if (!container) return;

  const slot = player.selectedSlotIndex;
  const stack = container.getItem(slot);
  if (!stack) return;

  if (stack.amount > 1) {
    stack.amount -= 1;
    container.setItem(slot, stack);
  } else {
    container.setItem(slot, undefined);
  }
}

/**
 * @param {import("@minecraft/server").Player} player
 * @returns {{ x: number, y: number, z: number, targetBlock: string, distance: number } | null}
 */
function computeExtendedBedrockBoxPlacement(player) {
  if (getGameState() !== GAME_STATES.RUNNING) return null;
  if (getCurrentMode() !== "bedrock_box") return null;

  const field = getField();
  if (!field) return null;

  const held = player
    .getComponent("inventory")
    ?.container?.getItem(player.selectedSlotIndex);
  if (!held || !isPlaceableBlockItem(held.typeId)) return null;

  const maxReach = CONFIG.world?.blockInteractionRange ?? 20;
  const hit = player.getBlockFromViewDirection({ maxDistance: maxReach });
  if (!hit) return null;
  if (hit.distance <= getVanillaBlockReach()) return null;

  const offset = directionOffset(hit.face);
  if (!offset) return null;

  const x = Math.floor(hit.block.location.x) + offset.x;
  const y = Math.floor(hit.block.location.y) + offset.y;
  const z = Math.floor(hit.block.location.z) + offset.z;

  if (!isBedrockBoxFillVolume(field, x, y, z)) return null;

  const layer = getBedrockBoxLayerFromY(field, y);
  if (layer < 1 || layer > getBedrockBoxLayerCount(field)) return null;

  const targetBlock = getBedrockBoxBlockForLayer(layer);
  if (!targetBlock) return null;

  const current = getBlockTypeId(player.dimension, { x, y, z });
  if (current === targetBlock) return null;
  if (
    current &&
    current !== "minecraft:air" &&
    current !== field.baseBlock
  ) {
    return null;
  }

  return { x, y, z, targetBlock, distance: hit.distance };
}

/**
 * @param {import("@minecraft/server").Player} player
 */
function applyExtendedBedrockBoxPlacement(player) {
  const placement = computeExtendedBedrockBoxPlacement(player);
  if (!placement) return false;

  setBlockSafe(player.dimension, placement, placement.targetBlock);
  playBlockPlaceSoundForPlayer(player, placement.targetBlock);
  consumeHeldBlock(player);
  return true;
}

export function registerWorldPlayerSettings() {
  const itemUse = world.afterEvents?.itemUse;
  if (!itemUse) {
    console.warn(
      "[SAB] afterEvents.itemUse unavailable — extended block reach disabled.",
    );
    return;
  }

  itemUse.subscribe((event) => {
    const player = event.source;
    if (!player || player.typeId !== "minecraft:player") return;

    const item = event.itemStack;
    if (!item || !isPlaceableBlockItem(item.typeId)) return;

    system.run(() => {
      applyExtendedBedrockBoxPlacement(player);
    });
  });

  console.warn(
    `[SAB] Extended block reach registered (Bedrock script raycast, max=${CONFIG.world?.blockInteractionRange ?? 20}).`,
  );
}
