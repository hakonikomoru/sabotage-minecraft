import { getEffectDefinition } from "../effects/registry.js";

export type ParsedCommand = {
  command: string;
  type: "sabotage" | "support" | "admin";
  tier: "weak" | "medium" | "strong" | "special";
};

const ADMIN_COMMANDS = new Set([
  "pause",
  "resume",
  "stop",
  "clearqueue",
  "status",
]);

export function parseChatCommand(messageText: string): ParsedCommand | null {
  const trimmed = messageText.trim();
  if (!trimmed.startsWith("!")) {
    return null;
  }

  const body = trimmed.slice(1).trim().toLowerCase();
  const [rawCommand] = body.split(/\s+/);
  if (!rawCommand) return null;

  if (ADMIN_COMMANDS.has(rawCommand)) {
    return {
      command: rawCommand,
      type: "admin",
      tier: "special",
    };
  }

  const def = getEffectDefinition(rawCommand);
  if (!def || def.category === "system") {
    return null;
  }

  return {
    command: rawCommand,
    type: def.type === "support" ? "support" : "sabotage",
    tier: def.tier,
  };
}

export { MVP_COMMAND_NAMES } from "../effects/registry.js";
