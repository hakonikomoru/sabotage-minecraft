import { getModeConfig } from "./mode-config.js";
import { countWhiteWool } from "./fill-field.js";
import {
  getCurrentMode,
  getGameState,
  getField,
  getWinResult,
  isBridgeConnected,
} from "../state.js";
import { eventQueue } from "../event-queue.js";
import { gameTimer } from "../timer.js";
import { MODE_DISPLAY_NAMES } from "../config.js";

export function getProgress(field, modeId = getCurrentMode()) {
  const cfg = getModeConfig(modeId);
  const placed = countWhiteWool(field);
  const required = cfg.requiredCount;
  const total = cfg.totalCells;
  const rate = total > 0 ? placed / total : 0;
  return {
    placed,
    required,
    total,
    rate,
    ratePercent: Math.floor(rate * 100),
    isComplete: placed >= required,
    winTiming: cfg.winTiming,
  };
}

export function shouldWinOnProgress(progress, modeId = getCurrentMode()) {
  const cfg = getModeConfig(modeId);
  return cfg.winTiming === "on_reach" && progress.isComplete;
}

export function getLineLabel(modeId = getCurrentMode()) {
  return modeId === "fill_and_defend" ? "Defend line" : "Target line";
}

export function formatProgress(field, modeId = getCurrentMode()) {
  const p = getProgress(field, modeId);
  return `${p.placed} / ${p.total}`;
}

export function formatProgressDetailed(field, modeId = getCurrentMode()) {
  const p = getProgress(field, modeId);
  return `${p.placed} / ${p.required} (${p.ratePercent}%)`;
}

/** Future OBS overlay snapshot */
export function getGameSnapshot() {
  const field = getField();
  const modeId = getCurrentMode();
  const cfg = getModeConfig(modeId);
  const progress = field ? getProgress(field, modeId) : null;
  const winResult = getWinResult();

  return {
    state: getGameState(),
    mode: modeId,
    modeDisplayName: MODE_DISPLAY_NAMES[modeId] ?? modeId,
    remainingSeconds: gameTimer.isActive() ? gameTimer.getRemainingSeconds() : 0,
    remainingFormatted: gameTimer.isActive()
      ? gameTimer.formatRemaining()
      : "--:--",
    whiteWoolCount: progress?.placed ?? 0,
    totalCells: cfg.totalCells,
    requiredCount: cfg.requiredCount,
    progressRate: progress?.rate ?? 0,
    progressRatePercent: progress?.ratePercent ?? 0,
    lineLabel: getLineLabel(modeId),
    queueSize: eventQueue.size(),
    bridgeConnected: isBridgeConnected(),
    result:
      winResult === "player"
        ? "player_win"
        : winResult === "viewers"
          ? "viewer_win"
          : undefined,
  };
}
