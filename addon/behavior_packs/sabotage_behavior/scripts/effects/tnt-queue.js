import { system } from "@minecraft/server";
import { CONFIG, GAME_STATES } from "../config.js";
import { getCurrentMode, getField, getGameState } from "../state.js";
import { getDimensionFromField } from "../modes/fill-field.js";
import { getBedrockBoxLayerCount } from "../modes/bedrock-box-layers.js";
function canRunBedrockBox() {
  if (getGameState() !== GAME_STATES.RUNNING) return false;
  if (getCurrentMode() !== "bedrock_box") return false;
  return Boolean(getField()?.modeId === "bedrock_box");
}

let pendingTnt = 0;

function pickRandomInnerColumn(field) {
  const size = field.size ?? 11;
  const dx = 1 + Math.floor(Math.random() * size);
  const dz = 1 + Math.floor(Math.random() * size);
  return {
    x: field.originX + dx,
    z: field.originZ + dz,
  };
}

export function spawnBedrockBoxTnt() {
  if (!canRunBedrockBox()) return false;

  const field = getField();
  const dimension = getDimensionFromField(field);
  if (!dimension) return false;

  const dropHeight = CONFIG.bedrockBox?.tntQueue?.spawnHeightAbove ?? 6;
  const maxLayer = getBedrockBoxLayerCount(field);
  const column = pickRandomInnerColumn(field);
  const y = field.y + maxLayer + dropHeight;

  try {
    dimension.spawnEntity("minecraft:tnt", {
      x: column.x + 0.5,
      y,
      z: column.z + 0.5,
    });
    return true;
  } catch (error) {
    console.warn(`[SAB] TNT spawn failed: ${error?.message ?? error}`);
    return false;
  }
}

export function enqueueTnt(count) {
  const amount = Math.max(0, Math.floor(count));
  if (amount <= 0) return 0;
  const maxQueue = CONFIG.bedrockBox?.tntQueue?.maxPending ?? 500;
  const space = Math.max(0, maxQueue - pendingTnt);
  const accepted = Math.min(amount, space);
  pendingTnt += accepted;
  return pendingTnt;
}

export function getPendingTntCount() {
  return pendingTnt;
}

export function clearTntQueue() {
  pendingTnt = 0;
}

function canProcessTntQueue() {
  if (getGameState() !== GAME_STATES.RUNNING) return false;
  if (getCurrentMode() !== "bedrock_box") return false;
  return Boolean(getField()?.modeId === "bedrock_box");
}

export function tickTntQueue() {
  if (!canProcessTntQueue() || pendingTnt <= 0) return;
  pendingTnt -= 1;
  spawnBedrockBoxTnt();
}

export function registerTntQueueTicker() {
  const intervalTicks =
    CONFIG.bedrockBox?.tntQueue?.spawnIntervalTicks ?? 20;
  system.runInterval(() => {
    system.run(() => tickTntQueue());
  }, intervalTicks);
}
