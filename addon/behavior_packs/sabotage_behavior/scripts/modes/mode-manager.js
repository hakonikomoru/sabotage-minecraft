import { CONFIG, GAME_STATES, MODE_DISPLAY_NAMES } from "../config.js";
import { world, system } from "@minecraft/server";
import {
  setGameState,
  setMainPlayerName,
  setWinResult,
  getField,
  setField,
  clearField,
  setLastProgressNotifyAt,
  getLastProgressNotifyAt,
  getGameState,
  setBridgeConnected,
  getCurrentMode,
  setCurrentMode,
  canChangeMode,
  resetState,
  setBedrockBoxStructureEditEnabled,
} from "../state.js";
import { getModeConfig } from "./mode-config.js";
import {
  buildField,
  destroyField,
  teleportToFieldStart,
  formatFieldArenaSummary,
  isFieldStructurePresent,
  isBedrockBoxPresent,
  prepareFieldForReuse,
} from "./fill-field.js";
import {
  clearPersistedBedrockBoxField,
  loadPersistedBedrockBoxField,
  persistBedrockBoxField,
} from "./field-persistence.js";
import { getMainPlayer, isCreativePlayer } from "../utils/players.js";
import {
  getProgress,
  getGameSnapshot,
  formatProgressDetailed,
} from "./fill-progress.js";
import { gameTimer } from "../timer.js";
import { eventQueue } from "../event-queue.js";
import {
  removeWhiteWoolFromInventory,
  giveWhiteWool,
} from "../effects/support-effects.js";
import { showTitleAll, broadcast } from "../effects/visual-effects.js";
import { checkBridgeHealth } from "../integrations/bridge-client.js";
import { giveMenuItem } from "../ui/menu-item.js";
import {
  formatStatusGaugeActionBar,
  updateStatusGauge,
} from "../ui/status-gauge.js";
import {
  finishFillChallenge,
  checkFillChallengeProgress,
} from "./fill-challenge.js";
import { finishFillAndDefendOnTimeUp } from "./fill-and-defend.js";
import {
  checkBedrockBoxProgress,
  clearBedrockBoxHoldDisplay,
} from "./bedrock-box-win.js";
import { resetBedrockBoxHold } from "../state.js";
import { clearTntQueue } from "../effects/tnt-queue.js";

export { getModeConfig } from "./mode-config.js";
export { MODE_DISPLAY_NAMES } from "../config.js";

