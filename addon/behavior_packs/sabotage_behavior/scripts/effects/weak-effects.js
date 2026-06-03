import { getAllGamePlayers } from "../utils/players.js";

const TICKS_PER_SECOND = 20;

export function applySlow() {
  for (const player of getAllGamePlayers()) {
    player.addEffect("slowness", 10 * TICKS_PER_SECOND, {
      amplifier: 1,
      showParticles: true,
    });
  }
}

export function applyBlind() {
  for (const player of getAllGamePlayers()) {
    player.addEffect("darkness", 8 * TICKS_PER_SECOND, {
      amplifier: 0,
      showParticles: true,
    });
  }
}

export function applyChicken() {
  for (const player of getAllGamePlayers()) {
    const loc = player.location;
    for (let i = 0; i < 5; i++) {
      const offsetX = (Math.random() - 0.5) * 4;
      const offsetZ = (Math.random() - 0.5) * 4;
      player.dimension.spawnEntity("minecraft:chicken", {
        x: loc.x + offsetX,
        y: loc.y,
        z: loc.z + offsetZ,
      });
    }
  }
}
