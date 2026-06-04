import { GAME_STATES } from "../config.js";
import {
  getGameState,
  setGameState,
  setWinResult,
  getField,
} from "../state.js";
import { getProgress, shouldWinOnProgress } from "./fill-progress.js";
import { gameTimer } from "../timer.js";
import { eventQueue } from "../event-queue.js";
import { showTitleAll, broadcast } from "../effects/visual-effects.js";

export function checkFillChallengeProgress() {
  if (getGameState() !== GAME_STATES.RUNNING) {
    return null;
  }
  const field = getField();
  if (!field) return null;
  const progress = getProgress(field, "fill_challenge");
  if (shouldWinOnProgress(progress, "fill_challenge")) {
    finishFillChallenge(true);
  }
  return progress;
}

export function finishFillChallenge(playerWon) {
  if (getGameState() === GAME_STATES.FINISHED) {
    return;
  }
  gameTimer.stop();
  eventQueue.clear();
  setGameState(GAME_STATES.FINISHED);
  setWinResult(playerWon ? "player" : "viewers");

  if (playerWon) {
    broadcast("Player win! Target reached.");
    showTitleAll("Player win!", "Target reached.");
  } else {
    broadcast("Viewer win! Time is up.");
    showTitleAll("Viewer win!", "Time is up.");
  }
}