export function getModeDisplayName(modeId = getCurrentMode()) {
  return MODE_DISPLAY_NAMES[modeId] ?? modeId;
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function switchMode(modeId) {
  if (!CONFIG.game.availableModes.includes(modeId)) {
    return { ok: false, message: `Unknown mode: ${modeId}` };
  }
  if (!canChangeMode()) {
    return {
      ok: false,
      message: "Cannot change mode while game is running. Use stop or reset first.",
    };
  }
  setCurrentMode(modeId);
  return {
    ok: true,
    message: `Mode changed: ${modeId}`,
  };
}

async function setupFillGame(player, modeId, onTimerFinish) {
  setCurrentMode(modeId);
  setMainPlayerName(player.name);
  eventQueue.clear();
  setWinResult(null);

  const isBedrockBox = modeId === "bedrock_box";
  const cfg = getModeConfig(modeId);

  if (isBedrockBox) {
    setBedrockBoxStructureEditEnabled(false);
  }

  const field = buildField(player, modeId);
  if (field?.error) {
    if (isBedrockBox) {
      broadcast(field.error);
    } else if (CONFIG.arena.enabled) {
      broadcast(`Arena generation failed: ${field.error}`);
    } else {
      broadcast(field.error);
    }
    return null;
  }

  if (field.reused) {
    if (isBedrockBox) {
      broadcast("BedrockBox arena reused.");
    } else if (field.arena?.enabled) {
      const summary = formatFieldArenaSummary(field);
      broadcast(`Sky arena reused: ${summary}`);
    } else {
      broadcast("Field reused.");
    }
  } else if (isBedrockBox && field.arena?.enabled) {
    const summary = formatFieldArenaSummary(field);
    broadcast(`BedrockBox arena generated: ${summary}`);
  } else if (CONFIG.arena.enabled && field.arena?.enabled) {
    broadcast(`Starting ${modeId}...`);
    const summary = formatFieldArenaSummary(field);
    broadcast(`Sky arena generated: ${summary}`);
  } else {
    broadcast(`Starting ${modeId}...`);
  }

  if (!field.reused) {
    broadcast("Field generated.");
  }
  if (!isCreativePlayer(player)) {
    removeWhiteWoolFromInventory(player);
    giveWhiteWool(player, cfg.initialWoolAmount);
  }
  system.runTimeout(() => {
    teleportToFieldStart(player, field);
  }, 2);

  if (isBedrockBox && CONFIG.bedrockBox.teleportPlayerOnStart) {
    broadcast("Teleported player to BedrockBox.");
  } else if (CONFIG.arena.enabled && CONFIG.arena.teleportPlayerOnStart) {
    broadcast("Teleported player to arena.");
  }

  const unlimitedTime = cfg.unlimitedTime === true;
  if (!unlimitedTime) {
    gameTimer.start(onTimerFinish, cfg.durationSeconds);
    broadcast(`Timer started: ${formatDuration(cfg.durationSeconds)}`);
  } else {
    gameTimer.stop();
    broadcast("No time limit.");
  }
  setGameState(GAME_STATES.RUNNING);
  setLastProgressNotifyAt(Date.now());
  if (isBedrockBox) {
    system.run(() => updateStatusGauge());
  }

  let bridgeOk = false;
  try {
    bridgeOk = await checkBridgeHealth();
  } catch {
    bridgeOk = false;
  }
  setBridgeConnected(bridgeOk);

  if (bridgeOk) {
    broadcast("Bridge: connected");
  } else {
    broadcast("Bridge: disconnected");
  }

  if (isBedrockBox) {
    broadcast("BedrockBox started.");
  } else {
    broadcast("Game started.");
  }
  giveMenuItem(player, { announce: false });

  if (modeId === "fill_and_defend") {
    showTitleAll("Fill and Defend!", "Keep 90+ wool blocks for 10 minutes!");
  } else if (isBedrockBox) {
    showTitleAll("BedrockBox!", "Fill the box, then hold 10 sec!");
  } else {
    showTitleAll("Fill Challenge!", "Reach 90% white wool in 10 minutes!");
  }

  return field;
}

export async function startCurrentMode(player) {
  const modeId = getCurrentMode();
  if (modeId === "fill_and_defend") {
    return setupFillGame(player, modeId, () => finishFillAndDefendOnTimeUp());
  }
  return setupFillGame(player, modeId, () => finishFillChallenge(false));
}

export function checkProgress() {
  const modeId = getCurrentMode();
  if (getGameState() !== GAME_STATES.RUNNING) {
    return null;
  }
  if (modeId === "fill_and_defend") {
    const field = getField();
    return field ? getProgress(field, modeId) : null;
  }
  if (modeId === "bedrock_box") {
    return checkBedrockBoxProgress();
  }
  return checkFillChallengeProgress();
}

export function stopGame() {
  gameTimer.stop();
  eventQueue.clear();
  clearTntQueue();
  resetBedrockBoxHold();
  clearBedrockBoxHoldDisplay();
  setGameState(GAME_STATES.FINISHED);
  updateStatusGauge();
}

function maybeRestorePlayerOnReset(field) {
  if (!field?.startPlayerOriginalLocation) return;

  const restoreOnReset =
    field.modeId === "bedrock_box"
      ? CONFIG.bedrockBox.restorePlayerOnReset
      : CONFIG.arena.restorePlayerOnReset;
  if (!restoreOnReset) return;

  const player = getMainPlayer();
  if (!player) return;

  const original = field.startPlayerOriginalLocation;
  try {
    const dimension = world.getDimension(original.dimensionId);
    player.teleport(
      { x: original.x, y: original.y, z: original.z },
      { dimension },
    );
  } catch {
    // ignore teleport failure on reset
  }
}

export function resetGame() {
  gameTimer.stop();
  eventQueue.clear();
  clearTntQueue();
  resetBedrockBoxHold();
  clearBedrockBoxHoldDisplay();

  const field = getField() ?? loadPersistedBedrockBoxField();
  if (field?.modeId === "bedrock_box" && isBedrockBoxPresent(field)) {
    prepareFieldForReuse(field);
    setField(field);
    persistBedrockBoxField(field);
    maybeRestorePlayerOnReset(field);
    resetState();
    setGameState(GAME_STATES.READY);
    broadcast(
      "Game reset - BedrockBox kept. Use start box or the menu to play again.",
    );
    return;
  }

  if (field) {
    const restored = destroyField(field);
    if (restored) {
      if (field.arena?.enabled) {
        broadcast("Arena restored.");
      } else {
        broadcast("Field terrain restored.");
      }
    } else {
      broadcast("Field data incomplete - reset state only.");
    }
    maybeRestorePlayerOnReset(field);
  }

  clearField();
  clearPersistedBedrockBoxField();
  resetState();
  setGameState(GAME_STATES.READY);
  broadcast("Game reset - use /scriptevent sab:command start to play again.");
}

export function deleteBedrockBox() {
  if (
    getGameState() === GAME_STATES.RUNNING ||
    getGameState() === GAME_STATES.PAUSED
  ) {
    gameTimer.stop();
    eventQueue.clear();
    resetBedrockBoxHold();
    clearBedrockBoxHoldDisplay();
  }

  const field = getField() ?? loadPersistedBedrockBoxField();
  if (!field || field.modeId !== "bedrock_box") {
    broadcast("No BedrockBox to delete.");
    resetState();
    setGameState(GAME_STATES.READY);
    return;
  }

  if (field.originalBlocks?.length) {
    const restored = destroyField(field);
    broadcast(
      restored
        ? "BedrockBox deleted and terrain restored."
        : "BedrockBox removed (terrain restore incomplete).",
    );
  } else {
    broadcast("BedrockBox save cleared (no restore data).");
  }

  clearField();
  clearPersistedBedrockBoxField();
  setBedrockBoxStructureEditEnabled(false);
  resetState();
  setGameState(GAME_STATES.READY);
}

export function getStatusLines() {
  const snapshot = getGameSnapshot();
  const field = getField();
  const progress =
    field && snapshot.mode === "bedrock_box"
      ? getProgress(field, "bedrock_box")
      : field
        ? getProgress(field, snapshot.mode)
        : null;
  return {
    state: snapshot.state,
    mode: snapshot.mode,
    modeDisplayName: snapshot.modeDisplayName,
    remaining: snapshot.remainingFormatted,
    whiteWool: snapshot.whiteWoolCount,
    total: snapshot.totalCells,
    required: snapshot.requiredCount,
    lineLabel: snapshot.lineLabel,
    progress: field ? formatProgressDetailed(field) : "0 / 90 (0%)",
    ratePercent: snapshot.progressRatePercent,
    bossBar:
      snapshot.mode === "bedrock_box" && progress
        ? formatStatusGaugeActionBar(progress)
        : null,
    queue: snapshot.queueSize,
    bridge: snapshot.bridgeConnected ? "connected" : "disconnected",
  };
}

export function maybeNotifyProgress() {
  if (getGameState() !== GAME_STATES.RUNNING) return;

  const now = Date.now();
  const intervalMs = CONFIG.game.progressNotifyIntervalSeconds * 1000;
  const last = getLastProgressNotifyAt();
  if (now - last < intervalMs) return;

  setLastProgressNotifyAt(now);
  const lines = getStatusLines();
  if (getCurrentMode() === "bedrock_box" && lines.bossBar) {
    broadcast(lines.bossBar);
    return;
  }
  broadcast(
    `Remaining ${lines.remaining} / White wool ${lines.whiteWool} / Target ${lines.required} / Queue ${lines.queue}`,
  );
}

export { getGameSnapshot };
