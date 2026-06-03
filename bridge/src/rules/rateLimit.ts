export class RateLimiter {
  private readonly timestamps: number[] = [];

  constructor(
    private readonly maxEvents: number,
    private readonly windowMs: number,
  ) {}

  allow(): boolean {
    const now = Date.now();
    this.prune(now);
    if (this.timestamps.length >= this.maxEvents) {
      return false;
    }
    this.timestamps.push(now);
    return true;
  }

  private prune(now: number): void {
    while (
      this.timestamps.length > 0 &&
      now - this.timestamps[0]! > this.windowMs
    ) {
      this.timestamps.shift();
    }
  }
}
