import { system, world, Difficulty } from "@minecraft/server";
import { CONFIG, GAME_STATES } from "./config.js";
import {
  getGameState,
  setGameState,
  getField,
  updateBridgeConnected,
  canAcceptYoutubeEvents,
} from "./state.js";
import {
  registerChatCommands,
  processNextQueuedEvent,
  handleSystemEvent,
  handleSabCommand,
} from "./command-router.js";
import { registerMenuItem } from "./ui/menu-item.js";
import { registerStatusGauge } from "./ui/status-gauge.js";
import { registerTntQueueTicker } from "./effects/tnt-queue.js";
import { gameTimer } from "./timer.js";
import { eventQueue } from "./event-queue.js";
import {
  checkProgress,
  maybeNotifyProgress,
} from "./modes/mode-manager.js";
import { tickBedrockBoxHold } from "./modes/bedrock-box-win.js";
import {
  fetchPendingEvents,
  ackEvents,
  checkBridgeHealth,
} from "./integrations/bridge-client.js";
import { broadcast } from "./effects/visual-effects.js";
import { logOk } from "./utils/logger.js";
import { registerBedrockBoxPlaceHandler } from "./modes/bedrock-box-layers.js";
import { registerBedrockBoxProtection } from "./modes/bedrock-box-protection.js";
import { registerWorldPlayerSettings } from "./world-player-settings.js";
import { showStreamChat } from "./ui/chat-display.js";
import { restorePersistedBedrockBoxField } from "./modes/fill-field.js";
import { hasPersistedBedrockBoxMeta } from "./modes/field-persistence.js";

console.warn("[SAB] sabotage-minecraft addon loaded");

const TICKS_PER_SECOND = 20;
const DAYTIME_LOCK_INTERVAL_TICKS = 200;
let pollInFlight = false;

function lockWorldDaytime() {
  if (CONFIG.world?.lockDaytime === false) return;

  try {
    if (world.gameRules) {
      world.gameRules.doDaylightCycle = false;
    }
    world.setTimeOfDay(CONFIG.world?.timeOfDay ?? 6000);
  } catch (error) {
    console.warn(
      `[SAB] Could not lock daytime: ${error?.message ?? error}`,
    );
  }
}

async function pollBridge() {
  if (pollInFlight) return;
  if (!canAcceptYoutubeEvents()) return;

  pollInFlight = true;
  try {
    const events = await fetchPendingEvents(getGameState());
    updateBridgeConnected(true);

    if (events.length > 0) {
      console.warn(`[SAB] Received events: ${events.length}`);
    }

    const ackIds = [];
    for (const event of events) {
      if (event.type === "chat") {
        showStreamChat(event);
        ackIds.push(event.id);
        continue;
      }
      if (event.type === "system") {
        handleSystemEvent(event);
        ackIds.push(event.id);
        continue;
      }
      if (eventQueue.enqueue(event)) {
        console.warn(`[SAB] Queue event from bridge: ${event.command}`);
        ackIds.push(event.id);
      }
    }

    if (ackIds.length > 0) {
      try {
        const result = await ackEvents(ackIds, getGameState());
        const acked = result?.acked ?? ackIds.length;
        console.warn(`[SAB] Acked events: ${acked}`);
      } catch (error) {
        console.warn(`[SAB] Ack failed: ${error?.message ?? error}`);
      }
    }
  } catch {
    updateBridgeConnected(false);
  } finally {
    pollInFlight = false;
  }
}

function registerBedrockBoxRestoreOnJoin() {
  const spawnEvent = world.afterEvents?.playerSpawn;
  if (!spawnEvent) return;

  spawnEvent.subscribe(() => {
    system.run(() => {
      if (getField()?.modeId === "bedrock_box") return;
      if (!hasPersistedBedrockBoxMeta()) return;
      restorePersistedBedrockBoxField();
    });
  });
}

function bootstrap() {
  try {
    world.setDifficulty(Difficulty.Peaceful);
  } catch (error) {
    console.warn(
      `[SAB] Could not set difficulty to peaceful: ${error?.message ?? error}`,
    );
  }

  lockWorldDaytime();

  registerChatCommands();
  registerWorldPlayerSettings();
  registerBedrockBoxPlaceHandler();
  registerBedrockBoxProtection();
  registerMenuItem((player, args) => handleSabCommand(player, args));
  registerStatusGauge();
  registerTntQueueTicker();
  registerBedrockBoxRestoreOnJoin();
  restorePersistedBedrockBoxField();
  setGameState(GAME_STATES.READY);

  system.runInterval(() => {
    system.run(() => {
      pollBridge().catch(() => {
        updateBridgeConnected(false);
      });
    });
  }, CONFIG.bridge.pollIntervalTicks);

  system.runInterval(() => {
    system.run(() => {
      if (getGameState() === GAME_STATES.RUNNING) {
        gameTimer.tick();
        tickBedrockBoxHold();
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

  system.runInterval(() => {
    system.run(lockWorldDaytime);
  }, DAYTIME_LOCK_INTERVAL_TICKS);

  broadcast("SAB addon ready - use /scriptevent sab:command start");
  broadcast("SAB command ready - use /scriptevent sab:command status");
  broadcast(`Bridge: ${CONFIG.bridge.baseUrl}`);
  logOk("sabotage_behavior initialized");
}

system.runTimeout(() => bootstrap(), 20);

export async function probeBridgeOnReady() {
  const ok = await checkBridgeHealth();
  updateBridgeConnected(ok);
}
