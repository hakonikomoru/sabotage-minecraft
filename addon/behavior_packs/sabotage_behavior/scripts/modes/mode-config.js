import { CONFIG } from "../config.js";

/** @param {import("../config.js").SabotageMode} modeId */
export function getModeConfig(modeId) {
  if (modeId === "fill_and_defend") {
    return CONFIG.fillAndDefend;
  }
  if (modeId === "bedrock_box") {
    return CONFIG.bedrockBoxMode;
  }
  return CONFIG.fillChallenge;
}
