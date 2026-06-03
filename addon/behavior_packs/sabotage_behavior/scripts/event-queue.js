import { CONFIG } from "./config.js";
import { canAcceptYoutubeEvents, canProcessEvents } from "./state.js";

export class EventQueue {
  constructor() {
    this.items = [];
  }

  enqueue(event) {
    if (!canAcceptYoutubeEvents()) {
      return false;
    }
    if (this.items.length >= CONFIG.queue.maxSize) {
      return false;
    }
    this.items.push(event);
    return true;
  }

  dequeueOne() {
    if (!canProcessEvents()) {
      return null;
    }
    return this.items.shift() ?? null;
  }

  clear() {
    const count = this.items.length;
    this.items.length = 0;
    return count;
  }

  size() {
    return this.items.length;
  }

  peek() {
    return this.items[0] ?? null;
  }
}

export const eventQueue = new EventQueue();
