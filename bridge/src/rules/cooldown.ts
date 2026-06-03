import { config } from "../config.js";
import type { EffectDefinition } from "../effects/registry.js";

type CooldownKey = string;

export class CooldownManager {
  private readonly lastTriggered = new Map<CooldownKey, number>();

  checkUser(authorChannelId: string): boolean {
    return this.check(`user:${authorChannelId}`, config.cooldown.perUserSeconds);
  }

  checkCommand(def: EffectDefinition): boolean {
    if (def.cooldownSeconds <= 0) return true;
    return this.check(`command:${def.command}`, def.cooldownSeconds);
  }

  private check(key: CooldownKey, seconds: number): boolean {
    const now = Date.now();
    const last = this.lastTriggered.get(key) ?? 0;
    const elapsed = (now - last) / 1000;
    if (elapsed < seconds) {
      return false;
    }
    this.lastTriggered.set(key, now);
    return true;
  }

  reset(): void {
    this.lastTriggered.clear();
  }
}
