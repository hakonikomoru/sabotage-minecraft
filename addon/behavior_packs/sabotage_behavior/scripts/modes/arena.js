import { CONFIG } from "../config.js";
import { getModeConfig } from "./mode-config.js";
import {
  getBlockTypeId,
  setBlockSafe,
  forEachStructureCell,
} from "../utils/blocks.js";

/**
 * @param {import("@minecraft/server").Player} player
 * @param {string} modeId
 */
export function computeArenaLayout(player, modeId) {
  const arena = CONFIG.arena;
  const cfg = getModeConfig(modeId);
  const baseX = Math.floor(player.location.x);
  const baseZ = Math.floor(player.location.z);
  const arenaY = Math.floor(player.location.y) + arena.yOffset;
  const halfArena = Math.floor(arena.size / 2);
  const halfStructure = Math.floor(cfg.structureSize / 2);

  return {
    baseX,
    baseZ,
    arenaY,
    arenaOriginX: baseX - halfArena,
    arenaOriginZ: baseZ - halfArena,
    fieldOriginX: baseX - halfStructure,
    fieldOriginZ: baseZ - halfStructure,
    fieldY: arenaY,
    arenaSize: arena.size,
    structureSize: cfg.structureSize,
  };
}

/**
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {ReturnType<typeof computeArenaLayout>} layout
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function validateArenaHeight(dimension, layout) {
  const { min, max } = dimension.heightRange;
  const wallTop = layout.arenaY + CONFIG.arena.wallHeight;

  if (
    layout.arenaY < min + 4 ||
    wallTop > max - 2
  ) {
    return {
      ok: false,
      reason:
        "Arena height out of range. Move lower and run start again.",
    };
  }

  return { ok: true };
}

function forEachArenaFloorCell(layout, callback) {
  for (let dx = 0; dx < layout.arenaSize; dx++) {
    for (let dz = 0; dz < layout.arenaSize; dz++) {
      callback(
        layout.arenaOriginX + dx,
        layout.arenaY,
        layout.arenaOriginZ + dz,
      );
    }
  }
}

function isArenaPerimeter(layout, x, z) {
  return (
    x === layout.arenaOriginX ||
    x === layout.arenaOriginX + layout.arenaSize - 1 ||
    z === layout.arenaOriginZ ||
    z === layout.arenaOriginZ + layout.arenaSize - 1
  );
}

function captureArenaVolume(dimension, layout) {
  const blocks = [];
  const wallHeight = CONFIG.arena.wallHeight;
  const seen = new Set();

  const addBlock = (x, y, z) => {
    const key = `${x},${y},${z}`;
    if (seen.has(key)) return;
    seen.add(key);
    blocks.push({
      x,
      y,
      z,
      typeId: getBlockTypeId(dimension, { x, y, z }) ?? "minecraft:air",
    });
  };

  forEachArenaFloorCell(layout, (x, y, z) => addBlock(x, y, z));

  for (let h = 1; h <= wallHeight; h++) {
    forEachArenaFloorCell(layout, (x, _y, z) => {
      if (isArenaPerimeter(layout, x, z)) {
        addBlock(x, layout.arenaY + h, z);
      }
    });
  }

  return blocks;
}

function buildArenaFloor(dimension, layout) {
  const floorBlock = CONFIG.arena.floorBlock;
  forEachArenaFloorCell(layout, (x, y, z) => {
    setBlockSafe(dimension, { x, y, z }, floorBlock);
  });
}

function buildArenaWalls(dimension, layout) {
  const wallBlock = CONFIG.arena.wallBlock;
  const wallHeight = CONFIG.arena.wallHeight;

  for (let h = 1; h <= wallHeight; h++) {
    forEachArenaFloorCell(layout, (x, y, z) => {
      if (isArenaPerimeter(layout, x, z)) {
        setBlockSafe(dimension, { x, y: y + h, z }, wallBlock);
      }
    });
  }
}

function buildFieldStructure(dimension, layout, modeId) {
  const cfg = getModeConfig(modeId);
  const field = {
    originX: layout.fieldOriginX,
    originZ: layout.fieldOriginZ,
    y: layout.fieldY,
    structureSize: cfg.structureSize,
    size: cfg.size,
  };

  forEachStructureCell(field, (x, _y, z) => {
    const isBorder =
      x === field.originX ||
      z === field.originZ ||
      x === field.originX + field.structureSize - 1 ||
      z === field.originZ + field.structureSize - 1;
    setBlockSafe(
      dimension,
      { x, y: field.y, z },
      isBorder ? cfg.borderBlock : cfg.baseBlock,
    );
  });
}

/**
 * @param {import("@minecraft/server").Player} player
 * @param {string} modeId
 */
export function buildSkyArena(player, modeId) {
  const cfg = getModeConfig(modeId);
  const dimension = player.dimension;
  const layout = computeArenaLayout(player, modeId);
  const heightCheck = validateArenaHeight(dimension, layout);

  if (!heightCheck.ok) {
    return { error: heightCheck.reason };
  }

  const originalBlocks = captureArenaVolume(dimension, layout);

  buildArenaFloor(dimension, layout);
  buildFieldStructure(dimension, layout, modeId);
  buildArenaWalls(dimension, layout);

  const startPlayerOriginalLocation = {
    x: player.location.x,
    y: player.location.y,
    z: player.location.z,
    dimensionId: dimension.id,
  };

  const field = {
    originX: layout.fieldOriginX,
    originZ: layout.fieldOriginZ,
    y: layout.fieldY,
    structureSize: cfg.structureSize,
    dimensionId: dimension.id,
    modeId,
    size: cfg.size,
    targetBlock: cfg.targetBlock,
    baseBlock: cfg.baseBlock,
    borderBlock: cfg.borderBlock,
    originalBlocks,
    arena: {
      enabled: true,
      originX: layout.arenaOriginX,
      originZ: layout.arenaOriginZ,
      y: layout.arenaY,
      size: layout.arenaSize,
      wallHeight: CONFIG.arena.wallHeight,
    },
    startPlayerOriginalLocation,
  };

  return field;
}

export function getArenaStartLocation(field) {
  const startX = field.originX - 2;
  const startY = field.y + 2;
  const startZ = field.originZ + Math.floor(field.structureSize / 2);
  const lookX = field.originX + field.structureSize / 2;
  const lookZ = field.originZ + field.structureSize / 2;
  const lookY = field.y + 1;

  const dx = lookX - startX;
  const dz = lookZ - startZ;
  const yaw = (Math.atan2(-dx, dz) * 180) / Math.PI;

  return {
    x: startX,
    y: startY,
    z: startZ,
    rotation: { x: 0, y: yaw },
  };
}

/**
 * @param {import("@minecraft/server").Player} player
 * @param {object} field
 */
export function teleportPlayerToArenaStart(player, field) {
  const start = getArenaStartLocation(field);
  player.teleport(
    { x: start.x, y: start.y, z: start.z },
    {
      dimension: player.dimension,
      rotation: start.rotation,
    },
  );
}

export function formatArenaSummary(field) {
  if (!field?.arena?.enabled) {
    return null;
  }
  return `${field.arena.size}x${field.arena.size} at Y=${field.arena.y}`;
}
