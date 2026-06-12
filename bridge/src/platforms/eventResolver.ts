import { config } from "../config.js";
import { parseChatCommand } from "../rules/commandParser.js";
import type {
  NormalizedStreamEvent,
  ResolvedStreamCommand,
} from "../types.js";
import {
  resolveBedrockBoxCommand,
  resolveBedrockBoxPresetCommand,
} from "./twitch/bedrockBoxCommands.js";
import { resolveRewardMapping } from "./twitch/twitchRewardMap.js";

const TWITCH_SPECIAL_COMMANDS: Record<
  string,
  ResolvedStreamCommand
> = {
  follow_firework: {
    command: "follow_firework",
    type: "effect",
    tier: "weak",
  },
  sub_support: {
    command: "sub_support",
    type: "support",
    tier: "special",
  },
  gift_sub_event: {
    command: "gift_sub_event",
    type: "support",
    tier: "special",
  },
  cheer_roulette: {
    command: "cheer_roulette",
    type: "effect",
    tier: "medium",
  },
};

export function resolveCommandFromStreamEvent(
  event: NormalizedStreamEvent,
): ResolvedStreamCommand | null {
  if (event.command) {
    const special = TWITCH_SPECIAL_COMMANDS[event.command];
    if (special) return special;
    if (config.safety.enableBedrockBoxTwitch && event.platform === "twitch") {
      const preset = resolveBedrockBoxPresetCommand(event.command);
      if (preset) return preset;
    }
  }

  if (config.safety.enableBedrockBoxTwitch && event.platform === "twitch") {
    const bedrock = resolveBedrockBoxCommand(event.source);
    if (bedrock) return bedrock;
  }

  switch (event.source) {
    case "normalChat":
    case "twitchChat": {
      const parsed = parseChatCommand(event.message ?? "");
      if (!parsed) return null;
      return {
        command: parsed.command,
        type:
          parsed.type === "admin"
            ? "system"
            : parsed.type === "support"
              ? "support"
              : "sabotage",
        tier: parsed.tier,
      };
    }
    case "channelPoint": {
      const mapping = resolveRewardMapping(
        event.rewardId,
        event.rewardTitle,
      );
      if (!mapping) return null;
      return {
        command: mapping.command,
        type: mapping.type,
        tier: mapping.tier,
      };
    }
    case "cheer":
      return TWITCH_SPECIAL_COMMANDS.cheer_roulette ?? null;
    case "follow":
      return TWITCH_SPECIAL_COMMANDS.follow_firework ?? null;
    case "subscribe":
      return TWITCH_SPECIAL_COMMANDS.sub_support ?? null;
    case "giftSub":
      return TWITCH_SPECIAL_COMMANDS.gift_sub_event ?? null;
    case "debug":
      if (event.command) {
        return {
          command: event.command,
          type: event.command === "block" ? "support" : "sabotage",
          tier: "weak",
        };
      }
      return null;
    case "owner":
    case "moderator": {
      const parsed = parseChatCommand(event.message ?? "");
      if (!parsed) return null;
      if (parsed.type === "admin") {
        return {
          command: parsed.command,
          type: "system",
          tier: parsed.tier,
        };
      }
      return {
        command: parsed.command,
        type: parsed.type === "support" ? "support" : "sabotage",
        tier: parsed.tier,
      };
    }
    default:
      return null;
  }
}

export function isAdminStreamEvent(event: NormalizedStreamEvent): boolean {
  return Boolean(event.isOwner || event.isModerator);
}
