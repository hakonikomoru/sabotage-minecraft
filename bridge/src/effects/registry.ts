import type { SabotageEventTier } from "../types.js";

export type EffectCategory =
  | "movement"
  | "vision"
  | "mob"
  | "field"
  | "support"
  | "visual"
  | "system";

export type EffectRisk = "safe" | "medium" | "dangerous";

export type EffectDefinition = {
  command: string;
  category: EffectCategory;
  risk: EffectRisk;
  type: "sabotage" | "support" | "effect" | "system";
  tier: SabotageEventTier;
  enabled: boolean;
  cooldownSeconds: number;
  /** Skip per-user cooldown (e.g. box_comment_* fires on every chat message). */
  skipUserCooldown?: boolean;
};

export const EFFECT_REGISTRY: Record<string, EffectDefinition> = {
  // MVP — safe only, enabled
  slow: {
    command: "slow",
    category: "movement",
    risk: "safe",
    type: "sabotage",
    tier: "weak",
    enabled: true,
    cooldownSeconds: 10,
  },
  blind: {
    command: "blind",
    category: "vision",
    risk: "safe",
    type: "sabotage",
    tier: "weak",
    enabled: true,
    cooldownSeconds: 10,
  },
  chicken: {
    command: "chicken",
    category: "mob",
    risk: "safe",
    type: "sabotage",
    tier: "weak",
    enabled: true,
    cooldownSeconds: 15,
  },
  hole: {
    command: "hole",
    category: "field",
    risk: "safe",
    type: "sabotage",
    tier: "weak",
    enabled: true,
    cooldownSeconds: 15,
  },
  block: {
    command: "block",
    category: "support",
    risk: "safe",
    type: "support",
    tier: "weak",
    enabled: true,
    cooldownSeconds: 20,
  },

  // Future — medium (initial OFF via enabled: false)
  jump: {
    command: "jump",
    category: "movement",
    risk: "medium",
    type: "sabotage",
    tier: "medium",
    enabled: false,
    cooldownSeconds: 15,
  },
  zombie: {
    command: "zombie",
    category: "mob",
    risk: "medium",
    type: "sabotage",
    tier: "medium",
    enabled: false,
    cooldownSeconds: 60,
  },
  paint: {
    command: "paint",
    category: "field",
    risk: "medium",
    type: "sabotage",
    tier: "medium",
    enabled: false,
    cooldownSeconds: 30,
  },
  shuffle: {
    command: "shuffle",
    category: "field",
    risk: "medium",
    type: "sabotage",
    tier: "medium",
    enabled: false,
    cooldownSeconds: 45,
  },
  speed: {
    command: "speed",
    category: "support",
    risk: "medium",
    type: "support",
    tier: "medium",
    enabled: false,
    cooldownSeconds: 20,
  },
  protect: {
    command: "protect",
    category: "support",
    risk: "medium",
    type: "support",
    tier: "medium",
    enabled: false,
    cooldownSeconds: 60,
  },
  repair: {
    command: "repair",
    category: "field",
    risk: "medium",
    type: "support",
    tier: "medium",
    enabled: false,
    cooldownSeconds: 30,
  },

  // Future — dangerous (initial OFF)
  tnt: {
    command: "tnt",
    category: "field",
    risk: "dangerous",
    type: "sabotage",
    tier: "strong",
    enabled: false,
    cooldownSeconds: 120,
  },
  creeper: {
    command: "creeper",
    category: "mob",
    risk: "dangerous",
    type: "sabotage",
    tier: "strong",
    enabled: false,
    cooldownSeconds: 120,
  },
  erase: {
    command: "erase",
    category: "field",
    risk: "dangerous",
    type: "sabotage",
    tier: "strong",
    enabled: false,
    cooldownSeconds: 90,
  },
  mob_rush: {
    command: "mob_rush",
    category: "mob",
    risk: "dangerous",
    type: "sabotage",
    tier: "strong",
    enabled: false,
    cooldownSeconds: 120,
  },

  // Admin / system
  pause: {
    command: "pause",
    category: "system",
    risk: "safe",
    type: "system",
    tier: "special",
    enabled: true,
    cooldownSeconds: 0,
  },
  resume: {
    command: "resume",
    category: "system",
    risk: "safe",
    type: "system",
    tier: "special",
    enabled: true,
    cooldownSeconds: 0,
  },
  stop: {
    command: "stop",
    category: "system",
    risk: "safe",
    type: "system",
    tier: "special",
    enabled: true,
    cooldownSeconds: 0,
  },
  clearqueue: {
    command: "clearqueue",
    category: "system",
    risk: "safe",
    type: "system",
    tier: "special",
    enabled: true,
    cooldownSeconds: 0,
  },
  status: {
    command: "status",
    category: "system",
    risk: "safe",
    type: "system",
    tier: "special",
    enabled: true,
    cooldownSeconds: 0,
  },

  // Twitch / 将来 — MVP では disabled
  follow_firework: {
    command: "follow_firework",
    category: "visual",
    risk: "safe",
    type: "effect",
    tier: "weak",
    enabled: false,
    cooldownSeconds: 30,
  },
  sub_support: {
    command: "sub_support",
    category: "support",
    risk: "safe",
    type: "support",
    tier: "special",
    enabled: false,
    cooldownSeconds: 0,
  },
  gift_sub_event: {
    command: "gift_sub_event",
    category: "support",
    risk: "safe",
    type: "support",
    tier: "special",
    enabled: false,
    cooldownSeconds: 0,
  },
  cheer_roulette: {
    command: "cheer_roulette",
    category: "visual",
    risk: "medium",
    type: "effect",
    tier: "medium",
    enabled: false,
    cooldownSeconds: 60,
  },

  // BedrockBox — Twitch EventSub MVP
  box_comment_first: {
    command: "box_comment_first",
    category: "field",
    risk: "safe",
    type: "sabotage",
    tier: "weak",
    enabled: true,
    cooldownSeconds: 1,
    skipUserCooldown: true,
  },
  box_comment_repeat: {
    command: "box_comment_repeat",
    category: "support",
    risk: "safe",
    type: "support",
    tier: "weak",
    enabled: true,
    cooldownSeconds: 1,
    skipUserCooldown: true,
  },
  box_follow: {
    command: "box_follow",
    category: "field",
    risk: "medium",
    type: "sabotage",
    tier: "medium",
    enabled: true,
    cooldownSeconds: 0,
  },
  box_subscribe: {
    command: "box_subscribe",
    category: "field",
    risk: "dangerous",
    type: "sabotage",
    tier: "strong",
    enabled: true,
    cooldownSeconds: 0,
  },
  box_channel_point: {
    command: "box_channel_point",
    category: "field",
    risk: "medium",
    type: "sabotage",
    tier: "medium",
    enabled: true,
    cooldownSeconds: 2,
    skipUserCooldown: true,
  },
  box_bits: {
    command: "box_bits",
    category: "field",
    risk: "medium",
    type: "sabotage",
    tier: "medium",
    enabled: true,
    cooldownSeconds: 0,
    skipUserCooldown: true,
  },
  box_gift_sub: {
    command: "box_gift_sub",
    category: "field",
    risk: "dangerous",
    type: "sabotage",
    tier: "strong",
    enabled: true,
    cooldownSeconds: 0,
  },
};

export const MVP_COMMAND_NAMES = Object.entries(EFFECT_REGISTRY)
  .filter(
    ([, def]) =>
      def.enabled &&
      def.risk === "safe" &&
      def.type !== "system" &&
      def.category !== "system",
  )
  .map(([name]) => name);

export function getEffectDefinition(command: string): EffectDefinition | null {
  return EFFECT_REGISTRY[command] ?? null;
}

export function isEffectAllowed(def: EffectDefinition): boolean {
  if (!def.enabled) return false;
  return true;
}

const BEDROCK_BOX_COMMAND_PREFIX = "box_";

export function isBedrockBoxEffect(command: string): boolean {
  return command.startsWith(BEDROCK_BOX_COMMAND_PREFIX);
}

export function isEffectAllowedBySafety(
  def: EffectDefinition,
  safety: {
    enableStrongEffects: boolean;
    enableMediumEffects: boolean;
  },
): boolean {
  if (!isEffectAllowed(def)) return false;
  if (isBedrockBoxEffect(def.command)) return true;
  if (def.risk === "dangerous" && !safety.enableStrongEffects) return false;
  if (def.risk === "medium" && !safety.enableMediumEffects) return false;
  return true;
}
