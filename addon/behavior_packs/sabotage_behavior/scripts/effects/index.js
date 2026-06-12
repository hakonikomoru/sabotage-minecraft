import { applySlow, applyBlind, applyChicken } from "./weak-effects.js";
import { applyBlockSupport } from "./support-effects.js";
import { applyHole } from "./fill-effects.js";
import {
  applyBoxCommentFirst,
  applyBoxCommentRepeat,
  applyBoxFollow,
  applyBoxSubscribe,
  applyBoxChannelPoint,
  applyBoxBits,
  applyBoxGiftSub,
  canRunBedrockBoxEffect,
} from "./box-effects.js";
import { showEventTitle, broadcast } from "./visual-effects.js";
import { isEffectRunnable } from "./registry.js";

export function executeEffect(event) {
  if (!isEffectRunnable(event.command)) {
    broadcast(`[WARN] Invalid effect: !${event.command}`);
    return;
  }

  if (event.command.startsWith("box_")) {
    if (!canRunBedrockBoxEffect()) {
      return;
    }
  }

  broadcast(`Effect executed: ${event.command}`);
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
    case "box_comment_first":
      applyBoxCommentFirst();
      break;
    case "box_comment_repeat":
      applyBoxCommentRepeat();
      break;
    case "box_follow":
      applyBoxFollow();
      break;
    case "box_subscribe":
      applyBoxSubscribe();
      break;
    case "box_channel_point":
      applyBoxChannelPoint();
      break;
    case "box_bits":
      applyBoxBits(event);
      break;
    case "box_gift_sub":
      applyBoxGiftSub();
      break;
    default:
      break;
  }
}
