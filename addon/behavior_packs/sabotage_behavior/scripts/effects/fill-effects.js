import { getField } from "../state.js";
import { getWoolPositions } from "../modes/fill-field.js";
import { setBlockSafe } from "../utils/blocks.js";
import { pickRandomItems } from "../utils/random.js";
import { getDimensionFromField } from "../modes/fill-field.js";
import { broadcast } from "./visual-effects.js";

export function applyHole() {
  const field = getField();
  if (!field) {
    broadcast("Hole effect skipped: no field active.");
    return 0;
  }
  const dimension = getDimensionFromField(field);
  if (!dimension) {
    broadcast("Hole effect skipped: field dimension unavailable.");
    return 0;
  }

  const fillPositions = getWoolPositions(field);
  if (fillPositions.length === 0) {
    broadcast(
      field.acceptAnyFillBlock
        ? "Hole effect skipped: no fill blocks found."
        : "Hole effect skipped: no white wool blocks found.",
    );
    return 0;
  }

  const targets = pickRandomItems(fillPositions, 3);
  for (const pos of targets) {
    setBlockSafe(dimension, pos, field.baseBlock);
  }
  broadcast(
    field.acceptAnyFillBlock
      ? `Removed fill blocks: ${targets.length}`
      : `Removed white wool blocks: ${targets.length}`,
  );
  return targets.length;
}
