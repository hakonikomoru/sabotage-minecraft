import { applySlow, applyBlind, applyChicken } from "./weak-effects.js";
import { applyBlockSupport } from "./support-effects.js";
import { applyHole } from "./fill-effects.js";
import { showEventTitle, broadcast } from "./visual-effects.js";
import { isEffectRunnable } from "./registry.js";

export function executeEffect(event) {
  if (!isEffectRunnable(event.command)) {
    broadcast(`[WARN] 無効な効果: !${event.command}`);
    return;
  }
  showEventTitle(event);
  switch (event.command) {
    case "slow":
      applySlow();
      break;
    case "blind":
      applyBlind();
      break;
    case "chicken":
      applyChicken();
      break;
    case "hole":
      applyHole();
      break;
    case "block":
      applyBlockSupport();
      break;
    default:
      break;
  }
}
