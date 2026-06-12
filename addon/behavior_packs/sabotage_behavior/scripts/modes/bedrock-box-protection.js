import { system, world } from "@minecraft/server";
import { CONFIG } from "../config.js";
import {
  getCurrentMode,
  getField,
  isBedrockBoxStructureEditEnabled,
} from "../state.js";
import { isInnerFieldCoord, setBlockSafe } from "../utils/blocks.js";
import {
  getBedrockBoxLayerCount,
  getBedrockBoxLayerFromY,
  isBedrockBoxFillBlockType,
} from "./bedrock-box-layers.js";

function isBedrockBoxProtectionEnabled() {
  if (CONFIG.bedrockBox?.protectStructure === false) {
    return false;
  }
  if (isBedrockBoxStructureEditEnabled()) {
    return false;
  }
  const field = getField();
  return (
    getCurrentMode() === "bedrock_box" &&
    field?.modeId === "bedrock_box" &&
    field?.arena?.enabled === true
  );
}

function isArenaPerimeter(field, x, z) {
  const arena = field.arena;
  if (!arena) return false;
  return (
    x === arena.originX ||
    x === arena.originX + arena.size - 1 ||
    z === arena.originZ ||
    z === arena.originZ + arena.size - 1
  );
}

function isInArenaBounds(field, x, z) {
  const arena = field.arena;
  if (!arena) return false;
  return (
    x >= arena.originX &&
    x <= arena.originX + arena.size - 1 &&
    z >= arena.originZ &&
    z <= arena.originZ + arena.size - 1
  );
}

function isStructureBorderCell(field, x, z) {
  const structureSize = field.structureSize ?? 13;
  const dx = x - field.originX;
  const dz = z - field.originZ;
  if (dx < 0 || dz < 0 || dx >= structureSize || dz >= structureSize) {
    return false;
  }
  return (
    dx === 0 ||
    dz === 0 ||
    dx === structureSize - 1 ||
    dz === structureSize - 1
  );
}

/** Player-placed fill (iron/gold/diamond) may be broken or exploded. */
export function isBedrockBoxFillCell(field, x, y, z) {
  if (!isInnerFieldCoord(field, x, z)) return false;
  const layer = getBedrockBoxLayerFromY(field, y);
  return layer >= 1 && layer <= getBedrockBoxLayerCount(field);
}

export function isBedrockBoxProtectedBlock(field, x, y, z, typeId = null) {
  if (!field?.arena?.enabled || field.modeId !== "bedrock_box") {
    return false;
  }

  const bx = Math.floor(x);
  const by = Math.floor(y);
  const bz = Math.floor(z);

  if (isBedrockBoxFillCell(field, bx, by, bz)) {
    if (typeId && isBedrockBoxFillBlockType(typeId)) {
      return false;
    }
    if (!typeId) {
      return false;
    }
  }

  if (!isInArenaBounds(field, bx, bz)) {
    return false;
  }

  const arena = field.arena;

  if (by === arena.y) {
    return true;
  }

  if (
    by >= arena.y + 1 &&
    by <= arena.y + arena.wallHeight &&
    isArenaPerimeter(field, bx, bz)
  ) {
    return true;
  }

  if (by === field.y && isInArenaBounds(field, bx, bz)) {
    const structureSize = field.structureSize ?? 13;
    const dx = bx - field.originX;
    const dz = bz - field.originZ;
    if (dx >= 0 && dz >= 0 && dx < structureSize && dz < structureSize) {
      return true;
    }
  }

  return false;
}

export function getBedrockBoxStructureBlockType(field, x, y, z) {
  const bx = Math.floor(x);
  const by = Math.floor(y);
  const bz = Math.floor(z);
  const arena = field.arena;
  if (!arena) return null;

  if (by === arena.y) {
    return CONFIG.bedrockBox.floorBlock;
  }

  if (
    by >= arena.y + 1 &&
    by <= arena.y + arena.wallHeight &&
    isArenaPerimeter(field, bx, bz)
  ) {
    return CONFIG.bedrockBox.wallBlock;
  }

  if (by === field.y) {
    return isStructureBorderCell(field, bx, bz)
      ? field.borderBlock
      : field.baseBlock;
  }

  return null;
}

function restoreProtectedBlock(dimension, field, x, y, z) {
  const restoreType = getBedrockBoxStructureBlockType(field, x, y, z);
  if (!restoreType) return;
  setBlockSafe(dimension, { x, y, z }, restoreType);
}

function handleBreakBefore(event) {
  if (!isBedrockBoxProtectionEnabled()) return;

  const field = getField();
  if (!field) return;

  const block = event.block;
  if (!block) return;

  const x = Math.floor(block.location.x);
  const y = Math.floor(block.location.y);
  const z = Math.floor(block.location.z);

  if (isBedrockBoxProtectedBlock(field, x, y, z, block.typeId)) {
    event.cancel = true;
  }
}

function handleExplosionAfter(event) {
  if (!isBedrockBoxProtectionEnabled()) return;

  const field = getField();
  if (!field) return;

  const impactedBlocks = event.getImpactedBlocks?.() ?? event.impactedBlocks ?? [];
  if (!impactedBlocks.length) return;

  const dimension = event.dimension;
  system.run(() => {
    for (const block of impactedBlocks) {
      const x = Math.floor(block.location.x);
      const y = Math.floor(block.location.y);
      const z = Math.floor(block.location.z);
      if (!isBedrockBoxProtectedBlock(field, x, y, z)) {
        continue;
      }
      restoreProtectedBlock(dimension, field, x, y, z);
    }
  });
}

export function registerBedrockBoxProtection() {
  const breakEvent = world.beforeEvents?.playerBreakBlock;
  if (breakEvent) {
    breakEvent.subscribe(handleBreakBefore);
  } else {
    console.warn(
      "[SAB] playerBreakBlock is not available — BedrockBox structure protection disabled.",
    );
  }

  const explosionEvent = world.afterEvents?.explosion;
  if (explosionEvent) {
    explosionEvent.subscribe(handleExplosionAfter);
  } else {
    console.warn(
      "[SAB] explosion event is not available — TNT wall protection may not work.",
    );
  }

  console.warn("[SAB] BedrockBox structure protection registered.");
}
