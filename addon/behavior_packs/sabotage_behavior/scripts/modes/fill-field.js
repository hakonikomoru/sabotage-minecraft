import { world } from "@minecraft/server";
import { CONFIG } from "../config.js";
import { getModeConfig } from "./mode-config.js";
import {
  forEachInnerCell,
  forEachStructureCell,
  getBlockTypeId,
  setBlockSafe,
} from "../utils/blocks.js";
import {
  setField,
  getField,
  getCurrentMode,
  setCurrentMode,
} from "../state.js";
import {
  buildSkyArena,
  formatArenaSummary,
  getArenaStartLocation,
  teleportPlayerToArenaStart,
} from "./arena.js";
import {
  buildBedrockBoxArena,
  formatBedrockBoxSummary,
  teleportPlayerToBedrockBox,
} from "./bedrock-box.js";
import {
  forEachBedrockBoxFillCell,
  isBedrockBoxFillBlockType,
} from "./bedrock-box-layers.js";
import {
  persistBedrockBoxField,
  loadPersistedBedrockBoxField,
  hasPersistedBedrockBoxMeta,
} from "./field-persistence.js";

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
    acceptAnyFillBlock: cfg.acceptAnyFillBlock ?? false,
    baseBlock: cfg.baseBlock,
    borderBlock: cfg.borderBlock,
    originalBlocks,
    arena: { enabled: false },
    startPlayerOriginalLocation: null,
  };
}

export function resetFieldToBase(field) {
  if (!field) return;
  const dimension = getDimension(field);
  if (!dimension) return;
  forEachInnerCell(field, (x, blockY, z) => {
    setBlockSafe(dimension, { x, y: blockY, z }, field.baseBlock);
  });
}

function isPlacedFillBlock(field, typeId) {
  if (!typeId || typeId === "minecraft:air") return false;
  if (field.modeId === "bedrock_box") {
    return isBedrockBoxFillBlockType(typeId);
  }
  if (field.acceptAnyFillBlock) {
    return typeId !== field.baseBlock;
  }
  return typeId === field.targetBlock;
}

function forEachFillCell(field, callback) {
  if (field.modeId === "bedrock_box") {
    forEachBedrockBoxFillCell(field, callback);
    return;
  }
  forEachInnerCell(field, (x, blockY, z) => {
    callback(x, blockY + 1, z);
  });
}

function clearPlacedFillBlocks(field) {
  const dimension = getDimension(field);
  if (!dimension) return;
  forEachFillCell(field, (x, y, z) => {
    const typeId = getBlockTypeId(dimension, { x, y, z });
    if (isPlacedFillBlock(field, typeId)) {
      setBlockSafe(dimension, { x, y, z }, "minecraft:air");
    }
  });
}

export function isFieldStructurePresent(field) {
  const dimension = getDimension(field);
  if (!dimension) return false;

  const border = getBlockTypeId(dimension, {
    x: field.originX,
    y: field.y,
    z: field.originZ,
  });
  if (border !== field.borderBlock) return false;

  if (field.arena?.enabled) {
    const wallBlock = getBlockTypeId(dimension, {
      x: field.arena.originX,
      y: field.arena.y + 1,
      z: field.arena.originZ,
    });
    const expectedWall =
      field.modeId === "bedrock_box"
        ? CONFIG.bedrockBox.wallBlock
        : CONFIG.arena.wallBlock;
    return wallBlock === expectedWall;
  }

  const base = getBlockTypeId(dimension, {
    x: field.originX + 1,
    y: field.y,
    z: field.originZ + 1,
  });
  return base === field.baseBlock;
}

function isBedrockBoxStructureLikelyPresent(field) {
  if (!field?.arena?.enabled || field.modeId !== "bedrock_box") return false;

  const dimension = getDimension(field);
  if (!dimension) return false;

  const innerFloor = getBlockTypeId(dimension, {
    x: field.originX + 1,
    y: field.y,
    z: field.originZ + 1,
  });
  const floorOk =
    innerFloor === field.baseBlock ||
    innerFloor === CONFIG.bedrockBox.floorBlock;
  if (!floorOk) return false;

  const expectedWall = CONFIG.bedrockBox.wallBlock;
  const mid = Math.floor((field.arena.size ?? CONFIG.bedrockBox.arenaSize) / 2);
  const wallSamples = [
    {
      x: field.arena.originX,
      y: field.arena.y + 1,
      z: field.arena.originZ + mid,
    },
    {
      x: field.arena.originX + mid,
      y: field.arena.y + 1,
      z: field.arena.originZ,
    },
    {
      x: field.arena.originX + (field.arena.size ?? 1) - 1,
      y: field.arena.y + 1,
      z: field.arena.originZ + mid,
    },
  ];

  return wallSamples.some(
    (location) => getBlockTypeId(dimension, location) === expectedWall,
  );
}

export function isBedrockBoxPresent(field) {
  if (!field || field.modeId !== "bedrock_box") return false;
  return (
    isFieldStructurePresent(field) || isBedrockBoxStructureLikelyPresent(field)
  );
}

