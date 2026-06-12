import { system } from "@minecraft/server";
import { getBlockTypeId, isInnerFieldCoord, setBlockSafe } from "./blocks.js";

const EMERALD_BLOCK = "minecraft:emerald_block";
const FALL_INTERVAL_TICKS = 2;

function isPassable(typeId) {
  return !typeId || typeId === "minecraft:air";
}

function trySummonFallingBlock(dimension, x, y, z, blockId) {
  const blockName = blockId.replace("minecraft:", "");
  const commands = [
    `summon falling_block ${x} ${y} ${z} ${blockName}`,
    `summon minecraft:falling_block ${x} ${y} ${z} ${blockName}`,
    `summon falling_block ${x} ${y} ${z}`,
  ];

  for (const command of commands) {
    try {
      const result = dimension.runCommand(command);
      if (result?.successCount > 0) {
        return true;
      }
    } catch {
      // try next syntax
    }
  }
  return false;
}

/**
 * Animate emerald_block falling like sand; lands as a placed block.
 */
function animateFallingBlock(dimension, field, x, z, startY, blockId) {
  const bx = Math.floor(x);
  const bz = Math.floor(z);
  const minY = field.y + 1;
  let y = Math.floor(startY);

  if (!isInnerFieldCoord(field, bx, bz)) {
    return false;
  }

  if (isPassable(getBlockTypeId(dimension, { x: bx, y, z: bz }))) {
    setBlockSafe(dimension, { x: bx, y, z: bz }, blockId);
  }

  const step = () => {
    if (!isInnerFieldCoord(field, bx, bz)) {
      return;
    }

    const belowType = getBlockTypeId(dimension, { x: bx, y: y - 1, z: bz });
    if (y <= minY || !isPassable(belowType)) {
      return;
    }

    setBlockSafe(dimension, { x: bx, y, z: bz }, "minecraft:air");
    y -= 1;
    setBlockSafe(dimension, { x: bx, y, z: bz }, blockId);
    system.runTimeout(step, FALL_INTERVAL_TICKS);
  };

  system.runTimeout(step, FALL_INTERVAL_TICKS);
  return true;
}

/**
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {object} field
 * @param {{ x: number, y: number, z: number }} location
 */
export function spawnFallingEmeraldBlock(dimension, field, location) {
  const x = Math.floor(location.x);
  const y = Math.floor(location.y);
  const z = Math.floor(location.z);

  if (!isInnerFieldCoord(field, x, z)) {
    return false;
  }

  if (trySummonFallingBlock(dimension, x, y, z, EMERALD_BLOCK)) {
    return true;
  }

  return animateFallingBlock(dimension, field, x, z, y, EMERALD_BLOCK);
}
