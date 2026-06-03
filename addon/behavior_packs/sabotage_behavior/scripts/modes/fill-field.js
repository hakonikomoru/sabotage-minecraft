import { world } from "@minecraft/server";
import { getModeConfig } from "./mode-config.js";
import { forEachInnerCell, getBlockTypeId, setBlockSafe } from "../utils/blocks.js";
import { setField, getCurrentMode } from "../state.js";

export function buildField(player, modeId = getCurrentMode()) {
  const cfg = getModeConfig(modeId);
  const loc = player.location;
  const originX =
    Math.floor(loc.x) + cfg.fieldOffsetX - cfg.structureSize / 2;
  const originZ =
    Math.floor(loc.z) + cfg.fieldOffsetZ - cfg.structureSize / 2;
  const y = Math.floor(loc.y) - 1;
  const dimension = player.dimension;

  for (let dx = 0; dx < cfg.structureSize; dx++) {
    for (let dz = 0; dz < cfg.structureSize; dz++) {
      const x = originX + dx;
      const z = originZ + dz;
      const isBorder =
        dx === 0 ||
        dz === 0 ||
        dx === cfg.structureSize - 1 ||
        dz === cfg.structureSize - 1;
      setBlockSafe(
        dimension,
        { x, y, z },
        isBorder ? cfg.borderBlock : cfg.baseBlock,
      );
    }
  }

  const field = {
    originX,
    originZ,
    y,
    dimensionId: dimension.id,
    modeId,
    size: cfg.size,
    targetBlock: cfg.targetBlock,
    baseBlock: cfg.baseBlock,
  };
  setField(field);
  return field;
}

export function resetFieldToBase(field) {
  if (!field) return;
  const dimension = getDimension(field);
  if (!dimension) return;
  forEachInnerCell(field, (x, y, z) => {
    setBlockSafe(dimension, { x, y, z }, field.baseBlock);
  });
}

export function countWhiteWool(field) {
  if (!field) return 0;
  const dimension = getDimension(field);
  if (!dimension) return 0;
  let count = 0;
  forEachInnerCell(field, (x, y, z) => {
    if (getBlockTypeId(dimension, { x, y, z }) === field.targetBlock) {
      count += 1;
    }
  });
  return count;
}

/** @deprecated use countWhiteWool */
export const countPlacedWool = countWhiteWool;

export function getWoolPositions(field) {
  const positions = [];
  if (!field) return positions;
  const dimension = getDimension(field);
  if (!dimension) return positions;
  forEachInnerCell(field, (x, y, z) => {
    if (getBlockTypeId(dimension, { x, y, z }) === field.targetBlock) {
      positions.push({ x, y, z });
    }
  });
  return positions;
}

function getDimension(field) {
  try {
    return world.getDimension(field.dimensionId);
  } catch {
    return null;
  }
}

export function getDimensionFromField(field) {
  return getDimension(field);
}

export function teleportToFieldStart(player, field) {
  const startX = field.originX - 1;
  const startZ = field.originZ + Math.floor(field.size / 2);
  player.teleport({
    x: startX,
    y: field.y + 1,
    z: startZ,
  });
}
