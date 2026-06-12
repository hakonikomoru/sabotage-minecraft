export const CONFIG = {
  bridge: {
    baseUrl: "http://127.0.0.1:8787",
    apiKey: "change-me",
    pollIntervalTicks: 40,
    maxEventsPerPoll: 5,
  },

  chatDisplay: {
    enabled: true,
    maxMessageLength: 60,
    showInGameChat: true,
    showActionBar: true,
    platformLabels: {
      twitch: "Twitch",
      youtube: "YouTube",
    },
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
    /**
     * BedrockBox: script raycast place range (Bedrock has no /attribute command).
     * Also used for server.properties block-breaking scalar in start-local-dev.ps1.
     */
    blockInteractionRange: 20,
    /** Vanilla reach — inside this distance vanilla placement handles blocks. */
    vanillaBlockReach: 5,
    /** Play fill sounds at the player when the block is farther than this (blocks). */
    blockPlaceSoundMinDistance: 6,
    /** Volume for remote place sounds (played at player position). */
    blockPlaceSoundVolume: 2,
    blockPlaceSoundPitch: 1,
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
    /** Inner fill area 11×11 (structureSize 13 = border + 11 + border). */
    size: 11,
    structureSize: 13,
    targetBlock: "minecraft:white_wool",
    acceptAnyFillBlock: true,
    baseBlock: "minecraft:black_concrete",
    borderBlock: "minecraft:yellow_concrete",
    requiredRate: 1,
    requiredCount: 1089,
    totalCells: 1089,
    initialWoolAmount: 128,
    unlimitedTime: true,
    /** Win after staying 100% full for this many seconds. */
    holdSeconds: 10,
    winTiming: "on_full_hold",
  },

  statusGauge: {
    enabled: true,
    /** actionBar | sidebar | both — sidebar keeps chat on the action bar free. */
    display: "sidebar",
    label: "箱",
    sidebarTitle: "§6箱",
    barWidth: 20,
    /** Sidebar: 5 blocks, one lights up every 20%. */
    sidebarSegments: 5,
    updateIntervalTicks: 10,
    sidebarObjectiveId: "sab_box_fill",
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
    /** Floor, walls, and border cannot be broken (TNT on fill blocks still works). */
    protectStructure: true,
    giftSubTntCount: 100,
    emeraldDropHeight: 8,
    tntQueue: {
      maxPending: 500,
      spawnIntervalTicks: 20,
      spawnHeightAbove: 6,
    },
    /** Placed blocks convert by layer (1 = above floor). Matches StreamToEarn Bedrock Box tiers. */
    layerTiers: [
      { minLayer: 1, maxLayer: 3, block: "minecraft:iron_block" },
      { minLayer: 4, maxLayer: 6, block: "minecraft:gold_block" },
      { minLayer: 7, maxLayer: 9, block: "minecraft:diamond_block" },
    ],
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
  bedrock_box: "BedrockBox",
};

export const EFFECT_LABELS = {
  slow: "Slowness for 10 seconds!",
  blind: "Blindness!",
  chicken: "Chicken party!",
  hole: "Floor blocks removed!",
  block: "White wool +16!",
  box_comment_first: "First comment — top layer removed!",
  box_comment_repeat: "Repeat comment — emerald inside the box!",
  box_follow: "Top 3 layers removed!",
  box_subscribe: "Top 9 layers removed!",
  box_channel_point: "TNT incoming!",
  box_bits: "TNT from bits!",
  box_gift_sub: "TNT rain from gift sub!",
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
