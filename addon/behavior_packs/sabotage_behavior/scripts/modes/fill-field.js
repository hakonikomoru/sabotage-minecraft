import { world } from "@minecraft/server";
import { CONFIG } from "../config.js";
import { getModeConfig } from "./mode-config.js";
import {
  forEachInnerCell,
  forEachStructureCell,
  getBlockTypeId,
  setBlockSafe,
} from "../utils/blocks.js";
import { setField, getCurrentMode } from "../state.js";
import {
  buildSkyArena,
  formatArenaSummary,
  getArenaStartLocation,
  teleportPlayerToArenaStart,
} from "./arena.js";

/** Floor blocks that may be overwritten when generating the field (ground mode) */
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
  "minecraft:gray_concrete",
  "minecraft:glass",
  "minecraft:water",
  "minecraft:flowing_water",
]);

/**
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function validateFieldSite(player, modeId = getCurrentMode()) {
  if (CONFIG.arena.enabled) {
    return { ok: true };
  }

  const cfg = getModeConfig(modeId);
  const loc = player.location;
  const originX =
    Math.floor(loc.x) + cfg.fieldOffsetX - cfg.structureSize / 2;
  const originZ =
    Math.floor(loc.z) + cfg.fieldOffsetZ - cfg.structureSize / 2;
  const y = Math.floor(loc.y) - 1;
  const dimension = player.dimension;

  if (y < dimension.heightRange.min + 1 || y > dimension.heightRange.max - 2) {
    return {
      ok: false,
      reason: "Height out of range. Move to another flat area and run start.",
    };
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
      reason: `Cannot overwrite ${blocked} block(s) in field area. Move to a flat area and run start.`,
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

function buildGroundField(player, modeId) {
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

  return {
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
    arena: { enabled: false },
    startPlayerOriginalLocation: null,
  };
}

export function buildField(player, modeId = getCurrentMode()) {
  const field = CONFIG.arena.enabled
    ? buildSkyArena(player, modeId)
    : buildGroundField(player, modeId);

  if (field?.error) {
    return field;
  }

  setField(field);
  return field;
}

/** Restore generated area to original blocks (distribution / testing) */
export function destroyField(field) {
  if (!field?.originalBlocks?.length) {
    return false;
  }

  return restoreFieldVolume(field);
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
    const woolY = blockY + 1;
    if (getBlockTypeId(dimension, { x, y: woolY, z }) === field.targetBlock) {
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
    const woolY = blockY + 1;
    if (getBlockTypeId(dimension, { x, y: woolY, z }) === field.targetBlock) {
      positions.push({ x, y: woolY, z });
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

function buildOriginalBlockMap(originalBlocks) {
  const map = new Map();
  for (const block of originalBlocks) {
    map.set(`${block.x},${block.y},${block.z}`, block.typeId);
  }
  return map;
}

/** Bounds for reset: generated structure plus blocks placed during play (e.g. wool at y+1). */
function getFieldCleanupBounds(field) {
  if (field.arena?.enabled) {
    const arena = field.arena;
    return {
      minX: arena.originX,
      maxX: arena.originX + arena.size - 1,
      minZ: arena.originZ,
      maxZ: arena.originZ + arena.size - 1,
      minY: arena.y,
      maxY: arena.y + arena.wallHeight + 1,
    };
  }

  return {
    minX: field.originX,
    maxX: field.originX + field.structureSize - 1,
    minZ: field.originZ,
    maxZ: field.originZ + field.structureSize - 1,
    minY: field.y,
    maxY: field.y + 1,
  };
}

/** Restore snapshot blocks and clear anything else placed inside the cleanup volume. */
function restoreFieldVolume(field) {
  const dimension = getDimension(field);
  if (!dimension || !field.originalBlocks?.length) {
    return false;
  }

  const originalMap = buildOriginalBlockMap(field.originalBlocks);
  const bounds = getFieldCleanupBounds(field);

  for (let x = bounds.minX; x <= bounds.maxX; x++) {
    for (let z = bounds.minZ; z <= bounds.maxZ; z++) {
      for (let y = bounds.minY; y <= bounds.maxY; y++) {
        const key = `${x},${y},${z}`;
        const typeId = originalMap.get(key) ?? "minecraft:air";
        setBlockSafe(dimension, { x, y, z }, typeId);
      }
    }
  }

  return true;
}

export function getDimensionFromField(field) {
  return getDimension(field);
}

export function teleportToFieldStart(player, field) {
  if (field?.arena?.enabled && CONFIG.arena.teleportPlayerOnStart) {
    teleportPlayerToArenaStart(player, field);
    return;
  }

  const startX = field.originX - 1;
  const startZ = field.originZ + Math.floor(field.size / 2);
  player.teleport({
    x: startX,
    y: field.y + 1,
    z: startZ,
  });
}

export { formatArenaSummary, getArenaStartLocation };
