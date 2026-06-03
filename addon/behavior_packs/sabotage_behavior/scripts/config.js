export const CONFIG = {
  bridge: {
    baseUrl: "http://127.0.0.1:8787",
    apiKey: "change-me",
    pollIntervalTicks: 40,
    maxEventsPerPoll: 5,
  },

  game: {
    defaultMode: "fill_challenge",
    availableModes: ["fill_challenge", "fill_and_defend"],
    durationSeconds: 10 * 60,
    progressCheckIntervalTicks: 100,
    progressNotifyIntervalSeconds: 30,
    warningSeconds: [300, 180, 60, 30, 10],
    mainPlayerName: null,
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
    playerNames: [],
  },

  /** 将来: 名前付きアイテムメニュー（MVP では未実装） */
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
  fill_challenge: "10分ブロック埋めチャレンジ",
  fill_and_defend: "ブロック埋め防衛チャレンジ",
};

export const EFFECT_LABELS = {
  slow: "鈍足10秒！",
  blind: "画面が見えない！",
  chicken: "ニワトリパーティー！",
  hole: "埋めた床が消えた！",
  block: "白色の羊毛 +16！",
};

export const GAME_STATES = {
  IDLE: "idle",
  READY: "ready",
  RUNNING: "running",
  PAUSED: "paused",
  FINISHED: "finished",
  EMERGENCY_STOPPED: "emergencyStopped",
};

/** @typedef {"fill_challenge" | "fill_and_defend"} SabotageMode */
