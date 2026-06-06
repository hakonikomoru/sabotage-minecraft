export const CONFIG = {
  bridge: {
    baseUrl: "http://127.0.0.1:8787",
    apiKey: "change-me",
    pollIntervalTicks: 40,
    maxEventsPerPoll: 5,
  },

  game: {
    defaultMode: "fill_challenge",
    availableModes: ["fill_challenge", "fill_and_defend", "bedrock_box"],
    durationSeconds: 10 * 60,
    progressCheckIntervalTicks: 100,
    progressNotifyIntervalSeconds: 30,
    warningSeconds: [300, 180, 60, 30, 10],
    mainPlayerName: null,
  },

  world: {
    lockDaytime: true,
    timeOfDay: 6000,
  },

  fillChallenge: {
    size: 10,
    structureSize: 12,
    targetBlock: "minecraft:white_wool",
    baseBlock: "minecraft:black_concrete",
    borderBlock: "minecraft:yellow_concrete",
    requiredRate: 0.9,
    requiredCount: 90,
    totalCells: 100,
    initialWoolAmount: 128,
    durationSeconds: 10 * 60,
    winTiming: "on_reach",
    fieldOffsetX: 3,
    fieldOffsetZ: 3,
  },

  fillAndDefend: {
    size: 10,
    structureSize: 12,
    targetBlock: "minecraft:white_wool",
    baseBlock: "minecraft:black_concrete",
    borderBlock: "minecraft:yellow_concrete",
    requiredRate: 0.9,
    requiredCount: 90,
    totalCells: 100,
    initialWoolAmount: 160,
    durationSeconds: 10 * 60,
    winTiming: "on_time_up",
    fieldOffsetX: 3,
    fieldOffsetZ: 3,
  },

  bedrockBoxMode: {
    size: 10,
    structureSize: 13,
    targetBlock: "minecraft:white_wool",
    acceptAnyFillBlock: true,
    baseBlock: "minecraft:black_concrete",
    borderBlock: "minecraft:yellow_concrete",
    requiredRate: 0.9,
    requiredCount: 90,
    totalCells: 100,
    initialWoolAmount: 128,
    durationSeconds: 10 * 60,
    winTiming: "on_reach",
  },

  bedrockBox: {
    enabled: true,
    yOffset: 24,
    arenaSize: 13,
    wallHeight: 9,
    floorBlock: "minecraft:gray_concrete",
    wallBlock: "minecraft:glass",
    teleportPlayerOnStart: true,
    restorePlayerOnReset: true,
  },

  queue: {
    maxSize: 50,
    processIntervalTicks: 60,
  },

  safety: {
    enableStrongEffects: false,
    enableMediumEffects: false,
    enableSuperChatEffects: false,
    enableMemberEffects: false,
    removeDangerousEntitiesOnStop: true,
  },

  admin: {
    playerNames: ["hakonikomoru"],
  },

  arena: {
    enabled: true,
    yOffset: 24,
    size: 24,
    floorBlock: "minecraft:gray_concrete",
    wallBlock: "minecraft:glass",
    wallHeight: 2,
    teleportPlayerOnStart: true,
    restorePlayerOnReset: true,
  },

  menuItem: {
    typeId: "minecraft:clock",
    nameTag: "SAB:menu",
  },

  /** Future: additional named item shortcuts */
  menuItems: {
    clock: "SAB:menu",
    start: "SAB:start",
    stop: "SAB:stop",
    pause: "SAB:pause",
    resume: "SAB:resume",
    status: "SAB:status",
    clear: "SAB:clear",
    reset: "SAB:reset",
  },
};

export const MODE_DISPLAY_NAMES = {
  fill_challenge: "Fill Challenge (10 min)",
  fill_and_defend: "Fill and Defend (10 min)",
  bedrock_box: "BedrockBox Challenge",
};

export const EFFECT_LABELS = {
  slow: "Slowness for 10 seconds!",
  blind: "Blindness!",
  chicken: "Chicken party!",
  hole: "Floor blocks removed!",
  block: "White wool +16!",
};

export const GAME_STATES = {
  IDLE: "idle",
  READY: "ready",
  RUNNING: "running",
  PAUSED: "paused",
  FINISHED: "finished",
  EMERGENCY_STOPPED: "emergencyStopped",
};

/** @typedef {"fill_challenge" | "fill_and_defend" | "bedrock_box"} SabotageMode */
