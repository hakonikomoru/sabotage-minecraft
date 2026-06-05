import { CONFIG, GAME_STATES, MODE_DISPLAY_NAMES } from "../config.js";
import { world } from "@minecraft/server";
import {
  setGameState,
  setMainPlayerName,
  setWinResult,
  getField,
  clearField,
  setLastProgressNotifyAt,
  getLastProgressNotifyAt,
  getGameState,
  setBridgeConnected,
  getCurrentMode,
  setCurrentMode,
  canChangeMode,
  resetState,
} from "../state.js";
import { getModeConfig } from "./mode-config.js";
import {
  buildField,
  destroyField,
  teleportToFieldStart,
  formatArenaSummary,
} from "./fill-field.js";
import { getMainPlayer } from "../utils/players.js";
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
import {
  finishFillChallenge,
  checkFillChallengeProgress,
} from "./fill-challenge.js";
import { finishFillAndDefendOnTimeUp } from "./fill-and-defend.js";

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

  broadcast(`Starting ${modeId}...`);

  const cfg = getModeConfig(modeId);

  if (CONFIG.arena.enabled) {
    broadcast("Building sky arena...");
  }

  const field = buildField(player, modeId);
  if (field?.error) {
    if (CONFIG.arena.enabled) {
      broadcast(`Arena generation failed: ${field.error}`);
    } else {
      broadcast(field.error);
    }
    return null;
  }

  if (CONFIG.arena.enabled && field.arena?.enabled) {
    const summary = formatArenaSummary(field);
    broadcast(`Sky arena generated: ${summary}`);
  }

  broadcast("Field generated.");
  removeWhiteWoolFromInventory(player);
  giveWhiteWool(player, cfg.initialWoolAmount);
  teleportToFieldStart(player, field);

  if (CONFIG.arena.enabled && CONFIG.arena.teleportPlayerOnStart) {
    broadcast("Teleported player to arena.");
  }

  gameTimer.start(onTimerFinish, cfg.durationSeconds);
  setGameState(GAME_STATES.RUNNING);
  setLastProgressNotifyAt(Date.now());

  broadcast(`Timer started: ${formatDuration(cfg.durationSeconds)}`);

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

  broadcast("Game started.");

  if (modeId === "fill_and_defend") {
    showTitleAll("Fill and Defend!", "Keep 90+ wool blocks for 10 minutes!");
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
  return checkFillChallengeProgress();
}

export function stopGame() {
  gameTimer.stop();
  eventQueue.clear();
  setGameState(GAME_STATES.FINISHED);
}

export function resetGame() {
  gameTimer.stop();
  eventQueue.clear();
  const field = getField();
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

    if (
      field.startPlayerOriginalLocation &&
      CONFIG.arena.restorePlayerOnReset
    ) {
      const player = getMainPlayer();
      if (player) {
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
    }
  }
  clearField();
  resetState();
  setGameState(GAME_STATES.IDLE);
  broadcast("Game reset - use /scriptevent sab:command start to play again.");
}

export function getStatusLines() {
  const snapshot = getGameSnapshot();
  const field = getField();
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
  broadcast(
    `Remaining ${lines.remaining} / White wool ${lines.whiteWool} / Target ${lines.required} / Queue ${lines.queue}`,
  );
}

export { getGameSnapshot };
