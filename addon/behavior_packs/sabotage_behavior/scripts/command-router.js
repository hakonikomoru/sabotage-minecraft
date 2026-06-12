import { world, system } from "@minecraft/server";
import { GAME_STATES } from "./config.js";
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
  deleteBedrockBox,
  checkProgress,
  getStatusLines,
  switchMode,
} from "./modes/mode-manager.js";
import { giveMenuItem } from "./ui/menu-item.js";

const TEST_COMMANDS = new Set(["slow", "blind", "chicken", "hole", "block"]);

function denyAdmin(player) {
  broadcast("Permission denied: this command requires SAB admin.");
}

export async function handleSabCommand(player, args) {
  const sub = (args[0] ?? "").toLowerCase();

  switch (sub) {
    case "start": {
      if (!isAdmin(player)) {
        denyAdmin(player);
        return;
      }
      const variant = (args[1] ?? "").toLowerCase();
      if (variant === "defend") {
        const result = switchMode("fill_and_defend");
        if (!result.ok) {
          broadcast(result.message);
          return;
        }
      } else if (variant === "box") {
        const result = switchMode("bedrock_box");
        if (!result.ok) {
          broadcast(result.message);
          return;
        }
      }
      await startCurrentMode(player);
      break;
    }
    case "mode": {
      if (!isAdmin(player)) {
        denyAdmin(player);
        return;
      }
      const target = (args[1] ?? "").toLowerCase();
      if (!target) {
        broadcast(`Current mode: ${getCurrentMode()}`);
        return;
      }
      const result = switchMode(target);
      broadcast(result.message);
      break;
    }
    case "stop":
      if (!isAdmin(player)) {
        denyAdmin(player);
        return;
      }
      stopGame();
      broadcast("Game stopped.");
      break;
    case "pause":
      if (!isAdmin(player)) {
        denyAdmin(player);
        return;
      }
      gameTimer.pause();
      setGameState(GAME_STATES.PAUSED);
      broadcast(`Game paused. Remaining: ${gameTimer.formatRemaining()}`);
      break;
    case "resume":
      if (!isAdmin(player)) {
        denyAdmin(player);
        return;
      }
      if (!gameTimer.isActive()) {
        broadcast(
          "Timer not started - use /scriptevent sab:command start",
        );
        return;
      }
      gameTimer.resume();
      setGameState(GAME_STATES.RUNNING);
      broadcast(`Game resumed. Remaining: ${gameTimer.formatRemaining()}`);
      break;
    case "status": {
      const lines = getStatusLines();
      broadcast(`State: ${lines.state}`);
      broadcast(`Mode: ${lines.modeDisplayName ?? lines.mode}`);
      if (lines.mode === "bedrock_box") {
        if (lines.bossBar) {
          broadcast(lines.bossBar);
        }
        broadcast(`Fill: ${lines.progress}`);
        broadcast(`Goal: ${lines.required} blocks (${lines.ratePercent}%)`);
      } else {
        broadcast(`Remaining: ${lines.remaining}`);
        broadcast(`White wool: ${lines.whiteWool} / ${lines.total}`);
        broadcast(`Target: ${lines.required}`);
        broadcast(`Progress: ${lines.ratePercent}%`);
      }
      broadcast(`Queue: ${lines.queue}`);
      broadcast(`Bridge: ${lines.bridge}`);
      checkProgress();
      break;
    }
    case "clear":
      if (!isAdmin(player)) {
        denyAdmin(player);
        return;
      }
      eventQueue.clear();
      broadcast("Event queue cleared.");
      break;
    case "reset":
      if (!isAdmin(player)) {
        denyAdmin(player);
        return;
      }
      resetGame();
      break;
    case "deletebox":
    case "delete-box":
      if (!isAdmin(player)) {
        denyAdmin(player);
        return;
      }
      deleteBedrockBox();
      break;
    case "menu":
    case "wand":
      if (!isAdmin(player)) {
        denyAdmin(player);
        return;
      }
      giveMenuItem(player);
      break;
    case "test": {
      if (!isAdmin(player)) {
        denyAdmin(player);
        return;
      }
      const command = (args[1] ?? "blind").toLowerCase();
      if (!TEST_COMMANDS.has(command)) {
        broadcast(`Unknown test command: ${command}`);
        return;
      }
      if (!canAcceptYoutubeEvents()) {
        broadcast("Game not started - run start before testing.");
        return;
      }
      const testEvent = {
        id: `test_${Date.now()}`,
        type: command === "block" ? "support" : "sabotage",
        source: "normalChat",
        command,
        tier: "weak",
        authorName: player.name,
        message: `!${command}`,
        createdAt: new Date().toISOString(),
      };
      if (!eventQueue.enqueue(testEvent)) {
        broadcast(`Test event queue failed: ${command}`);
        return;
      }
      broadcast(`Test event queued: ${command}`);
      processNextQueuedEvent();
      break;
    }
    default:
      broadcast(
        "Usage: /scriptevent sab:command start|start defend|start box|mode|stop|pause|resume|status|clear|reset|deletebox|menu|test",
      );
  }
}

