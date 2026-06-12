import { world } from "@minecraft/server";
import { CONFIG, GAME_STATES } from "../config.js";
import {
  getGameState,
  getField,
  getCurrentMode,
  isBedrockBoxHoldActive,
  startBedrockBoxHold,
  resetBedrockBoxHold,
  tickBedrockBoxHoldCounter,
} from "../state.js";
import { getProgress } from "./fill-progress.js";
import { finishFillChallenge } from "./fill-challenge.js";
import { broadcast } from "../effects/visual-effects.js";
import { getAllGamePlayers } from "../utils/players.js";

function getHoldSeconds() {
  return CONFIG.bedrockBoxMode?.holdSeconds ?? 10;
}

function isBoxFullyFilled(progress) {
  return progress.placed >= progress.total;
}

function showHoldCountdown(seconds) {
  const title = "§a箱コンプリート！";
  const subtitle = `§e§l${seconds}`;
  for (const player of world.getAllPlayers()) {
    try {
      player.onScreenDisplay.setTitle(title, {
        subtitle,
        fadeInDuration: 5,
        stayDuration: 40,
        fadeOutDuration: 5,
      });
    } catch {
      // ignore
    }
  }
}

function updateHoldCountdown(seconds) {
  const subtitle = `§e§l${seconds}`;
  for (const player of world.getAllPlayers()) {
    try {
      player.onScreenDisplay.updateSubtitle(subtitle);
    } catch {
      // ignore
    }
  }
}

export function clearBedrockBoxHoldDisplay() {
  for (const player of world.getAllPlayers()) {
    try {
      player.onScreenDisplay.setTitle("");
    } catch {
      // ignore
    }
  }
}

function abortHoldBecauseIncomplete() {
  if (!isBedrockBoxHoldActive()) return;
  resetBedrockBoxHold();
  clearBedrockBoxHoldDisplay();
  broadcast("キープ失敗 — 箱に空きができました。");
}

export function checkBedrockBoxProgress() {
  if (getGameState() !== GAME_STATES.RUNNING) {
    return null;
  }
  if (getCurrentMode() !== "bedrock_box") {
    return null;
  }

  const field = getField();
  if (!field) return null;

  const progress = getProgress(field, "bedrock_box");

  if (!isBoxFullyFilled(progress)) {
    abortHoldBecauseIncomplete();
    return progress;
  }

  if (!isBedrockBoxHoldActive()) {
    const holdSeconds = getHoldSeconds();
    startBedrockBoxHold(holdSeconds);
    showHoldCountdown(holdSeconds);
    broadcast(`箱が満タン！あと ${holdSeconds} 秒キープで勝利。`);
  }

  return progress;
}

export function tickBedrockBoxHold() {
  if (getGameState() !== GAME_STATES.RUNNING) return;
  if (getCurrentMode() !== "bedrock_box") return;
  if (!isBedrockBoxHoldActive()) return;

  const field = getField();
  if (!field) {
    abortHoldBecauseIncomplete();
    return;
  }

  const progress = getProgress(field, "bedrock_box");
  if (!isBoxFullyFilled(progress)) {
    abortHoldBecauseIncomplete();
    return;
  }

  const secondsLeft = tickBedrockBoxHoldCounter();
  if (secondsLeft > 0) {
    updateHoldCountdown(secondsLeft);
    return;
  }

  const holdSeconds = getHoldSeconds();
  resetBedrockBoxHold();
  clearBedrockBoxHoldDisplay();
  finishFillChallenge(true, { announce: false });
  broadcast(`勝利！箱を ${holdSeconds} 秒間キープしました。`);
  for (const player of getAllGamePlayers()) {
    try {
      player.onScreenDisplay.setTitle("§6勝利！", {
        subtitle: `§a${holdSeconds}秒キープ成功`,
        fadeInDuration: 5,
        stayDuration: 60,
        fadeOutDuration: 20,
      });
    } catch {
      // ignore
    }
  }
}
