import { CONFIG, GAME_STATES } from "../config.js";
import { getCurrentMode, getField, getGameState } from "../state.js";
import { getDimensionFromField } from "../modes/fill-field.js";
import {
  forEachBedrockBoxFillCell,
  getBedrockBoxLayerCount,
  getBedrockBoxLayerFromY,
} from "../modes/bedrock-box-layers.js";
import { getBlockTypeId, setBlockSafe } from "../utils/blocks.js";
import { spawnFallingEmeraldBlock } from "../utils/falling-block.js";
import { broadcast } from "./visual-effects.js";
import { enqueueTnt } from "./tnt-queue.js";

export function canRunBedrockBoxEffect() {
  if (getGameState() !== GAME_STATES.RUNNING) return false;
  if (getCurrentMode() !== "bedrock_box") return false;
  const field = getField();
  return Boolean(field?.modeId === "bedrock_box");
}

function getFieldOrSkip(label) {
  const field = getField();
  if (!canRunBedrockBoxEffect() || !field) {
    broadcast(`${label} skipped: BedrockBox not active.`);
    return null;
  }
  const dimension = getDimensionFromField(field);
  if (!dimension) {
    broadcast(`${label} skipped: dimension unavailable.`);
    return null;
  }
  return { field, dimension };
}

function isFilledCell(typeId) {
  return Boolean(typeId && typeId !== "minecraft:air");
}

function findTopOccupiedLayer(field, dimension) {
  let topLayer = 0;
  forEachBedrockBoxFillCell(field, (x, y, z) => {
    const layer = getBedrockBoxLayerFromY(field, y);
    if (!isFilledCell(getBlockTypeId(dimension, { x, y, z }))) return;
    if (layer > topLayer) topLayer = layer;
  });
  return topLayer;
}

function clearFillLayer(field, dimension, layer) {
  let removed = 0;
  forEachBedrockBoxFillCell(field, (x, y, z) => {
    if (getBedrockBoxLayerFromY(field, y) !== layer) return;
    const typeId = getBlockTypeId(dimension, { x, y, z });
    if (!isFilledCell(typeId)) return;
    if (setBlockSafe(dimension, { x, y, z }, "minecraft:air")) {
      removed += 1;
    }
  });
  return removed;
}

/**
 * Remove the top N occupied fill layers (air以外を air に).
 * Each step clears the current highest layer that has blocks.
 */
export function removeTopLayers(field, dimension, layerCount) {
  const steps = Math.max(0, Math.floor(layerCount));
  let removed = 0;

  for (let step = 0; step < steps; step++) {
    const topLayer = findTopOccupiedLayer(field, dimension);
    if (topLayer < 1) break;
    removed += clearFillLayer(field, dimension, topLayer);
  }

  return removed;
}

function pickRandomInnerColumn(field) {
  const size = field.size ?? 11;
  const dx = 1 + Math.floor(Math.random() * size);
  const dz = 1 + Math.floor(Math.random() * size);
  return {
    x: field.originX + dx,
    z: field.originZ + dz,
  };
}

/** Drop one emerald block from above; falls like sand and lands as a block. */
export function dropEmeraldInsideBox(field, dimension) {
  const maxLayer = getBedrockBoxLayerCount(field);
  const dropHeight = CONFIG.bedrockBox?.emeraldDropHeight ?? 8;
  const column = pickRandomInnerColumn(field);
  const startY = field.y + maxLayer + dropHeight;

  spawnFallingEmeraldBlock(dimension, field, {
    x: column.x,
    y: startY,
    z: column.z,
  });
}

export function applyBoxCommentFirst() {
  const ctx = getFieldOrSkip("box_comment_first");
  if (!ctx) return;
  const removed = removeTopLayers(ctx.field, ctx.dimension, 1);
  broadcast(`First comment: removed top layer (${removed} cells).`);
}

export function applyBoxCommentRepeat() {
  const ctx = getFieldOrSkip("box_comment_repeat");
  if (!ctx) return;
  dropEmeraldInsideBox(ctx.field, ctx.dimension);
  broadcast("Repeat comment: emerald block dropped inside the box.");
}

export function applyBoxFollow() {
  const ctx = getFieldOrSkip("box_follow");
  if (!ctx) return;
  const removed = removeTopLayers(ctx.field, ctx.dimension, 3);
  broadcast(`Follow sabotage: removed top 3 layers (${removed} cells).`);
}

export function applyBoxSubscribe() {
  const ctx = getFieldOrSkip("box_subscribe");
  if (!ctx) return;
  const removed = removeTopLayers(ctx.field, ctx.dimension, 9);
  broadcast(`Subscribe sabotage: removed top 9 layers (${removed} cells).`);
}

export function applyBoxChannelPoint() {
  const ctx = getFieldOrSkip("box_channel_point");
  if (!ctx) return;
  const queued = enqueueTnt(1);
  broadcast(`Channel point: TNT queued (+1, pending ${queued}).`);
}

export function applyBoxBits(event) {
  const ctx = getFieldOrSkip("box_bits");
  if (!ctx) return;
  const bits = Math.max(0, Math.floor(event?.bits ?? 0));
  if (bits <= 0) {
    broadcast("Bits sabotage skipped: no bits amount.");
    return;
  }
  const queued = enqueueTnt(bits);
  broadcast(`Bits: TNT queued (+${bits}, pending ${queued}).`);
}

export function applyBoxGiftSub() {
  const ctx = getFieldOrSkip("box_gift_sub");
  if (!ctx) return;
  const amount = CONFIG.bedrockBox?.giftSubTntCount ?? 100;
  const queued = enqueueTnt(amount);
  broadcast(`Gift sub: TNT queued (+${amount}, pending ${queued}).`);
}
