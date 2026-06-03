import type { CheerTier } from "../../types.js";

export function getCheerTier(bits: number): CheerTier {
  if (bits >= 5000) return "special";
  if (bits >= 2000) return "large";
  if (bits >= 500) return "medium";
  return "small";
}

/** MVP 後: Bits は演出ルーレット。直接 TNT 等は選ばない */
export function cheerTierToRouletteCommand(_tier: CheerTier): string {
  return "cheer_roulette";
}
