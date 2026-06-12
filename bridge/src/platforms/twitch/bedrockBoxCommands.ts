import type { ResolvedStreamCommand } from "../../types.js";

/** BedrockBox Twitch → Minecraft command mapping (MVP). */
export const BEDROCK_BOX_COMMANDS = {
  commentFirst: "box_comment_first",
  commentRepeat: "box_comment_repeat",
  follow: "box_follow",
  subscribe: "box_subscribe",
  channelPoint: "box_channel_point",
  bits: "box_bits",
  giftSub: "box_gift_sub",
} as const;

/** Future: box_poll, box_prediction, box_hype_train */

export function resolveBedrockBoxPresetCommand(
  command: string,
): ResolvedStreamCommand | null {
  switch (command) {
    case BEDROCK_BOX_COMMANDS.commentFirst:
      return { command, type: "sabotage", tier: "weak" };
    case BEDROCK_BOX_COMMANDS.commentRepeat:
      return { command, type: "support", tier: "weak" };
    default:
      return null;
  }
}

export function resolveBedrockBoxCommand(
  source: string,
): ResolvedStreamCommand | null {
  switch (source) {
    case "follow":
      return {
        command: BEDROCK_BOX_COMMANDS.follow,
        type: "sabotage",
        tier: "medium",
      };
    case "subscribe":
      return {
        command: BEDROCK_BOX_COMMANDS.subscribe,
        type: "sabotage",
        tier: "strong",
      };
    case "channelPoint":
      return {
        command: BEDROCK_BOX_COMMANDS.channelPoint,
        type: "sabotage",
        tier: "medium",
      };
    case "cheer":
      return {
        command: BEDROCK_BOX_COMMANDS.bits,
        type: "sabotage",
        tier: "medium",
      };
    case "giftSub":
      return {
        command: BEDROCK_BOX_COMMANDS.giftSub,
        type: "sabotage",
        tier: "strong",
      };
    default:
      return null;
  }
}
