import { CONFIG } from "../config.js";

/** @param {"fill_challenge" | "fill_and_defend"} modeId */
export function getModeConfig(modeId) {
  if (modeId === "fill_and_defend") {
    return CONFIG.fillAndDefend;
  }
  return CONFIG.fillChallenge;
}
