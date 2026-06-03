import { CONFIG, GAME_STATES, MODE_DISPLAY_NAMES } from "../config.js";
import {
  setGameState,
  setMainPlayerName,
  setWinResult,
  getField,
  clearField,
  setLastProgressNotifyAt,
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
  resetFieldToBase,
  teleportToFieldStart,
} from "./fill-field.js";
import {
  getProgress,
  shouldWinOnProgress,
  getGameSnapshot,
  getLineLabel,
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

export function switchMode(modeId) {
  if (!CONFIG.game.availableModes.includes(modeId)) {
    return { ok: false, message: `未対応モード: ${modeId}` };
  }
  if (!canChangeMode()) {
    return {
      ok: false,
      message:
        "ゲーム中はモード変更できません。stop または reset 後に変更してください。",
    };
  }
  setCurrentMode(modeId);
  return {
    ok: true,
    message: `モードを ${modeId} に変更しました`,
  };
}

async function setupFillGame(player, modeId, startMessages) {
  setCurrentMode(modeId);
  setMainPlayerName(player.name);
  eventQueue.clear();
  setWinResult(null);

  const cfg = getModeConfig(modeId);
  const field = buildField(player, modeId);
  removeWhiteWoolFromInventory(player);
  giveWhiteWool(player, cfg.initialWoolAmount);
  teleportToFieldStart(player, field);

  gameTimer.start(startMessages.onTimerFinish, cfg.durationSeconds);
  setGameState(GAME_STATES.RUNNING);
  setLastProgressNotifyAt(Date.now());

  const bridgeOk = await checkBridgeHealth();
  setBridgeConnected(bridgeOk);

  broadcast(startMessages.chatLine1);
  broadcast(startMessages.chatLine2);
  if (bridgeOk) {
    broadcast("Bridge接続: OK");
  } else {
    broadcast("Bridge接続: 未接続（debug endpoint でテスト可能）");
  }
  showTitleAll(startMessages.title, startMessages.subtitle);

  return field;
}

export async function startCurrentMode(player) {
  const modeId = getCurrentMode();
  if (modeId === "fill_and_defend") {
    return setupFillGame(player, modeId, {
      title: "ブロック埋め防衛チャレンジ開始！",
      subtitle: "10分間、白色羊毛90個以上を守り切れ！",
      chatLine1: "ブロック埋め防衛チャレンジ開始！",
      chatLine2: "10分終了時点で白色羊毛90個以上をキープしたら勝利！",
      onTimerFinish: () => finishFillAndDefendOnTimeUp(),
    });
  }
  return setupFillGame(player, modeId, {
    title: "妨害マイクラ開始！",
    subtitle: "10分以内に10×10の床を白色の羊毛で90%以上埋めろ！",
    chatLine1: "妨害マイクラ開始！",
    chatLine2: "10分以内に10×10の床を白色の羊毛で90%以上埋めろ！",
    onTimerFinish: () => finishFillChallenge(false),
  });
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
    resetFieldToBase(field);
  }
  clearField();
  resetState();
  setGameState(GAME_STATES.IDLE);
  broadcast("ゲームをリセットしました — !sab start で再開");
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
    bridge: snapshot.bridgeConnected ? "OK" : "未接続",
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
    `残り ${lines.remaining} / 白色羊毛 ${lines.whiteWool}個 / ${lines.lineLabel} ${lines.required}個 / キュー ${lines.queue}件`,
  );
}

export { getGameSnapshot };
