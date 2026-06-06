import { CONFIG, GAME_STATES } from "./config.js";

const state = {
  gameState: GAME_STATES.READY,
  currentMode: CONFIG.game.defaultMode,
  mainPlayerName: null,
  field: null,
  bridgeConnected: false,
  lastProgressNotifyAt: 0,
  winResult: null,
};

export function getGameState() {
  return state.gameState;
}

export function setGameState(next) {
  state.gameState = next;
}

export function getCurrentMode() {
  return state.currentMode;
}

export function setCurrentMode(modeId) {
  state.currentMode = modeId;
}

export function getMainPlayerName() {
  return state.mainPlayerName ?? CONFIG.game.mainPlayerName;
}

export function setMainPlayerName(name) {
  state.mainPlayerName = name;
  CONFIG.game.mainPlayerName = name;
}

export function getField() {
  return state.field;
}

export function setField(field) {
  state.field = field;
}

export function clearField() {
  state.field = null;
}

export function setBridgeConnected(connected) {
  state.bridgeConnected = connected;
}

/** Logs only when the connection state changes. */
export function updateBridgeConnected(connected) {
  if (state.bridgeConnected === connected) {
    return false;
  }
  state.bridgeConnected = connected;
  console.warn(connected ? "[SAB] Bridge connected" : "[SAB] Bridge disconnected");
  return true;
}

export function isBridgeConnected() {
  return state.bridgeConnected;
}

export function setWinResult(result) {
  state.winResult = result;
}

export function getWinResult() {
  return state.winResult;
}

export function resetState() {
  state.gameState = GAME_STATES.IDLE;
  state.mainPlayerName = null;
  CONFIG.game.mainPlayerName = null;
  state.winResult = null;
  state.lastProgressNotifyAt = 0;
}

export function canAcceptYoutubeEvents() {
  return (
    state.gameState === GAME_STATES.RUNNING ||
    state.gameState === GAME_STATES.PAUSED
  );
}

export function canProcessEvents() {
  return state.gameState === GAME_STATES.RUNNING;
}

export function canChangeMode() {
  return (
    state.gameState !== GAME_STATES.RUNNING &&
    state.gameState !== GAME_STATES.PAUSED
  );
}

export function getLastProgressNotifyAt() {
  return state.lastProgressNotifyAt;
}

export function setLastProgressNotifyAt(value) {
  state.lastProgressNotifyAt = value;
}
