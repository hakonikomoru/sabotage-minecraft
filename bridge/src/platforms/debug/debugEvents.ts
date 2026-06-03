import type { NormalizedStreamEvent } from "../../types.js";

export function debugToNormalizedStreamEvent(input: {
  id: string;
  command: string;
  authorName: string;
}): NormalizedStreamEvent {
  return {
    id: input.id,
    platform: "debug",
    source: "debug",
    authorName: input.authorName,
    message: `!${input.command}`,
    command: input.command,
    createdAt: new Date().toISOString(),
  };
}
