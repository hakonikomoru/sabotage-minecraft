import { system } from "@minecraft/server";
import { CONFIG, GAME_STATES } from "./config.js";
import {
  getGameState,
  setGameState,
  setBridgeConnected,
  canAcceptYoutubeEvents,
} from "./state.js";
import {
  registerChatCommands,
  processNextQueuedEvent,
  handleSystemEvent,
} from "./command-router.js";
import { gameTimer } from "./timer.js";
import { eventQueue } from "./event-queue.js";
import {
  checkProgress,
  maybeNotifyProgress,
} from "./modes/mode-manager.js";
import {
  fetchPendingEvents,
  ackEvents,
  checkBridgeHealth,
} from "./integrations/bridge-client.js";
import { broadcast } from "./effects/visual-effects.js";
import { logOk } from "./utils/logger.js";

console.warn("[SAB] sabotage-minecraft addon loaded");

const TICKS_PER_SECOND = 20;
let pollInFlight = false;

async function pollBridge() {
  if (pollInFlight) return;
  if (!canAcceptYoutubeEvents()) return;

  pollInFlight = true;
  try {
    const events = await fetchPendingEvents();
    setBridgeConnected(true);

    const ackIds = [];
    for (const event of events) {
      if (event.type === "system") {
        handleSystemEvent(event);
        ackIds.push(event.id);
        continue;
      }
      if (eventQueue.enqueue(event)) {
        ackIds.push(event.id);
      }
    }

    if (ackIds.length > 0) {
      await ackEvents(ackIds);
    }
  } catch (error) {
    setBridgeConnected(false);
    console.warn(`[SAB] Bridge poll failed: ${error?.message ?? error}`);
  } finally {
    pollInFlight = false;
  }
}

function bootstrap() {
  registerChatCommands();
  setGameState(GAME_STATES.READY);

  system.runInterval(() => {
    system.run(() => pollBridge());
  }, CONFIG.bridge.pollIntervalTicks);

  system.runInterval(() => {
    system.run(() => {
      if (getGameState() === GAME_STATES.RUNNING) {
        gameTimer.tick();
        checkProgress();
        maybeNotifyProgress();
      }
    });
  }, TICKS_PER_SECOND);

  system.runInterval(() => {
    system.run(() => processNextQueuedEvent());
  }, CONFIG.queue.processIntervalTicks);

  system.runInterval(() => {
    system.run(() => {
      if (getGameState() === GAME_STATES.RUNNING) {
        checkProgress();
      }
    });
  }, CONFIG.game.progressCheckIntervalTicks);

  broadcast("SAB addon ready — !sab start / !sab start defend");
  broadcast(`Bridge: ${CONFIG.bridge.baseUrl}`);
  logOk("sabotage_behavior initialized");
}

system.runTimeout(() => bootstrap(), 20);

export async function probeBridgeOnReady() {
  const ok = await checkBridgeHealth();
  setBridgeConnected(ok);
}
