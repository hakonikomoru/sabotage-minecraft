import { CONFIG } from "../config.js";
import { getModeConfig } from "./mode-config.js";
import {
  computeBoxLayout,
  validateBoxHeight,
  captureBoxVolume,
  buildBoxFloor,
  buildBoxWalls,
  buildFieldStructure,
  formatBoxSummary,
  getBoxStartLocation,
  teleportPlayerToBoxStart,
} from "./arena-builder.js";

/**
 * @param {import("@minecraft/server").Player} player
 * @param {string} [modeId]
 */
export function buildBedrockBoxArena(player, modeId = "bedrock_box") {
  const arenaConfig = CONFIG.bedrockBox;
  const modeCfg = getModeConfig(modeId);
  const dimension = player.dimension;
  const layout = computeBoxLayout(player, arenaConfig, modeCfg);
  layout.fieldOriginX = layout.arenaOriginX;
  layout.fieldOriginZ = layout.arenaOriginZ;
  layout.structureSize = modeCfg.structureSize;

  const heightCheck = validateBoxHeight(
    dimension,
    layout,
    arenaConfig.wallHeight,
    "BedrockBox generation failed",
  );

  if (!heightCheck.ok) {
    return { error: heightCheck.reason };
  }

  const originalBlocks = captureBoxVolume(
    dimension,
    layout,
    arenaConfig.wallHeight,
  );

  buildBoxFloor(dimension, layout, arenaConfig.floorBlock);
  buildFieldStructure(dimension, layout, modeCfg);
  buildBoxWalls(dimension, layout, arenaConfig.wallBlock, arenaConfig.wallHeight);

  const startPlayerOriginalLocation = {
    x: player.location.x,
    y: player.location.y,
    z: player.location.z,
    dimensionId: dimension.id,
  };

  return {
    originX: layout.fieldOriginX,
    originZ: layout.fieldOriginZ,
    y: layout.fieldY,
    structureSize: modeCfg.structureSize,
    dimensionId: dimension.id,
    modeId,
    size: modeCfg.size,
    targetBlock: modeCfg.targetBlock,
    acceptAnyFillBlock: modeCfg.acceptAnyFillBlock ?? false,
    baseBlock: modeCfg.baseBlock,
    borderBlock: modeCfg.borderBlock,
    originalBlocks,
    arena: {
      enabled: true,
      kind: "bedrock_box",
      originX: layout.arenaOriginX,
      originZ: layout.arenaOriginZ,
      y: layout.arenaY,
      size: layout.arenaSize,
      wallHeight: arenaConfig.wallHeight,
    },
    startPlayerOriginalLocation,
  };
}

export {
  formatBoxSummary as formatBedrockBoxSummary,
  getBoxStartLocation,
  teleportPlayerToBoxStart as teleportPlayerToBedrockBox,
};
