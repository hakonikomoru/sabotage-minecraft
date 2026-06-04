import { world } from "@minecraft/server";
import { CONFIG } from "./config.js";

const WARNING_MESSAGES = {
  300: "5 minutes remaining",
  180: "3 minutes remaining",
  60: "1 minute remaining - last sprint!",
  30: "30 seconds remaining!",
};

export class GameTimer {
  constructor() {
    this.remainingSeconds = 0;
    this.active = false;
    this.paused = false;
    this.firedWarnings = new Set();
    this.onFinish = null;
  }

  start(onFinish, durationSeconds) {
    const duration =
      durationSeconds ?? CONFIG.game.durationSeconds;
    this.remainingSeconds = duration;
    this.active = true;
    this.paused = false;
    this.firedWarnings.clear();
    this.onFinish = onFinish ?? null;
  }

  pause() {
    if (!this.active) return;
    this.paused = true;
  }

  resume() {
    if (!this.active) return;
    this.paused = false;
  }

  stop() {
    this.active = false;
    this.paused = false;
    this.remainingSeconds = 0;
    this.firedWarnings.clear();
    this.onFinish = null;
  }

  isActive() {
    return this.active;
  }

  getRemainingSeconds() {
    return this.remainingSeconds;
  }

  formatRemaining() {
    const minutes = Math.floor(this.remainingSeconds / 60);
    const seconds = this.remainingSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  tick() {
    if (!this.active || this.paused) return;

    if (this.remainingSeconds <= 0) {
      this.finish();
      return;
    }

    this.fireWarnings();
    this.remainingSeconds -= 1;

    if (this.remainingSeconds <= 0) {
      this.finish();
    }
  }

  fireWarnings() {
    for (const threshold of CONFIG.game.warningSeconds) {
      if (threshold <= 10) continue;
      if (
        this.remainingSeconds === threshold &&
        !this.firedWarnings.has(threshold)
      ) {
        this.firedWarnings.add(threshold);
        const message = WARNING_MESSAGES[threshold];
        if (message) {
          world.sendMessage(`[SAB] ${message}`);
          console.warn(`[SAB][BROADCAST] ${message}`);
          this.showTitleAll(message, "");
        }
      }
    }

    if (this.remainingSeconds > 0 && this.remainingSeconds <= 10) {
      const key = `cd_${this.remainingSeconds}`;
      if (!this.firedWarnings.has(key)) {
        this.firedWarnings.add(key);
        this.showTitleAll(String(this.remainingSeconds), "");
      }
    }
  }

  finish() {
    if (!this.active && this.remainingSeconds > 0) return;
    this.active = false;
    this.paused = false;
    world.sendMessage("[SAB] Challenge ended.");
    console.warn("[SAB][BROADCAST] Challenge ended.");
    this.showTitleAll("Finished!", "");
    const cb = this.onFinish;
    this.onFinish = null;
    if (cb) cb();
  }

  showTitleAll(title, subtitle) {
    for (const player of world.getAllPlayers()) {
      player.onScreenDisplay.setTitle(title, {
        subtitle,
        fadeInDuration: 5,
        stayDuration: 40,
        fadeOutDuration: 10,
      });
    }
  }
}

export const gameTimer = new GameTimer();
