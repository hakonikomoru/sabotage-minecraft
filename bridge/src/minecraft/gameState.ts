/** Tracks Sabotage game activity reported by the Minecraft addon poll loop. */

let sabGameActive = false;
let lastReportedState: string | null = null;

const ACTIVE_STATES = new Set(["running", "paused"]);

export function updateSabGameState(stateHeader: string | string[] | undefined): void {
  const state = Array.isArray(stateHeader) ? stateHeader[0] : stateHeader;
  if (!state) {
    return;
  }

  if (state === lastReportedState) {
    return;
  }

  lastReportedState = state;
  sabGameActive = ACTIVE_STATES.has(state);
}

export function isSabGameActive(): boolean {
  return sabGameActive;
}

export function getSabGameStateLabel(): string {
  return lastReportedState ?? "unknown";
}