export function registerChatCommands() {
  const scriptEvent = system.afterEvents?.scriptEventReceive;

  if (scriptEvent) {
    scriptEvent.subscribe((event) => {
      if (event.id !== "sab:command") {
        return;
      }

      const message = event.message?.trim?.() ?? "status";
      const args = message.split(/\s+/).filter(Boolean);
      const sender = event.sourceEntity ?? world.getPlayers()[0];

      if (!sender) {
        console.warn("[SAB] script event received, but no player is available.");
        return;
      }

      system.run(() => {
        handleSabCommand(sender, args).catch((error) => {
          console.warn(`[SAB] Command failed: ${error?.message ?? error}`);
        });
      });
    });

    console.warn(
      "[SAB] scriptEvent command registered. Use /scriptevent sab:command status",
    );
  } else {
    console.warn(
      "[SAB] scriptEventReceive is not available in this Script API version.",
    );
  }

  const chatEvent = world.afterEvents?.chatSend ?? world.beforeEvents?.chatSend;

  if (!chatEvent) {
    console.warn("[SAB] chatSend event is not available in this Script API version.");
    return;
  }

  chatEvent.subscribe((event) => {
    const message = event.message?.trim?.() ?? "";
    if (!message.toLowerCase().startsWith("!sab")) {
      return;
    }

    if ("cancel" in event) {
      event.cancel = true;
    }

    system.run(() => {
      const args = message.slice(4).trim().split(/\s+/).filter(Boolean);
      handleSabCommand(event.sender, args).catch((error) => {
        console.warn(`[SAB] Command failed: ${error?.message ?? error}`);
      });
    });
  });
}

export function processNextQueuedEvent() {
  const event = eventQueue.dequeueOne();
  if (event) {
    console.warn(`[SAB] Processing queued event: ${event.command}`);
    executeEffect(event);
  }
}

export function handleSystemEvent(event) {
  switch (event.command) {
    case "pause":
      gameTimer.pause();
      setGameState(GAME_STATES.PAUSED);
      broadcast(`Remote admin: paused (${event.authorName})`);
      break;
    case "resume":
      if (gameTimer.isActive()) {
        gameTimer.resume();
        setGameState(GAME_STATES.RUNNING);
        broadcast(`Remote admin: resumed (${event.authorName})`);
      }
      break;
    case "stop":
      stopGame();
      broadcast(`Remote admin: stopped (${event.authorName})`);
      break;
    case "clearqueue":
      eventQueue.clear();
      broadcast(`Remote admin: queue cleared (${event.authorName})`);
      break;
    case "status": {
      const lines = getStatusLines();
      broadcast(
        `Remote admin: mode=${lines.mode} remaining=${lines.remaining} wool=${lines.whiteWool}`,
      );
      break;
    }
    default:
      break;
  }
}
