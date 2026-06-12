import { world } from "@minecraft/server";

const META_KEY = "sab:bedrock_box_v1";
const BLOCKS_KEY = "sab:bedrock_box_blocks_v1";
const BLOCK_LINE_SEP = "\n";
const COORD_SEP = ",";

function serializeBlocks(blocks) {
  if (!blocks?.length) return "";
  return blocks
    .map(
      (block) =>
        `${block.x}${COORD_SEP}${block.y}${COORD_SEP}${block.z}${COORD_SEP}${block.typeId}`,
    )
    .join(BLOCK_LINE_SEP);
}

function deserializeBlocks(raw) {
  if (typeof raw !== "string" || !raw) return [];
  return raw.split(BLOCK_LINE_SEP).map((line) => {
    const parts = line.split(COORD_SEP);
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    const z = Number(parts[2]);
    const typeId = parts.slice(3).join(COORD_SEP);
    return { x, y, z, typeId };
  });
}

function serializeMeta(field) {
  const {
    originX,
    originZ,
    y,
    structureSize,
    dimensionId,
    modeId,
    size,
    targetBlock,
    acceptAnyFillBlock,
    baseBlock,
    borderBlock,
    arena,
    startPlayerOriginalLocation,
  } = field;
  return JSON.stringify({
    originX,
    originZ,
    y,
    structureSize,
    dimensionId,
    modeId,
    size,
    targetBlock,
    acceptAnyFillBlock,
    baseBlock,
    borderBlock,
    arena,
    startPlayerOriginalLocation,
  });
}

function deserializeMeta(raw) {
  if (typeof raw !== "string" || !raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function persistBedrockBoxField(field) {
  if (!field || field.modeId !== "bedrock_box") return;

  try {
    world.setDynamicProperty(META_KEY, serializeMeta(field));
    if (field.originalBlocks?.length) {
      world.setDynamicProperty(BLOCKS_KEY, serializeBlocks(field.originalBlocks));
    }
  } catch (error) {
    console.warn(
      `[SAB] Could not persist BedrockBox field: ${error?.message ?? error}`,
    );
  }
}

export function loadPersistedBedrockBoxField() {
  const meta = deserializeMeta(world.getDynamicProperty(META_KEY));
  if (!meta || meta.modeId !== "bedrock_box") return null;

  const originalBlocks = deserializeBlocks(world.getDynamicProperty(BLOCKS_KEY));
  return { ...meta, originalBlocks };
}

export function hasPersistedBedrockBoxMeta() {
  const meta = deserializeMeta(world.getDynamicProperty(META_KEY));
  return meta?.modeId === "bedrock_box";
}

export function clearPersistedBedrockBoxField() {
  try {
    world.setDynamicProperty(META_KEY, undefined);
    world.setDynamicProperty(BLOCKS_KEY, undefined);
  } catch (error) {
    console.warn(
      `[SAB] Could not clear persisted BedrockBox field: ${error?.message ?? error}`,
    );
  }
}