export function canReuseField(field, modeId = getCurrentMode()) {
  if (!field || field.modeId !== modeId) return false;
  if (modeId === "bedrock_box") {
    return isBedrockBoxPresent(field);
  }
  if (!field.originalBlocks?.length) return false;
  return isFieldStructurePresent(field);
}

export function prepareFieldForReuse(field) {
  resetFieldToBase(field);
  clearPlacedFillBlocks(field);
  return field;
}

function getBedrockBoxCenter(field) {
  const structureSize = field.structureSize ?? 13;
  return {
    x: field.originX + structureSize / 2,
    y: field.y + 1,
    z: field.originZ + structureSize / 2,
  };
}

/** True when a player is close enough that block reads at the box are reliable. */
function isBedrockBoxChunksLikelyLoaded(field) {
  const center = getBedrockBoxCenter(field);
  const loadRadius = 96;

  for (const player of world.getAllPlayers()) {
    if (player.dimension.id !== field.dimensionId) continue;
    const dx = player.location.x - center.x;
    const dy = player.location.y - center.y;
    const dz = player.location.z - center.z;
    if (dx * dx + dy * dy + dz * dz <= loadRadius * loadRadius) {
      return true;
    }
  }

  return world.getAllPlayers().length === 0;
}

function findBedrockBoxFieldCandidate() {
  const inMemory = getField();
  if (inMemory?.modeId === "bedrock_box") {
    return inMemory;
  }
  return loadPersistedBedrockBoxField();
}

function resolveReusableBedrockBoxField() {
  const candidate = findBedrockBoxFieldCandidate();
  if (!candidate) return null;

  if (isBedrockBoxPresent(candidate)) {
    return candidate;
  }

  if (!isBedrockBoxChunksLikelyLoaded(candidate)) {
    return candidate;
  }

  return null;
}

export function restorePersistedBedrockBoxField() {
  if (!hasPersistedBedrockBoxMeta()) return false;

  const field = loadPersistedBedrockBoxField();
  if (!field) return false;

  setField(field);
  setCurrentMode("bedrock_box");

  if (isBedrockBoxPresent(field)) {
    console.warn("[SAB] Restored persisted BedrockBox (structure verified).");
    return true;
  }

  if (isBedrockBoxChunksLikelyLoaded(field)) {
    console.warn(
      "[SAB] Persisted BedrockBox loaded but structure not found nearby.",
    );
    return true;
  }

  console.warn(
    "[SAB] Restored BedrockBox coordinates (box area not loaded yet).",
  );
  return true;
}

export function buildField(player, modeId = getCurrentMode()) {
  if (modeId === "bedrock_box") {
    const existing = resolveReusableBedrockBoxField();
    if (existing) {
      const cfg = getModeConfig(modeId);
      existing.acceptAnyFillBlock = cfg.acceptAnyFillBlock ?? false;
      prepareFieldForReuse(existing);
      existing.reused = true;
      setField(existing);
      persistBedrockBoxField(existing);
      return existing;
    }

    const stale = findBedrockBoxFieldCandidate();
    if (stale) {
      return {
        error:
          "Existing BedrockBox data found but the structure is missing or damaged. Use menu 箱を削除 first.",
      };
    }
  } else {
    const existing = getField();
    if (existing?.originalBlocks?.length && isFieldStructurePresent(existing)) {
      if (existing.modeId === modeId) {
        const cfg = getModeConfig(modeId);
        existing.acceptAnyFillBlock = cfg.acceptAnyFillBlock ?? false;
        prepareFieldForReuse(existing);
        existing.reused = true;
        setField(existing);
        return existing;
      }
      return {
        error: "Field already exists. Run reset before starting another mode.",
      };
    }
  }

  let field;
  if (modeId === "bedrock_box") {
    field = buildBedrockBoxArena(player, modeId);
  } else if (CONFIG.arena.enabled) {
    field = buildSkyArena(player, modeId);
  } else {
    field = buildGroundField(player, modeId);
  }

  if (field?.error) {
    return field;
  }

  field.reused = false;
  setField(field);
  if (modeId === "bedrock_box") {
    persistBedrockBoxField(field);
  }
  return field;
}

/** Restore generated area to original blocks (distribution / testing) */
export function destroyField(field) {
  if (!field?.originalBlocks?.length) {
    return false;
  }

  return restoreFieldVolume(field);
}

export function countWhiteWool(field) {
  if (!field) return 0;
  const dimension = getDimension(field);
  if (!dimension) return 0;
  let count = 0;
  forEachFillCell(field, (x, y, z) => {
    if (isPlacedFillBlock(field, getBlockTypeId(dimension, { x, y, z }))) {
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
  forEachFillCell(field, (x, y, z) => {
    if (isPlacedFillBlock(field, getBlockTypeId(dimension, { x, y, z }))) {
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
  if (field?.modeId === "bedrock_box" && CONFIG.bedrockBox.teleportPlayerOnStart) {
    teleportPlayerToBedrockBox(player, field);
    return;
  }

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

export function formatFieldArenaSummary(field) {
  if (field?.modeId === "bedrock_box") {
    return formatBedrockBoxSummary(field);
  }
  return formatArenaSummary(field);
}

export { formatArenaSummary, getArenaStartLocation };
