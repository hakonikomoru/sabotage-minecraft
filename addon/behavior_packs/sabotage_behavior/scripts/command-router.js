import { world, system } from "@minecraft/server";
import { CONFIG, GAME_STATES } from "./config.js";
import {
  getGameState,
  setGameState,
  canAcceptYoutubeEvents,
  getCurrentMode,
} from "./state.js";
import { gameTimer } from "./timer.js";
import { eventQueue } from "./event-queue.js";
import { isAdmin } from "./utils/players.js";
import { broadcast } from "./effects/visual-effects.js";
import { executeEffect } from "./effects/index.js";
import {
  startCurrentMode,
  stopGame,
  resetGame,
  checkProgress,
  getStatusLines,
  switchMode,
  getModeDisplayName,
} from "./modes/mode-manager.js";

const TEST_COMMANDS = new Set(["slow", "blind", "chicken", "hole", "block"]);

export async function handleSabCommand(player, args) {
  const sub = (args[0] ?? "").toLowerCase();

  switch (sub) {
    case "start": {
      if (!isAdmin(player)) {
        broadcast(`${player.name} は管理コマンドを実行できません`);
        return;
      }
      const variant = (args[1] ?? "").toLowerCase();
      if (variant === "defend") {
        const result = switchMode("fill_and_defend");
        if (!result.ok) {
          broadcast(result.message);
          return;
        }
      }
      await startCurrentMode(player);
      break;
    }
    case "mode": {
      if (!isAdmin(player)) return;
      const target = (args[1] ?? "").toLowerCase();
      if (!target) {
        const mode = getCurrentMode();
        broadcast(`現在のモード：${mode} / ${getModeDisplayName(mode)}`);
        return;
      }
      const result = switchMode(target);
      broadcast(result.message);
      break;
    }
    case "stop":
      if (!isAdmin(player)) return;
      stopGame();
      broadcast("手動終了 — チャレンジを停止しました");
      break;
    case "pause":
      if (!isAdmin(player)) return;
      gameTimer.pause();
      setGameState(GAME_STATES.PAUSED);
      broadcast(
        `一時停止 — 残り ${gameTimer.formatRemaining()} / イベント発動停止`,
      );
      break;
    case "resume":
      if (!isAdmin(player)) return;
      if (!gameTimer.isActive()) {
        broadcast("タイマー未開始 — !sab start で開始してください");
        return;
      }
      gameTimer.resume();
      setGameState(GAME_STATES.RUNNING);
      broadcast(`再開 — 残り ${gameTimer.formatRemaining()}`);
      break;
    case "status": {
      const lines = getStatusLines();
      broadcast(`状態：${lines.state}`);
      broadcast(`モード：${lines.mode}`);
      broadcast(`残り時間：${lines.remaining}`);
      broadcast(`白色羊毛：${lines.whiteWool} / ${lines.total}`);
      broadcast(`${lines.lineLabel}：${lines.required}`);
      broadcast(`達成率：${lines.ratePercent}%`);
      broadcast(`キュー数：${lines.queue}`);
      broadcast(`Bridge接続：${lines.bridge}`);
      checkProgress();
      break;
    }
    case "clear":
      if (!isAdmin(player)) return;
      eventQueue.clear();
      broadcast("イベントキューをクリアしました");
      break;
    case "reset":
      if (!isAdmin(player)) return;
      resetGame();
      break;
    case "test": {
      if (!isAdmin(player)) return;
      const command = (args[1] ?? "blind").toLowerCase();
      if (!TEST_COMMANDS.has(command)) {
        broadcast(`未対応テスト: ${command}`);
        return;
      }
      if (!canAcceptYoutubeEvents()) {
        broadcast("ゲーム未開始 — !sab start 後にテストしてください");
        return;
      }
      executeEffect({
        id: `test_${Date.now()}`,
        type: command === "block" ? "support" : "sabotage",
        source: "normalChat",
        command,
        tier: "weak",
        authorName: player.name,
        message: `!${command}`,
        createdAt: new Date().toISOString(),
      });
      broadcast(`テスト発動: !${command}`);
      break;
    }
    default:
      broadcast(
        "用法: !sab start|start defend|mode|stop|pause|resume|status|clear|reset|test",
      );
  }
}

export function registerChatCommands() {
  world.beforeEvents.chatSend.subscribe((event) => {
    const message = event.message.trim();
    if (!message.toLowerCase().startsWith("!sab")) {
      return;
    }
    event.cancel = true;
    system.run(() => {
      const args = message.slice(4).trim().split(/\s+/);
      handleSabCommand(event.sender, args);
    });
  });
}

export function processNextQueuedEvent() {
  const event = eventQueue.dequeueOne();
  if (event) {
    executeEffect(event);
  }
}

export function handleSystemEvent(event) {
  switch (event.command) {
    case "pause":
      gameTimer.pause();
      setGameState(GAME_STATES.PAUSED);
      broadcast(`YouTube管理: 一時停止 (${event.authorName})`);
      break;
    case "resume":
      if (gameTimer.isActive()) {
        gameTimer.resume();
        setGameState(GAME_STATES.RUNNING);
        broadcast(`YouTube管理: 再開 (${event.authorName})`);
      }
      break;
    case "stop":
      stopGame();
      broadcast(`YouTube管理: 停止 (${event.authorName})`);
      break;
    case "clearqueue":
      eventQueue.clear();
      broadcast(`YouTube管理: キュークリア (${event.authorName})`);
      break;
    case "status": {
      const lines = getStatusLines();
      broadcast(
        `YouTube管理: モード=${lines.mode} 残り=${lines.remaining} 羊毛=${lines.whiteWool}`,
      );
      break;
    }
    default:
      break;
  }
}
