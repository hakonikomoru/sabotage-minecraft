import { GAME_STATES } from "../config.js";
import {
  getGameState,
  setGameState,
  setWinResult,
  getField,
} from "../state.js";
import { getProgress } from "./fill-progress.js";
import { gameTimer } from "../timer.js";
import { eventQueue } from "../event-queue.js";
import { showTitleAll, broadcast } from "../effects/visual-effects.js";

export function finishFillAndDefendOnTimeUp() {
  if (getGameState() === GAME_STATES.FINISHED) {
    return;
  }
  const field = getField();
  if (!field) {
    finishFillAndDefend(false);
    return;
  }
  const progress = getProgress(field, "fill_and_defend");
  finishFillAndDefend(progress.placed >= progress.required);
}

export function finishFillAndDefend(playerWon) {
  if (getGameState() === GAME_STATES.FINISHED) {
    return;
  }
  gameTimer.stop();
  eventQueue.clear();
  setGameState(GAME_STATES.FINISHED);
  setWinResult(playerWon ? "player" : "viewers");

  if (playerWon) {
    broadcast("Player win! Defended target count.");
    showTitleAll("Player win!", "Defended target count.");
  } else {
    broadcast("Viewer win! Target count was not defended.");
    showTitleAll("Viewer win!", "Target count was not defended.");
  }
}

/**
 * fill_and_defend does not win mid-game. Progress check only.
 */
export function checkFillAndDefendProgress() {
  if (getGameState() !== GAME_STATES.RUNNING) {
    return null;
  }
  const field = getField();
  if (!field) return null;
  return getProgress(field, "fill_and_defend");
}
