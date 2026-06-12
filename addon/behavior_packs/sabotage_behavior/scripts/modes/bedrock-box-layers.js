import { system, world } from "@minecraft/server";
import { CONFIG, GAME_STATES } from "../config.js";
import { getCurrentMode, getField, getGameState } from "../state.js";
import { isInnerFieldCoord, setBlockSafe } from "../utils/blocks.js";
import {
  playBlockPlaceSoundForPlayer,
  shouldPlayRemotePlaceSound,
} from "../utils/block-place-sound.js";

/** @typedef {{ minLayer: number, maxLayer: number, block: string }} BedrockBoxLayerTier */

const DEFAULT_LAYER_TIERS = [
  { minLayer: 1, maxLayer: 3, block: "minecraft:iron_block" },
  { minLayer: 4, maxLayer: 6, block: "minecraft:gold_block" },
  { minLayer: 7, maxLayer: 9, block: "minecraft:diamond_block" },
];

export const BEDROCK_BOX_FILL_BLOCKS = new Set(
  DEFAULT_LAYER_TIERS.map((tier) => tier.block),
);

function getLayerTiers() {
  return CONFIG.bedrockBox?.layerTiers ?? DEFAULT_LAYER_TIERS;
}

export function getBedrockBoxLayerCount(field) {
  return field?.arena?.wallHeight ?? CONFIG.bedrockBox.wallHeight ?? 9;
}

/** Layer 1 = first block above the field floor (field.y + 1). */
export function getBedrockBoxLayerFromY(field, y) {
  return Math.floor(y) - field.y;
}

export function getBedrockBoxBlockForLayer(layer) {
  for (const tier of getLayerTiers()) {
    if (layer >= tier.minLayer && layer <= tier.maxLayer) {
      return tier.block;
    }
  }
  return null;
}

export function isBedrockBoxFillBlockType(typeId) {
  if (!typeId || typeId === "minecraft:air") return false;
  const tiers = getLayerTiers();
  return tiers.some((tier) => tier.block === typeId);
}

export function isBedrockBoxFillVolume(field, x, y, z) {
  if (!field || field.modeId !== "bedrock_box") return false;
  if (!isInnerFieldCoord(field, Math.floor(x), Math.floor(z))) return false;
  const layer = getBedrockBoxLayerFromY(field, Math.floor(y));
  return layer >= 1 && layer <= getBedrockBoxLayerCount(field);
}

/** Iterate inner (x,z) columns across vertical fill layers 1..wallHeight. */
export function forEachBedrockBoxFillCell(field, callback) {
  const maxLayer = getBedrockBoxLayerCount(field);
  const size = field.size ?? CONFIG.bedrockBox?.size ?? 11;
  for (let dx = 1; dx <= size; dx++) {
    for (let dz = 1; dz <= size; dz++) {
      const x = field.originX + dx;
      const z = field.originZ + dz;
      for (let layer = 1; layer <= maxLayer; layer++) {
        callback(x, field.y + layer, z);
      }
    }
  }
}

function isBedrockBoxInnerColumn(field, x, z) {
  return isInnerFieldCoord(field, Math.floor(x), Math.floor(z));
}

function handleBedrockBoxPlace(event) {
  if (getGameState() !== GAME_STATES.RUNNING) return;
  if (getCurrentMode() !== "bedrock_box") return;

  const field = getField();
  if (!field) return;

  const block = event.block;
  if (!block) return;

  const x = Math.floor(block.location.x);
  const y = Math.floor(block.location.y);
  const z = Math.floor(block.location.z);

  if (!isBedrockBoxInnerColumn(field, x, z)) return;

  const layer = getBedrockBoxLayerFromY(field, y);
  const maxLayer = getBedrockBoxLayerCount(field);
  const dimension = block.dimension;

  if (layer > maxLayer) {
    system.run(() => {
      setBlockSafe(dimension, { x, y, z }, "minecraft:air");
    });
    return;
  }

  if (layer < 1) return;

  const targetBlock = getBedrockBoxBlockForLayer(layer);
  if (!targetBlock || block.typeId === targetBlock) return;

  const player = event.player;
  system.run(() => {
    setBlockSafe(dimension, { x, y, z }, targetBlock);
    if (
      player &&
      shouldPlayRemotePlaceSound(player, { x, y, z })
    ) {
      playBlockPlaceSoundForPlayer(player, targetBlock);
    }
  });
}

function handleBedrockBoxPlaceBefore(event) {
  if (getGameState() !== GAME_STATES.RUNNING) return;
  if (getCurrentMode() !== "bedrock_box") return;

  const field = getField();
  if (!field) return;

  const block = event.block;
  if (!block) return;

  const x = Math.floor(block.location.x);
  const y = Math.floor(block.location.y);
  const z = Math.floor(block.location.z);

  if (!isBedrockBoxInnerColumn(field, x, z)) return;

  const layer = getBedrockBoxLayerFromY(field, y);
  if (layer > getBedrockBoxLayerCount(field)) {
    event.cancel = true;
  }
}

export function registerBedrockBoxPlaceHandler() {
  const beforePlace = world.beforeEvents?.playerPlaceBlock;
  if (beforePlace) {
    beforePlace.subscribe(handleBedrockBoxPlaceBefore);
  }

  const placeEvent = world.afterEvents?.playerPlaceBlock;
  if (!placeEvent) {
    console.warn(
      "[SAB] playerPlaceBlock is not available — BedrockBox layer transform disabled.",
    );
    return;
  }

  placeEvent.subscribe(handleBedrockBoxPlace);
  console.warn("[SAB] BedrockBox layer transform registered.");
}
