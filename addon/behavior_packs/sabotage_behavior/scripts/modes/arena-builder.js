import { world } from "@minecraft/server";
import {
  getBlockTypeId,
  setBlockSafe,
  forEachStructureCell,
} from "../utils/blocks.js";

/**
 * @param {import("@minecraft/server").Player} player
 * @param {{ yOffset: number, arenaSize: number }} arenaConfig
 * @param {{ structureSize: number }} modeConfig
 */
export function computeBoxLayout(player, arenaConfig, modeConfig) {
  const baseX = Math.floor(player.location.x);
  const baseZ = Math.floor(player.location.z);
  const arenaY = Math.floor(player.location.y) + arenaConfig.yOffset;
  const halfArena = Math.floor(arenaConfig.arenaSize / 2);
  const halfStructure = Math.floor(modeConfig.structureSize / 2);

  return {
    baseX,
    baseZ,
    arenaY,
    arenaOriginX: baseX - halfArena,
    arenaOriginZ: baseZ - halfArena,
    fieldOriginX: baseX - halfStructure,
    fieldOriginZ: baseZ - halfStructure,
    fieldY: arenaY,
    arenaSize: arenaConfig.arenaSize,
    structureSize: modeConfig.structureSize,
  };
}

/**
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {ReturnType<typeof computeBoxLayout>} layout
 * @param {number} wallHeight
 * @param {string} [errorPrefix]
 */
export function validateBoxHeight(
  dimension,
  layout,
  wallHeight,
  errorPrefix = "Box generation failed",
) {
  const { min, max } = dimension.heightRange;
  const wallTop = layout.arenaY + wallHeight;

  if (layout.arenaY < min + 4 || wallTop > max - 2) {
    return {
      ok: false,
      reason: `${errorPrefix}: height out of range.`,
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

export function captureBoxVolume(dimension, layout, wallHeight) {
  const blocks = [];
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

export function buildBoxFloor(dimension, layout, floorBlock) {
  forEachArenaFloorCell(layout, (x, y, z) => {
    setBlockSafe(dimension, { x, y, z }, floorBlock);
  });
}

export function buildBoxWalls(dimension, layout, wallBlock, wallHeight) {
  for (let h = 1; h <= wallHeight; h++) {
    forEachArenaFloorCell(layout, (x, y, z) => {
      if (isArenaPerimeter(layout, x, z)) {
        setBlockSafe(dimension, { x, y: y + h, z }, wallBlock);
      }
    });
  }
}

export function buildFieldStructure(dimension, layout, modeConfig) {
  const field = {
    originX: layout.fieldOriginX,
    originZ: layout.fieldOriginZ,
    y: layout.fieldY,
    structureSize: layout.structureSize,
    size: modeConfig.size,
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
      isBorder ? modeConfig.borderBlock : modeConfig.baseBlock,
    );
  });
}

export function getBoxStartLocation(field) {
  const compactBox =
    field.arena?.kind === "bedrock_box" ||
    (field.arena?.enabled && field.arena.size <= field.structureSize + 1);
  const startX = compactBox ? field.originX + 1 : field.originX - 2;
  const startY = field.y + 2;
  const startZ = field.originZ + Math.floor(field.structureSize / 2);
  const lookX = field.originX + Math.floor(field.structureSize / 2);
  const lookZ = field.originZ + Math.floor(field.structureSize / 2);
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
export function teleportPlayerToBoxStart(player, field) {
  const start = getBoxStartLocation(field);
  let dimension = player.dimension;
  try {
    dimension = world.getDimension(field.dimensionId);
  } catch {
    // keep player.dimension
  }
  player.teleport(
    { x: start.x, y: start.y, z: start.z },
    {
      dimension,
      rotation: start.rotation,
    },
  );
}

export function formatBoxSummary(field) {
  if (!field?.arena?.enabled) {
    return null;
  }
  return `${field.arena.size}x${field.arena.size} at Y=${field.arena.y}`;
}
