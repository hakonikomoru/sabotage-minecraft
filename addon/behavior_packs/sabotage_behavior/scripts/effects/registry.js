import { CONFIG } from "../config.js";

export const EFFECT_REGISTRY = {
  slow: {
    command: "slow",
    category: "movement",
    risk: "safe",
    enabled: true,
    cooldownSeconds: 10,
  },
  blind: {
    command: "blind",
    category: "vision",
    risk: "safe",
    enabled: true,
    cooldownSeconds: 10,
  },
  chicken: {
    command: "chicken",
    category: "mob",
    risk: "safe",
    enabled: true,
    cooldownSeconds: 15,
  },
  hole: {
    command: "hole",
    category: "field",
    risk: "safe",
    enabled: true,
    cooldownSeconds: 15,
  },
  block: {
    command: "block",
    category: "support",
    risk: "safe",
    enabled: true,
    cooldownSeconds: 20,
  },
  tnt: {
    command: "tnt",
    category: "field",
    risk: "dangerous",
    enabled: false,
    cooldownSeconds: 120,
  },
  creeper: {
    command: "creeper",
    category: "mob",
    risk: "dangerous",
    enabled: false,
    cooldownSeconds: 120,
  },
  erase: {
    command: "erase",
    category: "field",
    risk: "dangerous",
    enabled: false,
    cooldownSeconds: 90,
  },
};

export function getEffectDefinition(command) {
  return EFFECT_REGISTRY[command] ?? null;
}

export function isEffectRunnable(command) {
  const def = getEffectDefinition(command);
  if (!def?.enabled) return false;
  if (def.risk === "dangerous" && !CONFIG.safety.enableStrongEffects) {
    return false;
  }
  if (def.risk === "medium" && !CONFIG.safety.enableMediumEffects) {
    return false;
  }
  return true;
}
