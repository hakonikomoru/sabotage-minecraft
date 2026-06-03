import { world } from "@minecraft/server";
import { getModeConfig } from "./mode-config.js";
import {
  forEachInnerCell,
  forEachStructureCell,
  getBlockTypeId,
  setBlockSafe,
} from "../utils/blocks.js";
import { setField, getCurrentMode } from "../state.js";

/** フィールド生成を許可する床ブロック（上書きしてよい） */
const REPLACEABLE_FLOOR = new Set([
  "minecraft:air",
  "minecraft:grass_block",
  "minecraft:dirt",
  "minecraft:stone",
  "minecraft:sand",
  "minecraft:gravel",
  "minecraft:deepslate",
  "minecraft:tuff",
  "minecraft:black_concrete",
  "minecraft:yellow_concrete",
  "minecraft:white_wool",
  "minecraft:water",
  "minecraft:flowing_water",
]);

/**
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function validateFieldSite(player, modeId = getCurrentMode()) {
  const cfg = getModeConfig(modeId);
  const loc = player.location;
  const originX =
    Math.floor(loc.x) + cfg.fieldOffsetX - cfg.structureSize / 2;
  const originZ =
    Math.floor(loc.z) + cfg.fieldOffsetZ - cfg.structureSize / 2;
  const y = Math.floor(loc.y) - 1;
  const dimension = player.dimension;

  if (y < dimension.heightRange.min + 1 || y > dimension.heightRange.max - 2) {
    return { ok: false, reason: "高さが生成可能範囲外です。別の場所で !sab start してください" };
  }

  let blocked = 0;
  forEachStructureCell(
    { originX, originZ, y, structureSize: cfg.structureSize },
    (x, blockY, z) => {
      const typeId = getBlockTypeId(dimension, { x, y: blockY, z });
      if (typeId && !REPLACEABLE_FLOOR.has(typeId)) {
        blocked += 1;
      }
    },
  );

  if (blocked > 0) {
    return {
      ok: false,
      reason: `生成範囲に上書きできないブロックが ${blocked} 個あります。平坦な場所で !sab start してください`,
    };
  }

  return { ok: true };
}

function captureOriginalBlocks(dimension, originX, originZ, y, structureSize) {
  const blocks = [];
  forEachStructureCell({ originX, originZ, y, structureSize }, (x, blockY, z) => {
    blocks.push({
      x,
      y: blockY,
      z,
      typeId: getBlockTypeId(dimension, { x, y: blockY, z }) ?? "minecraft:air",
    });
  });
  return blocks;
}

export function buildField(player, modeId = getCurrentMode()) {
  const cfg = getModeConfig(modeId);
  const validation = validateFieldSite(player, modeId);
  if (!validation.ok) {
    return { error: validation.reason };
  }

  const loc = player.location;
  const originX =
    Math.floor(loc.x) + cfg.fieldOffsetX - cfg.structureSize / 2;
  const originZ =
    Math.floor(loc.z) + cfg.fieldOffsetZ - cfg.structureSize / 2;
  const y = Math.floor(loc.y) - 1;
  const dimension = player.dimension;

  const originalBlocks = captureOriginalBlocks(
    dimension,
    originX,
    originZ,
    y,
    cfg.structureSize,
  );

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
    structureSize: cfg.structureSize,
    dimensionId: dimension.id,
    modeId,
    size: cfg.size,
    targetBlock: cfg.targetBlock,
    baseBlock: cfg.baseBlock,
    borderBlock: cfg.borderBlock,
    originalBlocks,
  };
  setField(field);
  return field;
}

/** 生成範囲を元のブロック状態に戻す（配布・テスト向け） */
export function destroyField(field) {
  if (!field?.originalBlocks?.length) {
    return false;
  }
  const dimension = getDimension(field);
  if (!dimension) return false;

  for (const block of field.originalBlocks) {
    setBlockSafe(dimension, { x: block.x, y: block.y, z: block.z }, block.typeId);
  }
  return true;
}

export function resetFieldToBase(field) {
  if (!field) return;
  const dimension = getDimension(field);
  if (!dimension) return;
  forEachInnerCell(field, (x, blockY, z) => {
    setBlockSafe(dimension, { x, y: blockY, z }, field.baseBlock);
  });
}

export function countWhiteWool(field) {
  if (!field) return 0;
  const dimension = getDimension(field);
  if (!dimension) return 0;
  let count = 0;
  forEachInnerCell(field, (x, blockY, z) => {
    if (getBlockTypeId(dimension, { x, y: blockY, z }) === field.targetBlock) {
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
  forEachInnerCell(field, (x, blockY, z) => {
    if (getBlockTypeId(dimension, { x, y: blockY, z }) === field.targetBlock) {
      positions.push({ x, y: blockY, z });
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
