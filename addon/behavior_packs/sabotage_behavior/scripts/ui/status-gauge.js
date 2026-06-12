import { system, world, DisplaySlotId, ObjectiveSortOrder } from "@minecraft/server";
import { CONFIG, GAME_STATES } from "../config.js";
import { getCurrentMode, getField, getGameState } from "../state.js";
import { getProgress } from "../modes/fill-progress.js";
import { getAllGamePlayers } from "../utils/players.js";

function getGaugeConfig() {
  return CONFIG.statusGauge ?? CONFIG.boxProgressHud ?? {};
}

function usesDisplay(name) {
  const cfg = getGaugeConfig();
  const display = (cfg.display ?? "sidebar").toLowerCase();
  if (display === "both") return true;
  return display === name.toLowerCase();
}

/**
 * @param {{ placed: number, total: number, required: number, ratePercent: number }} progress
 * @param {{ width?: number, segments?: number }} [options]
 */
export function formatStatusGaugeBar(progress, options = {}) {
  const cfg = getGaugeConfig();
  const pct = Math.min(100, Math.max(0, progress.ratePercent));

  if (options.segments) {
    const segments = options.segments;
    const step = 100 / segments;
    const filled = Math.min(segments, Math.floor(pct / step));
    const empty = segments - filled;
    return {
      pct,
      filledBar: `§a${"█".repeat(filled)}`,
      emptyBar: `§8${"█".repeat(empty)}`,
      bar: `§a${"█".repeat(filled)}§8${"█".repeat(empty)}`,
    };
  }

  const width = options.width ?? cfg.barWidth ?? 20;
  const filled = Math.min(
    width,
    Math.max(0, Math.round((pct / 100) * width)),
  );
  const empty = width - filled;
  return {
    pct,
    filledBar: `§a${"█".repeat(filled)}`,
    emptyBar: `§8${"█".repeat(empty)}`,
    bar: `§a${"█".repeat(filled)}§8${"█".repeat(empty)}`,
  };
}

/**
 * @param {{ placed: number, total: number, required: number, ratePercent: number }} progress
 */
export function formatStatusGaugeActionBar(progress) {
  const cfg = getGaugeConfig();
  const label = cfg.label ?? "箱";
  const { bar, pct } = formatStatusGaugeBar(progress);
  return `§6${label} §f${bar} §e${pct}% §7(${progress.placed}/${progress.total})`;
}

/** @deprecated Use formatStatusGaugeActionBar */
export const formatBoxProgressBossBar = formatStatusGaugeActionBar;

function getSidebarObjective() {
  const cfg = getGaugeConfig();
  const objectiveId = cfg.sidebarObjectiveId ?? "sab_box_fill";
  const displayName = cfg.sidebarTitle ?? `§6${cfg.label ?? "箱"}`;

  let objective = world.scoreboard.getObjective(objectiveId);
  if (!objective) {
    objective = world.scoreboard.addObjective(objectiveId, displayName);
  }

  world.scoreboard.setObjectiveAtDisplaySlot(DisplaySlotId.Sidebar, {
    objective,
    sortOrder: ObjectiveSortOrder.Descending,
  });

  return objective;
}

function updateSidebarGauge(progress) {
  const cfg = getGaugeConfig();
  const { bar, pct } = formatStatusGaugeBar(progress, {
    segments: cfg.sidebarSegments ?? 5,
  });
  const objective = getSidebarObjective();

  for (const entry of objective.getScores()) {
    try {
      objective.removeParticipant(entry.participant);
    } catch {
      // ignore
    }
  }

  objective.setScore(bar, 100);
  objective.setScore(
    `§e${pct}% §7(${progress.placed}/${progress.total})`,
    99,
  );
}

function clearSidebarGauge() {
  const cfg = getGaugeConfig();
  const objectiveId = cfg.sidebarObjectiveId ?? "sab_box_fill";
  const objective = world.scoreboard.getObjective(objectiveId);
  if (!objective) return;

  for (const entry of objective.getScores()) {
    try {
      objective.removeParticipant(entry.participant);
    } catch {
      // ignore
    }
  }

  const slot = world.scoreboard.getObjectiveAtDisplaySlot(DisplaySlotId.Sidebar);
  if (slot?.objective?.id === objectiveId) {
    world.scoreboard.clearObjectiveAtDisplaySlot(DisplaySlotId.Sidebar);
  }
}

function isGaugeActive() {
  const cfg = getGaugeConfig();
  if (cfg.enabled === false) return false;
  if (getGameState() !== GAME_STATES.RUNNING) return false;
  if (getCurrentMode() !== "bedrock_box") return false;
  return Boolean(getField());
}

export function updateStatusGauge() {
  if (!isGaugeActive()) {
    if (usesDisplay("sidebar")) {
      clearSidebarGauge();
    }
    return;
  }

  const progress = getProgress(getField(), "bedrock_box");

  if (usesDisplay("sidebar")) {
    updateSidebarGauge(progress);
  }

  if (usesDisplay("actionbar")) {
    const text = formatStatusGaugeActionBar(progress);
    for (const player of getAllGamePlayers()) {
      try {
        player.onScreenDisplay.setActionBar(text);
      } catch {
        // ignore
      }
    }
  }
}

export function registerStatusGauge() {
  const cfg = getGaugeConfig();
  if (cfg.enabled === false) return;

  const intervalTicks = cfg.updateIntervalTicks ?? 10;
  system.runInterval(() => {
    system.run(() => updateStatusGauge());
  }, intervalTicks);

  console.warn(
    `[SAB] Status gauge registered (display=${cfg.display ?? "sidebar"}).`,
  );
}

/** @deprecated Use registerStatusGauge */
export const registerBoxProgressHud = registerStatusGauge;

/** @deprecated Use updateStatusGauge */
export const updateBoxProgressHud = updateStatusGauge;
