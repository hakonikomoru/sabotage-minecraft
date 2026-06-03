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
    broadcast("プレイヤー勝利！");
    broadcast("10分間、妨害に耐えて90個以上の白色羊毛を守り切った！");
    showTitleAll(
      "プレイヤー勝利！",
      "10分間、妨害に耐えて90個以上の白色羊毛を守り切った！",
    );
  } else {
    broadcast("視聴者勝利！");
    broadcast("妨害により防衛ライン90個を守り切れなかった！");
    showTitleAll(
      "視聴者勝利！",
      "妨害により防衛ライン90個を守り切れなかった！",
    );
  }
}

/**
 * fill_and_defend では途中勝利しない。進捗確認のみ。
 */
export function checkFillAndDefendProgress() {
  if (getGameState() !== GAME_STATES.RUNNING) {
    return null;
  }
  const field = getField();
  if (!field) return null;
  return getProgress(field, "fill_and_defend");
}
