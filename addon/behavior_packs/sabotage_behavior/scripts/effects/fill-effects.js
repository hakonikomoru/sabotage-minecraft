import { getField } from "../state.js";
import { getWoolPositions } from "../modes/fill-field.js";
import { setBlockSafe } from "../utils/blocks.js";
import { pickRandomItems } from "../utils/random.js";
import { getDimensionFromField } from "../modes/fill-field.js";

export function applyHole() {
  const field = getField();
  if (!field) return;
  const dimension = getDimensionFromField(field);
  if (!dimension) return;

  const woolPositions = getWoolPositions(field);
  const targets = pickRandomItems(woolPositions, 3);
  for (const pos of targets) {
    setBlockSafe(dimension, pos, field.baseBlock);
  }
}
